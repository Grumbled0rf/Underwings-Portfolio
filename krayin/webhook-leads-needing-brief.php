<?php
/**
 * Return leads with a meeting starting in 25-35 minutes that haven't
 * been briefed yet. Used by the Phase 3b cron sweep to drive Claude
 * call-brief generation.
 *
 * GET /webhook-leads-needing-brief.php
 * Headers: X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Query params (optional):
 *   window_min=25         lower bound minutes from now
 *   window_max=35         upper bound minutes from now
 *   max=10                hard cap on rows returned
 *
 * Response (200):
 * {
 *   "count": 1,
 *   "leads": [
 *     {
 *       "lead_id":          53,
 *       "person_id":        50,
 *       "title":            "Cal.com booking — Ali Hassan",
 *       "next_meeting_at":  "2026-05-21 09:00:00",
 *       "next_meeting_join_url": "https://meet.google.com/...",
 *       "person": {
 *         "name":    "Ali Hassan",
 *         "email":   "ali@example.com",
 *         "company": "Hassan Industries",
 *         "phone":   "+971501112233",
 *         "job_title": null
 *       },
 *       "owner": {
 *         "user_id": 2,
 *         "name":    "Manoj",
 *         "email":   "manoj@underwings.org"
 *       },
 *       "scoring": {
 *         "score": 62,
 *         "segment": "other"
 *       },
 *       "recent_activities": [
 *         { "title": "Meeting booked", "comment": "...", "created_at": "..." }
 *       ]
 *     }
 *   ]
 * }
 *
 * Includes everything Claude needs to draft the brief without n8n
 * doing additional Krayin lookups.
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

$winMin = max(0,  min(240, (int)($_GET['window_min'] ?? 25)));
$winMax = max($winMin + 1, min(240, (int)($_GET['window_max'] ?? 35)));
$max    = max(1, min(50, (int)($_GET['max'] ?? 10)));

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

// Resolve attribute IDs once
$attrIds = [];
foreach (['next_meeting_at', 'next_meeting_join_url', 'brief_sent_at',
          'icp_segment', 'outbound_confidence_score'] as $code) {
    $s = $pdo->prepare("SELECT id FROM attributes WHERE code=? AND entity_type='leads'");
    $s->execute([$code]);
    $attrIds[$code] = (int)$s->fetchColumn();
}

if (!$attrIds['next_meeting_at'] || !$attrIds['brief_sent_at']) {
    http_response_code(500);
    die(json_encode(['error' => 'required_attributes_missing']));
}

// Find leads where:
//   meeting attribute is between (NOW + winMin) and (NOW + winMax)
//   AND brief_sent_at attribute is NULL (no row in attribute_values)
$sql = <<<SQL
SELECT
    l.id            AS lead_id,
    l.title         AS title,
    l.person_id     AS person_id,
    l.user_id       AS owner_user_id,
    av_meet.datetime_value AS next_meeting_at,
    p.name          AS person_name,
    p.emails        AS emails_json,
    p.contact_numbers AS phones_json,
    p.job_title     AS job_title,
    o.name          AS company_name,
    u.name          AS owner_name,
    u.email         AS owner_email,
    av_url.text_value      AS join_url,
    av_score.text_value    AS score,
    av_seg.integer_value   AS segment_option_id
FROM leads l
JOIN attribute_values av_meet
    ON av_meet.entity_type='leads' AND av_meet.entity_id=l.id
   AND av_meet.attribute_id={$attrIds['next_meeting_at']}
LEFT JOIN attribute_values av_brief
    ON av_brief.entity_type='leads' AND av_brief.entity_id=l.id
   AND av_brief.attribute_id={$attrIds['brief_sent_at']}
LEFT JOIN attribute_values av_url
    ON av_url.entity_type='leads' AND av_url.entity_id=l.id
   AND av_url.attribute_id={$attrIds['next_meeting_join_url']}
LEFT JOIN attribute_values av_score
    ON av_score.entity_type='leads' AND av_score.entity_id=l.id
   AND av_score.attribute_id={$attrIds['outbound_confidence_score']}
LEFT JOIN attribute_values av_seg
    ON av_seg.entity_type='leads' AND av_seg.entity_id=l.id
   AND av_seg.attribute_id={$attrIds['icp_segment']}
JOIN persons p ON p.id = l.person_id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN users u ON u.id = l.user_id
WHERE av_brief.id IS NULL
  AND av_meet.datetime_value IS NOT NULL
  AND av_meet.datetime_value > '0000-00-00 00:00:00'
  AND av_meet.datetime_value BETWEEN (NOW() + INTERVAL :wmin MINUTE)
                                 AND (NOW() + INTERVAL :wmax MINUTE)
ORDER BY av_meet.datetime_value ASC
LIMIT {$max}
SQL;

$st = $pdo->prepare($sql);
$st->execute([':wmin' => $winMin, ':wmax' => $winMax]);

// Segment id → name (mirrors phase0-cleanup option order)
$segLabels = [1 => 'healthcare', 2 => 'iso', 3 => 'pdpl', 4 => 'other'];

$leads = [];
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $emails = json_decode($row['emails_json'] ?: '[]', true) ?: [];
    $phones = json_decode($row['phones_json'] ?: '[]', true) ?: [];
    $email  = $emails[0]['value'] ?? null;
    $phone  = $phones[0]['value'] ?? null;

    // Pull last 3 activities for context
    $aSt = $pdo->prepare(
        "SELECT a.title, LEFT(a.comment, 600) AS comment, a.created_at
         FROM activities a
         JOIN lead_activities la ON la.activity_id=a.id
         WHERE la.lead_id=?
         ORDER BY a.id DESC LIMIT 3"
    );
    $aSt->execute([$row['lead_id']]);
    $activities = $aSt->fetchAll(PDO::FETCH_ASSOC);

    $leads[] = [
        'lead_id'                => (int)$row['lead_id'],
        'person_id'              => (int)$row['person_id'],
        'title'                  => $row['title'],
        'next_meeting_at'        => $row['next_meeting_at'],
        'next_meeting_join_url'  => $row['join_url'],
        'person' => [
            'name'      => $row['person_name'],
            'email'     => $email,
            'company'   => $row['company_name'],
            'phone'     => $phone,
            'job_title' => $row['job_title'],
        ],
        'owner' => [
            'user_id' => (int)$row['owner_user_id'],
            'name'    => $row['owner_name']  ?: 'Admin',
            'email'   => $row['owner_email'] ?: 'admin@underwings.org',
        ],
        'scoring' => [
            'score'   => $row['score'] !== null ? (int)$row['score'] : null,
            'segment' => $segLabels[(int)$row['segment_option_id']] ?? null,
        ],
        'recent_activities' => $activities,
    ];
}

echo json_encode([
    'count' => count($leads),
    'window_min' => $winMin,
    'window_max' => $winMax,
    'leads' => $leads,
]);
