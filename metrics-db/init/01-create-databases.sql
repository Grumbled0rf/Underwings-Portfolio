-- Two-database setup for the metrics layer.
-- Metabase needs its own app-state DB; the warehouse holds nightly Krayin exports.
-- v1: one shared password for simplicity. Tighten roles in Phase F (compliance).

CREATE DATABASE metabase
  WITH OWNER = warehouse_admin
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.utf8'
       LC_CTYPE  = 'en_US.utf8';

CREATE DATABASE warehouse
  WITH OWNER = warehouse_admin
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.utf8'
       LC_CTYPE  = 'en_US.utf8';

-- Comment for later auditors
COMMENT ON DATABASE warehouse IS 'Sales warehouse: nightly mirror of Krayin + computed aggregates. See UNDERWINGS-MASTER-PLAN.md §7/B.';
COMMENT ON DATABASE metabase IS 'Metabase application metadata. Do not query from BI.';
