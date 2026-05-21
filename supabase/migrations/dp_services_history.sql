-- Adiciona coluna dp_services_history à tabela clients
-- Cada entrada: { yearMonth: "2026-05", services: { folha: true, proLabore: false, ... } }
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS dp_services_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Adiciona colunas de novos serviços na tabela dp_records (caso ainda não existam)
ALTER TABLE dp_records
  ADD COLUMN IF NOT EXISTS envio_folha boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inss        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fgts        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS det         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status      text    NOT NULL DEFAULT 'pendente';
