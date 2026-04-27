<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); die(json_encode(['error' => 'method']));
}

$token = getenv('WEBHOOK_TOKEN') ?: '';
if (!$token) {
  $envFile = __DIR__ . '/../.env';
  foreach (file($envFile) as $line) {
    if (str_starts_with(trim($line), 'WEBHOOK_TOKEN=')) {
      $token = trim(substr(trim($line), 14));
      break;
    }
  }
}
if (!$token || ($_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '') !== $token) {
  http_response_code(401); die(json_encode(['error' => 'unauthorized']));
}
$in = json_decode(file_get_contents('php://input'), true);
foreach (['scope_token','scope_reference','name','email','company','range_low','range_high'] as $k) {
  if (empty($in[$k]) && $in[$k] !== 0) { http_response_code(400); die(json_encode(['error' => "missing $k"])); }
}

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
  $person = \Webkul\Contact\Models\Person::create([
    'name'            => $in['name'],
    'emails'          => [['value' => strtolower(trim($in['email'])), 'label' => 'work']],
    'contact_numbers' => !empty($in['phone']) ? [['value' => $in['phone'], 'label' => 'work']] : [],
  ]);
  $org = \Webkul\Contact\Models\Organization::firstOrCreate(['name' => $in['company']]);
  $person->organization_id = $org->id; $person->save();

  $pipeline = \Webkul\Lead\Models\Pipeline::where('name','Scope Builder')->first()
            ?? \Webkul\Lead\Models\Pipeline::orderBy('id')->first();
  $stage = \Webkul\Lead\Models\Stage::where('lead_pipeline_id', $pipeline->id)->orderBy('sort_order')->first();

  $title = $in['title'] ?? (($in['founding_optin'] ? '[FC] ' : '') . $in['company'] . ' — scope ' . $in['scope_reference']);

  // Create the core lead record
  $lead = \Webkul\Lead\Models\Lead::create([
    'title'                   => $title,
    'description'             => $in['description'] ?? '',
    'lead_source_id'          => \Webkul\Lead\Models\Source::firstOrCreate(['name' => 'Scope Builder'])->id,
    'lead_type_id'            => \Webkul\Lead\Models\Type::first()?->id,
    'person_id'               => $person->id,
    'user_id'                 => 1,
    'lead_pipeline_id'        => $pipeline->id,
    'lead_pipeline_stage_id'  => $stage->id,
    'status'                  => 1,
  ]);

  // Save custom attributes via Webkul EAV (attribute_values table)
  $avRepo = app(\Webkul\Attribute\Repositories\AttributeValueRepository::class);
  $avRepo->save([
    'entity_type'        => 'leads',
    'entity_id'          => $lead->id,
    'scope_token'        => $in['scope_token'],
    'scope_reference'    => $in['scope_reference'],
    'scope_range_low'    => (string)(int)$in['range_low'],
    'scope_range_high'   => (string)(int)$in['range_high'],
    'founding_optin'     => !empty($in['founding_optin']) ? 1 : 0,
    'scope_view_count'   => '0',
    'cart_summary'       => $in['cart_summary'] ?? '',
  ]);

  \Webkul\Activity\Models\Activity::create([
    'title'        => 'Scope Submitted',
    'comment'      => 'Submitted via /scope-builder · ' . $title,
    'type'         => 'note',
    'is_done'      => 1,
    'schedule_from'=> now(),
    'schedule_to'  => now(),
    'user_id'      => 1,
  ])->leads()->attach($lead->id);

  echo json_encode(['success' => true, 'lead_id' => $lead->id, 'person_id' => $person->id]);
} catch (\Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
