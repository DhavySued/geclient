-- Campos de mapeamento de módulos e controle de onboarding
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS map_fiscal             boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS map_nps               boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS map_onboarding        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_status     text        NOT NULL DEFAULT 'sem_inicio',
  ADD COLUMN IF NOT EXISTS onboarding_finished   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_status_since  timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_finished_at   timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_history       jsonb       NOT NULL DEFAULT '[]';
