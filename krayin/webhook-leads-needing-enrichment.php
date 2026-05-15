<?php
/**
 * Return the list of Krayin leads that still need enrichment.
 *
 * Used by the Phase 2.5 cron sweep workflow to catch leads that were
 * created outside the form flow (e.g., manually via Krayin UI, CSV import).
 *
 * GET /webhook-leads-needing-enrichment.php
 * Headers: X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Optional query params:
 *   max=20             max leads to return (default 20, hard cap 100)
 *   max_age_hours=48   only leads created within this window
 *
 * Response (200):
 * {
 *   "count": 3,
 *   "leads": [
 *     {
 *       "lead_id": 51,
 *       "person_id": 41,
 *       "source": "manual_import",
 *       "payload": {
 *         "person": { "name": "...", "email": "...", "phone": "...", "company": "...", "job_title": "..." },
 *         "title": "...",
 *         "description": "..."
 *       }
 *     }
 *   ]
 * }
 *
 * Criteria for "needs enrichment":
 *   - lead is in a "New" stage (sort_order = 1 on its pipeline)
 *   - lead has no `outbound_confidence_score` attribute value yet
 *   - lead was created within the max_age_hours window
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

$max         = min(100, max(1, (int)($_GET['max']           ?? 20)));
$maxAgeHours = min(720, max(1, (int)($_GET['max_age_hours'] ?? 48)));

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

$sql = <<<SQL
SELECT
    l.id                    AS lead_id,
    l.person_id             AS person_id,
    l.title                 AS title,
    l.description           AS description,
    l.lead_pipeline_id      AS pipeline_id,
    ls.name                 AS source_name,
    p.name                  AS person_name,
    p.emails                AS emails_json,
    p.contact_numbers       AS phones_json,
    p.job_title             AS job_title,
    o.name                  AS company_name
FROM leads l
JOIN lead_pipeline_stages s
    ON s.id = l.lead_pipeline_stage_id AND s.sort_order = 1
LEFT JOIN lead_sources ls ON ls.id = l.lead_source_id
JOIN persons p ON p.id = l.person_id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN attribute_values av
    ON av.entity_type = 'leads'
    AND av.entity_id = l.id
    AND av.attribute_id = (SELECT id FROM attributes WHERE code = 'outbound_confidence_score' AND entity_type = 'leads')
WHERE av.id IS NULL
  AND l.created_at >= (NOW() - INTERVAL :max_age_hours HOUR)
ORDER BY l.id DESC
LIMIT {$max}
SQL;

$stmt = $pdo->prepare($sql);
$stmt->execute([':max_age_hours' => $maxAgeHours]);

$out = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $emails = json_decode($row['emails_json'] ?: '[]', true) ?: [];
    $phones = json_decode($row['phones_json'] ?: '[]', true) ?: [];
    $primaryEmail = $emails[0]['value'] ?? null;
    $primaryPhone = $phones[0]['value'] ?? null;

    if (!$primaryEmail) continue;  // skip leads with no email

    // Map source name to the same enum keys Phase 1 uses
    $sourceMap = [
        'Web Form'                  => 'contact_form',
        'Scope Builder'             => 'scope_builder',
        'Scope Builder Quiz'        => 'scope_builder_quiz',
        'ADHICS Readiness Quiz'     => 'adhics_readiness_quiz',
        'ISO 27001 Gap Quiz'        => 'iso27001_gap_quiz',
        'Newsletter Signup'         => 'newsletter',
    ];
    $sourceKey = $sourceMap[$row['source_name']] ?? 'manual_import';

    $out[] = [
        'lead_id'   => (int)$row['lead_id'],
        'person_id' => (int)$row['person_id'],
        'source'    => $sourceKey,
        'payload'   => [
            'person' => [
                'name'      => $row['person_name'],
                'email'     => $primaryEmail,
                'phone'     => $primaryPhone,
                'company'   => $row['company_name'],
                'job_title' => $row['job_title'],
            ],
            'title'       => $row['title'],
            'description' => $row['description'],
        ],
    ];
}

echo json_encode([
    'count' => count($out),
    'leads' => $out,
]);
