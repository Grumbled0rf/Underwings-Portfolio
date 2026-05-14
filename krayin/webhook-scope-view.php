<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); die(json_encode(['error'=>'method'])); }

$token = getenv('WEBHOOK_TOKEN') ?: '';
if (!$token) {
  $envFile = __DIR__ . '/../.env';
  foreach (file($envFile) as $line) {
    if (str_starts_with(trim($line), 'WEBHOOK_TOKEN=')) { $token = trim(substr(trim($line), 14)); break; }
  }
}
if (!$token || ($_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '') !== $token) { http_response_code(401); die(json_encode(['error'=>'unauthorized'])); }
$in = json_decode(file_get_contents('php://input'), true);
$scopeToken = $in['scope_token'] ?? '';
if (!$scopeToken) { http_response_code(400); die(json_encode(['error'=>'scope_token required'])); }

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
  // Look up lead via EAV attribute_values table
  $attrRepo = app(\Webkul\Attribute\Repositories\AttributeRepository::class);
  $attrValRepo = app(\Webkul\Attribute\Repositories\AttributeValueRepository::class);

  $scopeTokenAttr = $attrRepo->findOneByField('code', 'scope_token');
  if (!$scopeTokenAttr) { http_response_code(500); die(json_encode(['error'=>'scope_token attribute not found'])); }

  $attrValue = \Webkul\Attribute\Models\AttributeValue::where('attribute_id', $scopeTokenAttr->id)
    ->where('text_value', $scopeToken)
    ->where('entity_type', 'leads')
    ->first();
  if (!$attrValue) { http_response_code(404); die(json_encode(['error'=>'not found'])); }

  $lead = \Webkul\Lead\Models\Lead::find($attrValue->entity_id);
  if (!$lead) { http_response_code(404); die(json_encode(['error'=>'lead not found'])); }

  // Get current view count from EAV
  $viewCountAttr = $attrRepo->findOneByField('code', 'scope_view_count');
  $lastViewedAttr = $attrRepo->findOneByField('code', 'scope_last_viewed_at');

  $currentCountVal = $viewCountAttr ? \Webkul\Attribute\Models\AttributeValue::where('attribute_id', $viewCountAttr->id)
    ->where('entity_id', $lead->id)->where('entity_type', 'leads')->first() : null;
  $count = (int) ($currentCountVal ? $currentCountVal->text_value : 0) + 1;

  // Save updated view count and last viewed at via EAV
  $attrValRepo->save([
    'entity_type'          => 'leads',
    'entity_id'            => $lead->id,
    'scope_view_count'     => $count,
    'scope_last_viewed_at' => now()->toDateTimeString(),
  ]);

  $where = trim(($in['city'] ?? '') . ', ' . ($in['country'] ?? ''), ', ');
  $ua = substr($in['user_agent'] ?? '', 0, 200);
  \Webkul\Activity\Models\Activity::create([
    'title'        => 'Scope viewed (#' . $count . ')',
    'comment'      => 'IP ' . ($in['ip'] ?? '?') . ($where ? ' · ' . $where : '') . ' · UA: ' . $ua,
    'type'         => 'note',
    'is_done'      => 1,
    'schedule_from'=> now(),
    'schedule_to'  => now(),
    'user_id'      => 1,
  ])->leads()->attach($lead->id);

  echo json_encode(['success'=>true, 'view_count'=>$count]);
} catch (\Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>$e->getMessage()]);
}
