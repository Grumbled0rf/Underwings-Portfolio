<?php
/**
 * Pipeline statistics for the Phase 9 weekly report.
 *
 * GET /webhook-pipeline-stats.php
 * Headers: X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Optional query params:
 *   period_days=7         Window for "this week" stats (default 7)
 *
 * Response (200): JSON with everything the report workflow needs.
 * Returns the entire object even when all counters are 0 — empty weeks
 * are still data ("zero leads in" is itself a finding).
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    die(json_encode(['error' => 'method_not_allowed']));
}

// Auth
$expectedToken = getenv('WEBHOOK_TOKEN') ?: '';
if (!$expectedToken) {
    $envFile = __DIR__ . '/../.env';
    if (is_readable($envFile)) {
        foreach (file($envFile) as $line) {
            if (str_starts_with(trim($line), 'WEBHOOK_TOKEN=')) {
                $expectedToken = trim(substr(trim($line), 14));
                break;
            }
        }
    }
}
$givenToken = $_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '';
if (!$expectedToken || !hash_equals($expectedToken, $givenToken)) {
    http_response_code(401);
    die(json_encode(['error' => 'unauthorized']));
}

$days = max(1, min(90, (int)($_GET['period_days'] ?? 7)));

$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    getenv('DB_HOST') ?: 'krayin-db',
    (int)(getenv('DB_PORT') ?: 3306),
    getenv('DB_DATABASE') ?: 'krayin');
$dbUser = getenv('DB_USERNAME') ?: 'krayin';
$dbPass = getenv('DB_PASSWORD') ?: 'KrCrmUnderwings2026x';

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (\Throwable $e) {
    http_response_code(500);
    die(json_encode(['error' => 'db_unavailable', 'message' => $e->getMessage()]));
}

// ---- helpers ----
function single($pdo, $sql, $params = []) {
    $s = $pdo->prepare($sql);
    $s->execute($params);
    return $s->fetchColumn();
}
function rows($pdo, $sql, $params = []) {
    $s = $pdo->prepare($sql);
    $s->execute($params);
    return $s->fetchAll(PDO::FETCH_ASSOC);
}

// ---- period bounds ----
$endTs   = $pdo->query("SELECT NOW()")->fetchColumn();
$startTs = $pdo->query("SELECT NOW() - INTERVAL $days DAY")->fetchColumn();

// ---- 1. leads created in window ----
$leadsInTotal = (int)single($pdo,
    "SELECT COUNT(*) FROM leads WHERE created_at >= :start",
    [':start' => $startTs]);

$leadsBySource = rows($pdo,
    "SELECT IFNULL(s.name,'(no source)') AS source, COUNT(*) AS cnt
     FROM leads l LEFT JOIN lead_sources s ON s.id=l.lead_source_id
     WHERE l.created_at >= :start
     GROUP BY l.lead_source_id ORDER BY cnt DESC",
    [':start' => $startTs]);

$leadsByPipeline = rows($pdo,
    "SELECT p.id AS pipeline_id, p.name AS pipeline, COUNT(l.id) AS cnt
     FROM lead_pipelines p LEFT JOIN leads l
       ON l.lead_pipeline_id=p.id AND l.created_at >= :start
     GROUP BY p.id ORDER BY p.id",
    [':start' => $startTs]);

// ---- 2. AI score distribution for window ----
$scoreAttrId = (int)single($pdo,
    "SELECT id FROM attributes WHERE code='outbound_confidence_score' AND entity_type='leads'");
$scoresInWindow = [];
if ($scoreAttrId) {
    $r = rows($pdo,
        "SELECT av.text_value AS score
         FROM leads l
         JOIN attribute_values av
           ON av.entity_type='leads' AND av.entity_id=l.id
          AND av.attribute_id=:aid
         WHERE l.created_at >= :start",
        [':aid' => $scoreAttrId, ':start' => $startTs]);
    foreach ($r as $row) $scoresInWindow[] = (int)$row['score'];
}
$bucketHot     = count(array_filter($scoresInWindow, fn($s) => $s >= 70));
$bucketNurture = count(array_filter($scoresInWindow, fn($s) => $s >= 40 && $s < 70));
$bucketLowFit  = count(array_filter($scoresInWindow, fn($s) => $s < 40));
$unscoredInWindow = $leadsInTotal - count($scoresInWindow);
$avgScore = empty($scoresInWindow) ? null : round(array_sum($scoresInWindow) / count($scoresInWindow));

// ---- 3. current stage distribution (snapshot, not windowed) ----
$stageDistribution = rows($pdo,
    "SELECT p.id AS pipeline_id, p.name AS pipeline,
            s.id AS stage_id, s.name AS stage, s.sort_order,
            COUNT(l.id) AS cnt
     FROM lead_pipelines p
     JOIN lead_pipeline_stages s ON s.lead_pipeline_id=p.id
     LEFT JOIN leads l ON l.lead_pipeline_stage_id=s.id AND l.status=1
     GROUP BY p.id, s.id
     ORDER BY p.id, s.sort_order");

// ---- 4. won + lost in window ----
$wonStages = $pdo->query(
    "SELECT id FROM lead_pipeline_stages WHERE name='Won'")->fetchAll(PDO::FETCH_COLUMN);
$lostStages = $pdo->query(
    "SELECT id FROM lead_pipeline_stages WHERE name='Lost'")->fetchAll(PDO::FETCH_COLUMN);

$wonInWindow = 0; $wonValue = 0; $lostInWindow = 0;
if ($wonStages) {
    $in = implode(',', array_map('intval', $wonStages));
    $wonInWindow = (int)single($pdo,
        "SELECT COUNT(*) FROM leads
         WHERE lead_pipeline_stage_id IN ($in) AND updated_at >= :start",
        [':start' => $startTs]);
    $wonValue = (float)single($pdo,
        "SELECT IFNULL(SUM(lead_value),0) FROM leads
         WHERE lead_pipeline_stage_id IN ($in) AND updated_at >= :start",
        [':start' => $startTs]);
}
if ($lostStages) {
    $in = implode(',', array_map('intval', $lostStages));
    $lostInWindow = (int)single($pdo,
        "SELECT COUNT(*) FROM leads
         WHERE lead_pipeline_stage_id IN ($in) AND updated_at >= :start",
        [':start' => $startTs]);
}

// ---- 5. activity volume in window ----
$activitiesInWindow = (int)single($pdo,
    "SELECT COUNT(*) FROM activities WHERE created_at >= :start",
    [':start' => $startTs]);

$activitiesByType = rows($pdo,
    "SELECT a.title, COUNT(*) AS cnt
     FROM activities a WHERE a.created_at >= :start
     GROUP BY a.title ORDER BY cnt DESC LIMIT 12",
    [':start' => $startTs]);

// ---- 6. cal.com bookings + briefs ----
$bookingsInWindow = (int)single($pdo,
    "SELECT COUNT(*) FROM activities
     WHERE created_at >= :start AND title='Meeting booked'",
    [':start' => $startTs]);
$briefsInWindow = (int)single($pdo,
    "SELECT COUNT(*) FROM activities
     WHERE created_at >= :start AND title='Pre-call brief sent'",
    [':start' => $startTs]);

// ---- 7. suppression growth ----
$suppressionAdded = (int)single($pdo,
    "SELECT COUNT(*) FROM uw_outbound_suppression WHERE suppressed_at >= :start",
    [':start' => $startTs]);
$suppressionTotal = (int)single($pdo,
    "SELECT COUNT(*) FROM uw_outbound_suppression");

// ---- 8. top sources all-time (for context) ----
$topSourcesAllTime = rows($pdo,
    "SELECT IFNULL(s.name,'(none)') AS source, COUNT(*) AS cnt
     FROM leads l LEFT JOIN lead_sources s ON s.id=l.lead_source_id
     GROUP BY l.lead_source_id ORDER BY cnt DESC LIMIT 10");

echo json_encode([
    'period' => [
        'start' => $startTs,
        'end'   => $endTs,
        'days'  => $days,
    ],
    'leads_in' => [
        'total'        => $leadsInTotal,
        'by_source'    => $leadsBySource,
        'by_pipeline'  => $leadsByPipeline,
        'unscored'     => $unscoredInWindow,
    ],
    'scoring' => [
        'avg_score'   => $avgScore,
        'hot'         => $bucketHot,
        'nurture'     => $bucketNurture,
        'low_fit'     => $bucketLowFit,
        'scored_n'    => count($scoresInWindow),
    ],
    'stage_distribution' => $stageDistribution,
    'won_lost' => [
        'won'        => $wonInWindow,
        'won_value_aed' => $wonValue,
        'lost'       => $lostInWindow,
    ],
    'activity' => [
        'total'         => $activitiesInWindow,
        'bookings'      => $bookingsInWindow,
        'briefs'        => $briefsInWindow,
        'by_type'       => $activitiesByType,
    ],
    'suppression' => [
        'added_in_window' => $suppressionAdded,
        'total'           => $suppressionTotal,
    ],
    'top_sources_all_time' => $topSourcesAllTime,
], JSON_PRETTY_PRINT);
