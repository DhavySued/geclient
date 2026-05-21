-- Substitui description + last_updated_date por observations (array de { date, text })
ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS observations jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE societario_cards
  DROP COLUMN IF EXISTS description;

ALTER TABLE societario_cards
  DROP COLUMN IF EXISTS last_updated_date;
