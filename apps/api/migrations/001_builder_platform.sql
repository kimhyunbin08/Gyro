CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  age_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS builders_email_lower_unique ON builders (lower(email));

CREATE TABLE IF NOT EXISTS builder_identities (
  provider TEXT NOT NULL CHECK (provider IN ('github')),
  provider_subject TEXT NOT NULL,
  builder_id UUID NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (provider, builder_id)
);

CREATE TABLE IF NOT EXISTS builder_magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  age_confirmed BOOLEAN NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS builder_magic_links_expiry ON builder_magic_links (expires_at);

CREATE TABLE IF NOT EXISTS builder_oauth_states (
  state_hash TEXT PRIMARY KEY,
  age_confirmed BOOLEAN NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS builder_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_hash TEXT NOT NULL,
  builder_id UUID NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS builder_sessions_builder ON builder_sessions (builder_id);
CREATE INDEX IF NOT EXISTS builder_sessions_expiry ON builder_sessions (expires_at);

CREATE TABLE IF NOT EXISTS builder_consent_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  builder_id UUID NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
  name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  service_url TEXT NOT NULL DEFAULT '',
  docs_url TEXT NOT NULL DEFAULT '',
  operator_contact_url TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'service'
    CHECK (kind IN ('product', 'service', 'skill', 'mcp')),
  tasks TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL DEFAULT '',
  rights_notes TEXT NOT NULL DEFAULT '',
  rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  approved_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_submissions_owner ON service_submissions (builder_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS service_submissions_public ON service_submissions (status) WHERE status = 'approved';

CREATE TABLE IF NOT EXISTS submission_revisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES service_submissions(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, revision_no)
);

CREATE TABLE IF NOT EXISTS moderation_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES service_submissions(id) ON DELETE CASCADE,
  moderator_email TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'suspended')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_reviews_submission ON moderation_reviews (submission_id, created_at DESC);

INSERT INTO schema_migrations (version) VALUES ('001_builder_platform')
ON CONFLICT (version) DO NOTHING;
