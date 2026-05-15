<?php
/**
 * Generic HTML mail sender. Reuses Krayin's Laravel Mail (Stalwart SMTP).
 *
 * POST /webhook-send-mail.php
 * Headers: Content-Type: application/json, X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Body:
 * {
 *   "to":       "manoj@underwings.org",       // required, single address
 *   "to_name":  "Manoj",                      // optional
 *   "subject":  "Weekly pipeline report",     // required
 *   "html":     "<html>...</html>",           // required
 *   "from":     "newsletter@underwings.org"   // optional, defaults to MAIL_FROM_ADDRESS
 * }
 *
 * Use this for transactional/reporting emails that don't belong to a
 * specific Krayin lead (Phase 9 weekly report, system notifications,
 * etc.). For lead-attached emails, use webhook-send-brief.php instead.
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'method_not_allowed']));
}

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
foreach (['to', 'subject', 'html'] as $req) {
    if (empty($body[$req])) {
        http_response_code(400);
        die(json_encode(['error' => "missing $req"]));
    }
}
if (!filter_var($body['to'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'invalid_to_email']));
}

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $fromAddr = $body['from'] ?? (env('MAIL_FROM_ADDRESS') ?: 'noreply@underwings.org');
    $fromName = env('MAIL_FROM_NAME') ?: 'Underwings';
    $toName   = $body['to_name'] ?? null;

    \Mail::send([], [], function ($message) use ($body, $fromAddr, $fromName, $toName) {
        $message->from($fromAddr, $fromName)
                ->to($body['to'], $toName)
                ->subject($body['subject'])
                ->html($body['html']);
    });

    echo json_encode([
        'success' => true,
        'sent_to' => $body['to'],
        'subject' => $body['subject'],
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'send_failed',
        'message' => $e->getMessage(),
        'file'    => basename($e->getFile()) . ':' . $e->getLine(),
    ]);
}
