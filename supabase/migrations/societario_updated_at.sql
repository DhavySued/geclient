ALTER TABLE societario_cards
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE societario_cards SET updated_at = created_at WHERE updated_at IS NULL;

-- Só atualiza updated_at quando o conteúdo muda (não em reordenação/drag-drop)
CREATE OR REPLACE FUNCTION set_societario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.title          IS DISTINCT FROM OLD.title)          OR
     (NEW.client_id      IS DISTINCT FROM OLD.client_id)      OR
     (NEW.observations   IS DISTINCT FROM OLD.observations)   OR
     (NEW.responsible_ids IS DISTINCT FROM OLD.responsible_ids) OR
     (NEW.alert          IS DISTINCT FROM OLD.alert)          THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS societario_cards_set_updated_at ON societario_cards;
CREATE TRIGGER societario_cards_set_updated_at
  BEFORE UPDATE ON societario_cards
  FOR EACH ROW EXECUTE FUNCTION set_societario_updated_at();
