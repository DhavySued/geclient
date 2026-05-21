-- Data de entrada da empresa no escritório
-- Usada pelo Kanban Fiscal para não exibir a empresa em meses anteriores à entrada
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS entry_date DATE;
