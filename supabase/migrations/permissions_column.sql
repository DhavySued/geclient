-- ============================================================
--  GECLIENT — Coluna de permissões por usuário
--  Cole este arquivo no SQL Editor do Supabase e execute
-- ============================================================

-- Adiciona a coluna permissions (JSONB) à tabela users
-- null = acesso total (admin); objeto = permissões configuradas
alter table users
  add column if not exists permissions jsonb default null;

-- Permissão de leitura/escrita para anon/authenticated (segue o padrão da tabela)
-- Ajuste as policies de RLS caso sua tabela use Row Level Security
