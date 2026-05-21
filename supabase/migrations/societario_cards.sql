CREATE TABLE IF NOT EXISTS societario_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  client_id   uuid        REFERENCES clients(id) ON DELETE SET NULL,
  description text,
  column_id   text        NOT NULL DEFAULT 'ordem_servico',
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE societario_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access" ON societario_cards FOR ALL USING (auth.role() = 'authenticated');
