<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
  public function up(): void {
    if (DB::table('lead_pipelines')->where('name', 'Scope Builder')->exists()) return;

    $pipelineId = DB::table('lead_pipelines')->insertGetId([
      'name'        => 'Scope Builder',
      'is_default'  => 0,
      'created_at'  => now(),
      'updated_at'  => now(),
    ]);

    $stages = [
      ['name' => 'Submitted',    'sort_order' => 1, 'probability' => 10],
      ['name' => 'Reviewed',     'sort_order' => 2, 'probability' => 20],
      ['name' => 'Quoted',       'sort_order' => 3, 'probability' => 40],
      ['name' => 'Negotiating',  'sort_order' => 4, 'probability' => 60],
      ['name' => 'Won',          'sort_order' => 5, 'probability' => 100],
      ['name' => 'Lost',         'sort_order' => 6, 'probability' => 0],
    ];
    foreach ($stages as $s) {
      DB::table('lead_pipeline_stages')->insert(array_merge($s, [
        'lead_pipeline_id' => $pipelineId,
      ]));
    }
  }
  public function down(): void {
    $id = DB::table('lead_pipelines')->where('name', 'Scope Builder')->value('id');
    if ($id) {
      DB::table('lead_pipeline_stages')->where('lead_pipeline_id', $id)->delete();
      DB::table('lead_pipelines')->where('id', $id)->delete();
    }
  }
};
