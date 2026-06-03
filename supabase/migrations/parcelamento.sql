-- Adiciona coluna parcelamento à tabela clients
-- Cada órgão: { active: bool, total: number, startMonth: "YYYY-MM" }
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS parcelamento jsonb NOT NULL DEFAULT '{}'::jsonb;
