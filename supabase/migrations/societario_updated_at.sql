ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE societario_cards SET updated_at = created_at WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION set_societario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS societario_cards_set_updated_at ON societario_cards;
CREATE TRIGGER societario_cards_set_updated_at
  BEFORE UPDATE ON societario_cards
  FOR EACH ROW EXECUTE FUNCTION set_societario_updated_at();
