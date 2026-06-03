-- Adiciona coluna de histórico de parcelamentos à tabela clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS parcelamento_history jsonb NOT NULL DEFAULT '[]'::jsonb;
