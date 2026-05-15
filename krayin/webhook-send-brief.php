<?php
/**
 * Send a Claude-drafted pre-call brief by email AND mark
 * brief_sent_at on the lead in one atomic call. Used by Phase 3b.
 *
 * POST /webhook-send-brief.php
 * Headers: Content-Type: application/json, X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Body:
 * {
 *   "lead_id":  53,
 *   "to":       "manoj@underwings.org",
 *   "to_name":  "Manoj",
 *   "subject":  "Brief: Ali Hassan / Hassan Industries — call in 30 min",
 *   "html":     "<html>...full email body...</html>",
 *   "from":     "noreply@underwings.org"  // optional, defaults to env MAIL_FROM_ADDRESS
 * }
 *
 * Response (200):
 * { "success": true, "lead_id": 53, "marked_at": "2026-05-15 16:30:00" }
 *
 * Uses Krayin's Laravel Mail facade (already configured in .env to point
 * at Stalwart on port 587). Marks brief_sent_at via the same EAV
 * repository used by webhook-lead-update.php so a future re-run is a
 * no-op (the leads-needing-brief endpoint filters out leads with this
 * attribute set).
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
foreach (['lead_id', 'to', 'subject', 'html'] as $req) {
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
    $lead = \Webkul\Lead\Models\Lead::find((int)$body['lead_id']);
    if (!$lead) {
        http_response_code(404);
        die(json_encode(['error' => 'lead_not_found', 'lead_id' => $body['lead_id']]));
    }

    // Send the email via Laravel Mail (uses MAIL_* env from Krayin .env)
    $fromAddr = $body['from'] ?? (env('MAIL_FROM_ADDRESS') ?: 'noreply@underwings.org');
    $fromName = env('MAIL_FROM_NAME') ?: 'Underwings CRM';
    $toName   = $body['to_name'] ?? null;

    \Mail::send([], [], function ($message) use ($body, $fromAddr, $fromName, $toName) {
        $message->from($fromAddr, $fromName)
                ->to($body['to'], $toName)
                ->subject($body['subject'])
                ->html($body['html']);
    });

    // Mark brief_sent_at on the lead via EAV repo (atomic with sending —
    // if mail fails, we throw before reaching here)
    $now = now()->toDateTimeString();
    $avRepo = app(\Webkul\Attribute\Repositories\AttributeValueRepository::class);
    $avRepo->save([
        'entity_type'   => 'leads',
        'entity_id'     => $lead->id,
        'brief_sent_at' => $now,
    ]);

    // Activity note for the audit trail
    \Webkul\Activity\Models\Activity::create([
        'title'         => 'Pre-call brief sent',
        'comment'       => "Sent to {$body['to']} ({$body['subject']})",
        'type'          => 'note',
        'is_done'       => 1,
        'schedule_from' => now(),
        'schedule_to'   => now(),
        'user_id'       => $lead->user_id ?? 1,
    ])->leads()->attach($lead->id);

    echo json_encode([
        'success'   => true,
        'lead_id'   => $lead->id,
        'sent_to'   => $body['to'],
        'marked_at' => $now,
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'send_failed',
        'message' => $e->getMessage(),
        'file'    => basename($e->getFile()) . ':' . $e->getLine(),
    ]);
}
