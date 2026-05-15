<?php
/**
 * Patch an existing Krayin lead — set custom EAV attributes, move stage,
 * change owner, optionally append an activity note.
 *
 * POST https://crm.underwings.org/webhook-lead-update.php
 * Headers: Content-Type: application/json, X-Webhook-Token: <WEBHOOK_TOKEN>
 *
 * Body (JSON):
 * {
 *   "lead_id": 42,                          // required
 *   "lead_pipeline_stage_id": 14,           // optional — move to MQL
 *   "user_id": 2,                           // optional — change sales owner
 *   "attributes": {                         // optional EAV updates
 *     "icp_segment": 1,                     // attribute_option_id
 *     "outbound_confidence_score": "78"
 *   },
 *   "activity_note": "Scored 78 — moved to MQL by enrichment workflow"
 * }
 *
 * Response (200): { "success": true, "lead_id": 42, "updates_applied": ["stage","attributes","activity"] }
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body) || empty($body['lead_id'])) {
    http_response_code(400);
    die(json_encode(['error' => 'lead_id required']));
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

    $applied = [];

    // Stage move
    if (!empty($body['lead_pipeline_stage_id'])) {
        $stage = \Webkul\Lead\Models\Stage::where('lead_pipeline_id', $lead->lead_pipeline_id)
                                         ->where('id', (int)$body['lead_pipeline_stage_id'])
                                         ->first();
        if (!$stage) {
            http_response_code(400);
            die(json_encode([
                'error'    => 'stage_not_in_pipeline',
                'stage_id' => $body['lead_pipeline_stage_id'],
                'pipeline' => $lead->lead_pipeline_id,
            ]));
        }
        $lead->lead_pipeline_stage_id = $stage->id;
        $applied[] = 'stage';
    }

    // Owner change
    if (!empty($body['user_id'])) {
        $lead->user_id = (int)$body['user_id'];
        $applied[] = 'owner';
    }

    if (!empty($applied)) {
        $lead->save();
    }

    // Custom EAV attributes
    if (!empty($body['attributes']) && is_array($body['attributes'])) {
        $avRepo = app(\Webkul\Attribute\Repositories\AttributeValueRepository::class);
        $avRepo->save(array_merge([
            'entity_type' => 'leads',
            'entity_id'   => $lead->id,
        ], $body['attributes']));
        $applied[] = 'attributes';
    }

    // Activity note
    if (!empty($body['activity_note'])) {
        \Webkul\Activity\Models\Activity::create([
            'title'         => $body['activity_title'] ?? 'Lead updated',
            'comment'       => $body['activity_note'],
            'type'          => 'note',
            'is_done'       => 1,
            'schedule_from' => now(),
            'schedule_to'   => now(),
            'user_id'       => $body['user_id'] ?? $lead->user_id ?? 1,
        ])->leads()->attach($lead->id);
        $applied[] = 'activity';
    }

    echo json_encode([
        'success'         => true,
        'lead_id'         => $lead->id,
        'updates_applied' => $applied,
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'server_error',
        'message' => $e->getMessage(),
        'file'    => basename($e->getFile()) . ':' . $e->getLine(),
    ]);
}
