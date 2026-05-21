ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS responsible_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
