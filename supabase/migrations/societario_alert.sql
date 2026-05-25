ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS alert boolean NOT NULL DEFAULT false;
