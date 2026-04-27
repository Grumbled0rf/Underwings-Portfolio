<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
  public function up(): void {
    $entityType = 'leads';
    $attributes = [
      ['code' => 'scope_token',           'name' => 'Scope Token',     'type' => 'text'],
      ['code' => 'scope_reference',       'name' => 'Scope Reference', 'type' => 'text'],
      ['code' => 'scope_range_low',       'name' => 'Range Low (AED)', 'type' => 'text'],
      ['code' => 'scope_range_high',      'name' => 'Range High (AED)','type' => 'text'],
      ['code' => 'founding_optin',        'name' => 'Founding Client', 'type' => 'boolean'],
      ['code' => 'scope_view_count',      'name' => 'View Count',      'type' => 'text'],
      ['code' => 'scope_last_viewed_at',  'name' => 'Last Viewed At',  'type' => 'datetime'],
      ['code' => 'cart_summary',          'name' => 'Cart Summary',    'type' => 'textarea'],
    ];
    foreach ($attributes as $a) {
      if (DB::table('attributes')->where('code', $a['code'])->where('entity_type', $entityType)->exists()) continue;
      DB::table('attributes')->insert([
        'code'         => $a['code'],
        'name'         => $a['name'],
        'type'         => $a['type'],
        'entity_type'  => $entityType,
        'is_required'  => 0,
        'is_unique'    => $a['code'] === 'scope_token' ? 1 : 0,
        'is_user_defined'   => 1,
        'sort_order'   => 100,
        'created_at'   => now(),
        'updated_at'   => now(),
      ]);
    }
  }
  public function down(): void {
    DB::table('attributes')->where('entity_type', 'leads')->whereIn('code', [
      'scope_token','scope_reference','scope_range_low','scope_range_high',
      'founding_optin','scope_view_count','scope_last_viewed_at','cart_summary',
    ])->delete();
  }
};
