-- Cria tabela de registros mensais de parcelamentos
CREATE TABLE IF NOT EXISTS parcelamento_records (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month      text        NOT NULL,
  mei             boolean     NOT NULL DEFAULT false,
  simples         boolean     NOT NULL DEFAULT false,
  receita_federal boolean     NOT NULL DEFAULT false,
  pgfn            boolean     NOT NULL DEFAULT false,
  sefaz           boolean     NOT NULL DEFAULT false,
  status          text        NOT NULL DEFAULT 'pendente',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month)
);

CREATE OR REPLACE FUNCTION update_parcelamento_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parcelamento_records_updated_at ON parcelamento_records;
CREATE TRIGGER parcelamento_records_updated_at
  BEFORE UPDATE ON parcelamento_records
  FOR EACH ROW EXECUTE FUNCTION update_parcelamento_records_updated_at();
