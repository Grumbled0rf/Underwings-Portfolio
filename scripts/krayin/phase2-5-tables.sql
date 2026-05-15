-- Phase 2.5 — auxiliary tables for outbound suppression + log.
-- These are NOT Krayin core tables; they live alongside Krayin's DB so
-- n8n workflows can read/write via the Krayin container (same network).
--
-- Run with:
--   docker exec -i underwings-krayin-db mariadb -ukrayin \
--     -pKrCrmUnderwings2026x krayin < phase2-5-tables.sql

CREATE TABLE IF NOT EXISTS uw_outbound_suppression (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    reason       VARCHAR(100) NOT NULL DEFAULT 'low_fit_score',
    score        INT UNSIGNED NULL,
    lead_id      INT UNSIGNED NULL,
    suppressed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes        TEXT NULL,
    UNIQUE KEY uq_email (email),
    INDEX idx_reason (reason),
    INDEX idx_suppressed_at (suppressed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserved for Phase 5 outbound logging (not used yet, but the schema
-- is here so Phase 5 has zero migrations to write).
CREATE TABLE IF NOT EXISTS uw_outbound_log (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lead_id       INT UNSIGNED NULL,
    email         VARCHAR(255) NULL,
    channel       VARCHAR(50) NOT NULL,    -- 'email' | 'linkedin' | 'whatsapp'
    sequence_step INT UNSIGNED NULL,
    practitioner  VARCHAR(50) NULL,        -- 'manoj' | 'nelson' | 'vinoth'
    sent_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reply_at      TIMESTAMP NULL,
    reply_sentiment VARCHAR(50) NULL,
    INDEX idx_lead (lead_id),
    INDEX idx_email (email),
    INDEX idx_channel (channel),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
