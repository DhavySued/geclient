-- Adiciona coluna dp_services à tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dp_services jsonb DEFAULT '{}'::jsonb;

-- Cria tabela de registros mensais do Departamento Pessoal
CREATE TABLE IF NOT EXISTS dp_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month          text        NOT NULL,          -- formato "2026-05"
  adiantamento_folha  boolean     NOT NULL DEFAULT false,
  folha               boolean     NOT NULL DEFAULT false,
  pro_labore          boolean     NOT NULL DEFAULT false,
  autonomo_sal        boolean     NOT NULL DEFAULT false,
  sem_movimentacao    boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month)
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_dp_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dp_records_updated_at ON dp_records;
CREATE TRIGGER dp_records_updated_at
  BEFORE UPDATE ON dp_records
  FOR EACH ROW EXECUTE FUNCTION update_dp_records_updated_at();
