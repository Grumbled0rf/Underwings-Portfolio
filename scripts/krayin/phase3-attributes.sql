-- Phase 3a — Krayin custom attributes for Cal.com booking metadata.
--
-- Adds three EAV attributes on `leads`:
--   next_meeting_at       — datetime of the next scheduled call
--   next_meeting_join_url — Meet/Zoom/Cal Video link for the call
--   calcom_booking_uid    — Cal.com's booking uid (idempotency key for
--                           reschedule events; same uid → update existing
--                           rather than create duplicate)
--
-- Idempotent: uses NOT EXISTS guards (same pattern as
-- scripts/krayin/phase0-cleanup.sql).
--
-- Run with:
--   docker exec -i underwings-krayin-db mariadb -ukrayin \
--     -pKrCrmUnderwings2026x krayin < phase3-attributes.sql

START TRANSACTION;

INSERT INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
SELECT 'next_meeting_at', 'Next Meeting At', 'datetime', 'leads', 110, NULL, 0, 0, 0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code = 'next_meeting_at' AND entity_type = 'leads');

INSERT INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
SELECT 'next_meeting_join_url', 'Next Meeting Join URL', 'text', 'leads', 111, 'url', 0, 0, 0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code = 'next_meeting_join_url' AND entity_type = 'leads');

INSERT INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
SELECT 'calcom_booking_uid', 'Cal.com Booking UID', 'text', 'leads', 112, NULL, 0, 0, 0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code = 'calcom_booking_uid' AND entity_type = 'leads');

-- Phase 3b additions: pre-call brief tracking
INSERT INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
SELECT 'brief_sent_at', 'Pre-call Brief Sent At', 'datetime', 'leads', 113, NULL, 0, 0, 0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code = 'brief_sent_at' AND entity_type = 'leads');

-- Phase 3c: Plane card linkage
INSERT INTO attributes
  (code, name, type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at)
SELECT 'plane_card_id', 'Plane Card ID', 'text', 'leads', 114, NULL, 0, 0, 0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code = 'plane_card_id' AND entity_type = 'leads');

COMMIT;

-- Verification:
SELECT id, code, name, type FROM attributes
WHERE code IN ('next_meeting_at', 'next_meeting_join_url', 'calcom_booking_uid')
  AND entity_type = 'leads'
ORDER BY id;
