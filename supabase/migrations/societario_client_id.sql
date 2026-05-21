-- Adiciona client_id na tabela societario_cards (caso a migration original já tenha sido rodada sem ela)
ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Remove coluna empresa legada (se existir)
ALTER TABLE societario_cards
  DROP COLUMN IF EXISTS empresa;
