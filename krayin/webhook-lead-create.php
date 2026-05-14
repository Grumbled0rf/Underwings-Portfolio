<?php
/**
 * Generic source-aware lead ingestion endpoint for Krayin.
 *
 * POST https://crm.underwings.org/webhook-lead-create.php
 * Headers:
 *   Content-Type: application/json
 *   X-Webhook-Token: <WEBHOOK_TOKEN from /var/www/laravel-crm/.env>
 *
 * Body (JSON):
 * {
 *   // Required:
 *   "person": {
 *     "name": "Jane Doe",
 *     "email": "jane@example.com"
 *   },
 *
 *   // Optional person fields:
 *   "person": {
 *     "phone": "+971501234567",
 *     "company": "Example Co",
 *     "job_title": "CISO"
 *   },
 *
 *   // Optional routing (defaults: pipeline 4 "Cybersecurity Sales" /
 *   //                          stage 13 "New" / source_id 3 "Web Form" /
 *   //                          type_id 1 "New Business"):
 *   "lead_pipeline_id": 4,
 *   "lead_pipeline_stage_id": 13,
 *   "lead_source_id": 7,         // or "lead_source_name": "Scope Builder Quiz"
 *   "lead_type_id": 3,           // or "lead_type_name": "One-off Project"
 *   "user_id": 2,                // sales owner. Defaults to admin (id=1).
 *
 *   // Optional deal fields:
 *   "title": "ADHICS readiness quiz - Example Co",
 *   "description": "...",
 *   "lead_value": 35000,
 *   "expected_close_date": "2026-07-01",
 *
 *   // Optional custom EAV attributes (any code from `attributes` table):
 *   "attributes": {
 *     "icp_segment": 1,                       // attribute_option_id
 *     "outbound_confidence_score": "75",
 *     "scope_token": "abc123",
 *     "scope_reference": "UW-2026-0042"
 *   },
 *
 *   // Optional activity note attached to the new lead:
 *   "activity_note": "Came from ADHICS quiz with score 78/100"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "lead_id": 42,
 *   "person_id": 17,
 *   "organization_id": 9,
 *   "pipeline_id": 4,
 *   "stage_id": 13,
 *   "source_id": 7
 * }
 *
 * Errors: 400 (bad payload), 401 (auth), 405 (method), 500 (server).
 */

header('Content-Type: application/json');

// ---- Method check ----
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'method_not_allowed']));
}

// ---- Token auth (same WEBHOOK_TOKEN as other webhooks) ----
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

// ---- Parse payload ----
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    die(json_encode(['error' => 'invalid_json']));
}

$person = $body['person'] ?? null;
if (!is_array($person) || empty($person['name']) || empty($person['email'])) {
    http_response_code(400);
    die(json_encode(['error' => 'person.name and person.email required']));
}

$email = strtolower(trim($person['email']));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'invalid_email']));
}

// ---- Boot Laravel ----
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    // ---- Resolve source ----
    $sourceId = $body['lead_source_id'] ?? null;
    if (!$sourceId && !empty($body['lead_source_name'])) {
        $source = \Webkul\Lead\Models\Source::firstOrCreate(['name' => $body['lead_source_name']]);
        $sourceId = $source->id;
    }
    $sourceId = $sourceId ?: \Webkul\Lead\Models\Source::where('name', 'Web Form')->value('id')
                          ?: \Webkul\Lead\Models\Source::orderBy('id')->value('id');

    // ---- Resolve type ----
    $typeId = $body['lead_type_id'] ?? null;
    if (!$typeId && !empty($body['lead_type_name'])) {
        $type = \Webkul\Lead\Models\Type::firstOrCreate(['name' => $body['lead_type_name']]);
        $typeId = $type->id;
    }
    $typeId = $typeId ?: \Webkul\Lead\Models\Type::orderBy('id')->value('id');

    // ---- Resolve pipeline + stage ----
    $pipelineId = (int)($body['lead_pipeline_id'] ?? 4);
    $pipeline = \Webkul\Lead\Models\Pipeline::find($pipelineId);
    if (!$pipeline) {
        http_response_code(400);
        die(json_encode(['error' => "pipeline_not_found:{$pipelineId}"]));
    }

    $stageId = $body['lead_pipeline_stage_id'] ?? null;
    if ($stageId) {
        $stage = \Webkul\Lead\Models\Stage::where('lead_pipeline_id', $pipelineId)
                                         ->where('id', $stageId)
                                         ->first();
    } else {
        $stage = \Webkul\Lead\Models\Stage::where('lead_pipeline_id', $pipelineId)
                                         ->orderBy('sort_order')
                                         ->first();
    }
    if (!$stage) {
        http_response_code(400);
        die(json_encode(['error' => 'stage_not_found_for_pipeline']));
    }

    $userId = $body['user_id'] ?? 1;

    // ---- Person (find-or-create by primary email) ----
    $persons = \Webkul\Contact\Models\Person::all();
    $existing = null;
    foreach ($persons as $p) {
        $emails = is_array($p->emails) ? $p->emails : (json_decode($p->emails ?? '[]', true) ?: []);
        foreach ($emails as $e) {
            if (isset($e['value']) && strtolower($e['value']) === $email) {
                $existing = $p;
                break 2;
            }
        }
    }

    if ($existing) {
        $personModel = $existing;
        // Update name if blank, append phone if new
        if (!$personModel->name && !empty($person['name'])) {
            $personModel->name = $person['name'];
        }
        if (!empty($person['job_title']) && !$personModel->job_title) {
            $personModel->job_title = $person['job_title'];
        }
        if (!empty($person['phone'])) {
            $nums = is_array($personModel->contact_numbers) ? $personModel->contact_numbers
                  : (json_decode($personModel->contact_numbers ?? '[]', true) ?: []);
            $has = false;
            foreach ($nums as $n) {
                if (isset($n['value']) && $n['value'] === $person['phone']) { $has = true; break; }
            }
            if (!$has) {
                $nums[] = ['value' => $person['phone'], 'label' => 'work'];
                $personModel->contact_numbers = $nums;
            }
        }
        $personModel->save();
    } else {
        $personModel = \Webkul\Contact\Models\Person::create([
            'name'            => $person['name'],
            'emails'          => [['value' => $email, 'label' => 'work']],
            'contact_numbers' => !empty($person['phone'])
                ? [['value' => $person['phone'], 'label' => 'work']]
                : [],
            'job_title'       => $person['job_title'] ?? null,
        ]);
    }

    // ---- Organization (find-or-create by name) ----
    $orgId = null;
    if (!empty($person['company'])) {
        $org = \Webkul\Contact\Models\Organization::firstOrCreate(['name' => trim($person['company'])]);
        $orgId = $org->id;
        if (!$personModel->organization_id) {
            $personModel->organization_id = $orgId;
            $personModel->save();
        }
    }

    // ---- Lead ----
    $title = $body['title'] ?? ('Inbound: ' . $personModel->name);
    $lead = \Webkul\Lead\Models\Lead::create([
        'title'                  => $title,
        'description'            => $body['description'] ?? '',
        'lead_value'             => $body['lead_value'] ?? null,
        'expected_close_date'    => $body['expected_close_date'] ?? null,
        'lead_source_id'         => $sourceId,
        'lead_type_id'           => $typeId,
        'person_id'              => $personModel->id,
        'user_id'                => $userId,
        'lead_pipeline_id'       => $pipelineId,
        'lead_pipeline_stage_id' => $stage->id,
        'status'                 => 1,
    ]);

    // ---- Custom EAV attribute values ----
    if (!empty($body['attributes']) && is_array($body['attributes'])) {
        $avRepo = app(\Webkul\Attribute\Repositories\AttributeValueRepository::class);
        $avRepo->save(array_merge([
            'entity_type' => 'leads',
            'entity_id'   => $lead->id,
        ], $body['attributes']));
    }

    // ---- Optional activity note ----
    if (!empty($body['activity_note'])) {
        \Webkul\Activity\Models\Activity::create([
            'title'         => 'Inbound lead created',
            'comment'       => $body['activity_note'],
            'type'          => 'note',
            'is_done'       => 1,
            'schedule_from' => now(),
            'schedule_to'   => now(),
            'user_id'       => $userId,
        ])->leads()->attach($lead->id);
    }

    echo json_encode([
        'success'         => true,
        'lead_id'         => $lead->id,
        'person_id'       => $personModel->id,
        'organization_id' => $orgId,
        'pipeline_id'     => $pipelineId,
        'stage_id'        => $stage->id,
        'source_id'       => $sourceId,
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'server_error',
        'message' => $e->getMessage(),
        'file'    => basename($e->getFile()) . ':' . $e->getLine(),
    ]);
}
