-- Adiciona flag "Em exclusão do Simples" na tabela de clientes
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS em_exclusao_simples boolean NOT NULL DEFAULT false;
