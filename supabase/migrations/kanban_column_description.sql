-- Adiciona campo description nas colunas do kanban
ALTER TABLE kanban_column_settings
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
