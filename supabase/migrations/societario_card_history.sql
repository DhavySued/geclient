ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS card_history jsonb NOT NULL DEFAULT '[]'::jsonb;
