<?php
/**
 * Find the most recent open Krayin lead for a given person email.
 *
 * GET /webhook-lead-by-email.php?email=<email>
 * Headers: X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Response 200 (found):
 * {
 *   "found":       true,
 *   "lead_id":     50,
 *   "person_id":   47,
 *   "stage_id":    14,
 *   "pipeline_id": 4,
 *   "title":       "Contact form — ADHICS v2 (...)",
 *   "owner_id":    2,
 *   "calcom_booking_uid": null
 * }
 *
 * Response 200 (not found):
 * {
 *   "found": false
 * }
 *
 * Definition of "open": status = 1 (active), excludes Won + Lost stages
 * by name. Returns the lead with the highest id (most recent) when a
 * person has multiple.
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    die(json_encode(['error' => 'method_not_allowed']));
}

// Auth (same WEBHOOK_TOKEN as the rest of the webhook family)
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

$email = strtolower(trim($_GET['email'] ?? ''));
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'email_required']));
}

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

// Find candidate persons via JSON_SEARCH on the emails column.
// emails is stored as: [{"value":"x@y.com","label":"work"}, ...]
$personStmt = $pdo->prepare(
    "SELECT id FROM persons
     WHERE JSON_SEARCH(LOWER(emails), 'one', :email, NULL, '$[*].value') IS NOT NULL"
);
$personStmt->execute([':email' => $email]);
$personIds = $personStmt->fetchAll(PDO::FETCH_COLUMN);

if (empty($personIds)) {
    echo json_encode(['found' => false]);
    exit;
}

// Pick the most recent open lead for any matching person.
// Open = status=1 AND stage name not in ('Won','Lost').
$placeholders = implode(',', array_fill(0, count($personIds), '?'));
$leadStmt = $pdo->prepare(
    "SELECT l.id, l.person_id, l.lead_pipeline_id, l.lead_pipeline_stage_id, l.title, l.user_id, s.name AS stage_name
     FROM leads l
     JOIN lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
     WHERE l.person_id IN ($placeholders)
       AND l.status = 1
       AND s.name NOT IN ('Won','Lost')
     ORDER BY l.id DESC
     LIMIT 1"
);
$leadStmt->execute($personIds);
$lead = $leadStmt->fetch(PDO::FETCH_ASSOC);

if (!$lead) {
    echo json_encode(['found' => false]);
    exit;
}

// Pull the calcom_booking_uid attribute if set (used for idempotency).
$uidStmt = $pdo->prepare(
    "SELECT av.text_value
     FROM attribute_values av
     JOIN attributes a ON a.id = av.attribute_id
     WHERE av.entity_type = 'leads' AND av.entity_id = :lead_id
       AND a.code = 'calcom_booking_uid'
     LIMIT 1"
);
$uidStmt->execute([':lead_id' => $lead['id']]);
$uid = $uidStmt->fetchColumn() ?: null;

echo json_encode([
    'found'              => true,
    'lead_id'            => (int)$lead['id'],
    'person_id'          => (int)$lead['person_id'],
    'stage_id'           => (int)$lead['lead_pipeline_stage_id'],
    'pipeline_id'        => (int)$lead['lead_pipeline_id'],
    'title'              => $lead['title'],
    'owner_id'           => (int)$lead['user_id'],
    'calcom_booking_uid' => $uid,
]);
