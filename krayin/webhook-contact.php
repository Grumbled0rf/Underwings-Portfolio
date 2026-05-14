<?php
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    die(json_encode(["error" => "Method not allowed"]));
}

$envFile = __DIR__ . "/../.env";
$token = "";
foreach (file($envFile) as $line) {
    if (str_starts_with(trim($line), "WEBHOOK_TOKEN=")) {
        $token = trim(substr(trim($line), 14));
        break;
    }
}

$headerToken = $_SERVER["HTTP_X_WEBHOOK_TOKEN"] ?? "";
if (!$token || $headerToken !== $token) {
    http_response_code(401);
    die(json_encode(["error" => "Unauthorized"]));
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input || empty($input["email"]) || empty($input["name"])) {
    http_response_code(400);
    die(json_encode(["error" => "name and email required"]));
}

require __DIR__ . "/../vendor/autoload.php";
$app = require __DIR__ . "/../bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $person = \Webkul\Contact\Models\Person::create([
        "name"            => $input["name"],
        "emails"          => [["value" => strtolower(trim($input["email"])), "label" => "work"]],
        "contact_numbers" => !empty($input["phone"]) ? [["value" => $input["phone"], "label" => "work"]] : [],
    ]);

    if (!empty($input["company"])) {
        $org = \Webkul\Contact\Models\Organization::firstOrCreate(["name" => $input["company"]]);
        $person->organization_id = $org->id;
        $person->save();
    }

    $title = "Website inquiry from " . $input["name"];
    if (!empty($input["service"])) $title .= " - " . $input["service"];

    $pipelineStage = \Webkul\Lead\Models\Stage::orderBy("sort_order")->first();

    $lead = \Webkul\Lead\Models\Lead::create([
        "title"                  => $title,
        "description"            => $input["message"] ?? "",
        "lead_source_id"         => \Webkul\Lead\Models\Source::first()?->id,
        "lead_type_id"           => \Webkul\Lead\Models\Type::first()?->id,
        "person_id"              => $person->id,
        "user_id"                => 1,
        "lead_pipeline_id"       => $pipelineStage?->lead_pipeline_id,
        "lead_pipeline_stage_id" => $pipelineStage?->id,
        "status"                 => 1,
    ]);

    echo json_encode(["success" => true, "lead_id" => $lead->id, "person_id" => $person->id]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
