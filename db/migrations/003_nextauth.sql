-- Add password_hash column for NextAuth credentials provider
-- Nullable: existing rows (seeded via other providers) won't have a local password

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
