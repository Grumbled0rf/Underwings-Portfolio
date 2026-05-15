<?php
/**
 * Outbound suppression list.
 *
 * POST add (X-Webhook-Token required):
 *   { "email": "x@y.com", "reason": "low_fit_score", "score": 25, "lead_id": 12, "notes": "..." }
 *   -> 200 { "success": true, "suppressed": true, "id": <row id> }
 *
 * GET check:
 *   /webhook-suppression.php?email=x@y.com
 *   -> 200 { "suppressed": true|false, "reason": "...", "suppressed_at": "..." }
 *
 * Used by:
 *  - Phase 2 workflow (low-fit branch) -> POST to add
 *  - Phase 5 outbound workflows -> GET to filter Apollo leads
 */

header('Content-Type: application/json');

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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        die(json_encode(['error' => 'email_required']));
    }
    $stmt = $pdo->prepare('SELECT reason, suppressed_at FROM uw_outbound_suppression WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode([
        'suppressed'    => (bool)$row,
        'reason'        => $row['reason'] ?? null,
        'suppressed_at' => $row['suppressed_at'] ?? null,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'method_not_allowed']));
}

// ---- Auth (POST only) ----
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

$body = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($body['email'] ?? ''));
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'invalid_email']));
}

$reason  = substr($body['reason'] ?? 'low_fit_score', 0, 100);
$score   = isset($body['score'])   ? (int)$body['score']   : null;
$leadId  = isset($body['lead_id']) ? (int)$body['lead_id'] : null;
$notes   = isset($body['notes'])   ? (string)$body['notes'] : null;

// INSERT ... ON DUPLICATE KEY: keep the earliest suppression, just refresh metadata
$sql = 'INSERT INTO uw_outbound_suppression (email, reason, score, lead_id, notes)
        VALUES (:email, :reason, :score, :lead_id, :notes)
        ON DUPLICATE KEY UPDATE reason=VALUES(reason), score=COALESCE(VALUES(score), score), notes=COALESCE(VALUES(notes), notes)';
$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':email'   => $email,
    ':reason'  => $reason,
    ':score'   => $score,
    ':lead_id' => $leadId,
    ':notes'   => $notes,
]);

echo json_encode([
    'success'    => true,
    'suppressed' => true,
    'email'      => $email,
    'reason'     => $reason,
    'id'         => $pdo->lastInsertId() ?: null,
]);
