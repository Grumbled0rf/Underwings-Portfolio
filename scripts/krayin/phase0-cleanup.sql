-- =============================================================
-- Krayin Phase 0 cleanup — applied against database `krayin`
-- on container `underwings-krayin-db` (MariaDB 11).
--
-- Run with:
--   docker exec -i underwings-krayin-db mariadb -ukrayin \
--     -pKrCrmUnderwings2026x krayin < phase0-cleanup.sql
--
-- This script:
--   1. Fixes "New" stage probabilities on pipelines 5 and 6 (100 -> 15)
--   2. Seeds the 10 missing Lead Sources
--   3. Seeds the 4 missing Lead Types
--   4. Adds Nelson + Vinoth as Administrator users (passwords are
--      bcrypt-hashed placeholders — both users MUST reset on first login)
--   5. Adds 2 custom lead attributes: ICP Segment, Outbound Confidence Score
--   6. Seeds ICP Segment options (Healthcare / ISO / PDPL / Other)
--
-- It does NOT:
--   - Rename or renumber pipelines 5/6 (data is correct, plan doc is what's
--     wrong; update the plan instead — pipelines keep their current IDs).
--   - Touch users Gowtham (id=3) or Kumaraguru (id=4). Pending decision.
--
-- Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE / IGNORE so re-running
-- is safe.
-- =============================================================

START TRANSACTION;

-- -------------------------------------------------------------
-- 1. Fix New-stage probabilities on P5 (Software Resale) + P6 (Subscriptions)
-- -------------------------------------------------------------
UPDATE lead_pipeline_stages
SET probability = 15
WHERE id IN (22, 31) AND name = 'New' AND probability = 100;

-- -------------------------------------------------------------
-- 2. Seed missing Lead Sources (lead_sources has no UNIQUE on name,
--    so we guard each row with NOT EXISTS to stay idempotent).
-- -------------------------------------------------------------
INSERT INTO lead_sources (name, created_at, updated_at)
SELECT name, NOW(), NOW() FROM (
  SELECT 'Scope Builder Quiz' AS name UNION ALL
  SELECT 'ADHICS Readiness Quiz'    UNION ALL
  SELECT 'ISO 27001 Gap Quiz'       UNION ALL
  SELECT 'Newsletter Signup'        UNION ALL
  SELECT 'LinkedIn Outbound - Manoj'  UNION ALL
  SELECT 'LinkedIn Outbound - Nelson' UNION ALL
  SELECT 'LinkedIn Outbound - Vinoth' UNION ALL
  SELECT 'Cold Email - Manoj'         UNION ALL
  SELECT 'Cold Email - Nelson'        UNION ALL
  SELECT 'Cold Email - Vinoth'        UNION ALL
  SELECT 'Apollo Outbound'            UNION ALL
  SELECT 'Referral'                   UNION ALL
  SELECT 'Pipeline 1 Upsell'          UNION ALL
  SELECT 'WhatsApp'
) want
WHERE NOT EXISTS (SELECT 1 FROM lead_sources s WHERE s.name = want.name);

-- -------------------------------------------------------------
-- 3. Seed missing Lead Types (same NOT EXISTS guard).
-- -------------------------------------------------------------
INSERT INTO lead_types (name, created_at, updated_at)
SELECT name, NOW(), NOW() FROM (
  SELECT 'One-off Project' AS name UNION ALL
  SELECT 'Subscription'            UNION ALL
  SELECT 'Software Resale'         UNION ALL
  SELECT 'Multi-service'
) want
WHERE NOT EXISTS (SELECT 1 FROM lead_types t WHERE t.name = want.name);

-- -------------------------------------------------------------
-- 4. Add Nelson + Vinoth users (Administrator role)
--    Password placeholder hash = bcrypt of "ChangeMe-2026!"
--    Users MUST be told to reset via the Krayin login -> forgot password flow
--    (or you can set a fresh hash from artisan).
-- -------------------------------------------------------------
INSERT INTO users (name, email, password, status, role_id, view_permission, created_at, updated_at)
SELECT 'Nelson', 'nelson@underwings.org',
       '$2y$10$bwtjjma0SRkxfcJSbGlDuufRLZzqAHnajrt1m2HuybK53VYsFlFaS',
       1, 1, 'global', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nelson@underwings.org');

INSERT INTO users (name, email, password, status, role_id, view_permission, created_at, updated_at)
SELECT 'Vinoth', 'vinoth@underwings.org',
       '$2y$10$bwtjjma0SRkxfcJSbGlDuufRLZzqAHnajrt1m2HuybK53VYsFlFaS',
       1, 1, 'global', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vinoth@underwings.org');

-- -------------------------------------------------------------
-- 5. Add custom lead attributes
--    ICP Segment (select, options seeded in step 6)
--    Outbound Confidence Score (text with numeric validation 0-100)
-- -------------------------------------------------------------
INSERT IGNORE INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
VALUES
  ('icp_segment', 'ICP Segment', 'select', 'leads', 100, NULL, 0, 0, 0, 1, NOW(), NOW()),
  ('outbound_confidence_score', 'Outbound Confidence Score', 'text', 'leads', 101, 'numeric', 0, 0, 0, 1, NOW(), NOW());

-- -------------------------------------------------------------
-- 6. Seed ICP Segment options (NOT EXISTS guard since attribute_options
--    also lacks a UNIQUE on (attribute_id, name)).
-- -------------------------------------------------------------
INSERT INTO attribute_options (attribute_id, name, sort_order)
SELECT a.id, opt.name, opt.sort_order
FROM attributes a
JOIN (
  SELECT 'Healthcare' AS name, 1 AS sort_order UNION ALL
  SELECT 'ISO',                 2              UNION ALL
  SELECT 'PDPL',                3              UNION ALL
  SELECT 'Other',               4
) opt ON 1=1
WHERE a.code = 'icp_segment' AND a.entity_type = 'leads'
  AND NOT EXISTS (
    SELECT 1 FROM attribute_options ao
    WHERE ao.attribute_id = a.id AND ao.name = opt.name
  );

COMMIT;

-- -------------------------------------------------------------
-- Verification queries (run separately after the script)
-- -------------------------------------------------------------
-- SELECT id, name, probability FROM lead_pipeline_stages
--   WHERE lead_pipeline_id IN (5,6) AND name='New';
-- SELECT id, name FROM lead_sources ORDER BY id;
-- SELECT id, name FROM lead_types ORDER BY id;
-- SELECT id, name, email, role_id FROM users ORDER BY id;
-- SELECT a.id, a.code, a.name, a.type, GROUP_CONCAT(ao.name)
--   FROM attributes a LEFT JOIN attribute_options ao ON ao.attribute_id=a.id
--   WHERE a.code IN ('icp_segment','outbound_confidence_score')
--   GROUP BY a.id;
