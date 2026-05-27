-- 001-outbound-draft.sql — review queue for outbound drafts (Phase I, free variant).
-- Drafts land here as `pending_review`; a human approves before anything sends.
-- Krayin lead creation is deferred to approval, so the CRM isn't polluted with
-- un-reviewed scraped candidates.
CREATE TABLE IF NOT EXISTS uw_outbound_draft (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  lead_id      INT NULL,
  practitioner VARCHAR(50)  NOT NULL,
  channel      VARCHAR(50)  NOT NULL DEFAULT 'email',   -- email | linkedin
  source       VARCHAR(50),                             -- osm | scrape | search | jobs
  email        VARCHAR(255) NOT NULL,
  company      VARCHAR(255),
  website      VARCHAR(255),
  linkedin_url VARCHAR(255),
  score        INT,
  score_reason VARCHAR(255),
  subject      VARCHAR(255),
  body         TEXT,
  linkedin_dm  TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending_review', -- pending_review|approved|rejected|sent
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  TIMESTAMP NULL,
  KEY idx_status (status),
  KEY idx_practitioner (practitioner),
  UNIQUE KEY uq_email (email)
);
