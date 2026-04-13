-- ============================================================
--  GECLIENT — Autenticação de usuários
--  Cole este arquivo no SQL Editor do Supabase
--  (usa md5 nativo — sem extensão pgcrypto)
-- ============================================================

-- 1. Adiciona colunas de autenticação à tabela users
alter table users
  add column if not exists login         text unique,
  add column if not exists password_hash text;

-- 2. Função: verifica credenciais e retorna dados do usuário
--    Hash = md5(login || ':' || senha)  — salt simples baseado no login
create or replace function check_user_login(p_login text, p_password text)
returns table (
  id    uuid,
  name  text,
  email text,
  role  text,
  color text,
  login text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    u.id,
    u.name,
    u.email,
    u.role,
    u.color,
    u.login
  from users u
  where u.login         = p_login
    and u.password_hash is not null
    and u.password_hash = md5(p_login || ':' || p_password);
end;
$$;

-- 3. Função: define/atualiza a senha de um usuário
create or replace function set_user_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login text;
begin
  select login into v_login from users where id = p_user_id;
  update users
  set password_hash = md5(v_login || ':' || p_password)
  where id = p_user_id;
end;
$$;

-- 4. Permissões para anon key
grant execute on function check_user_login(text, text) to anon, authenticated;
grant execute on function set_user_password(uuid, text) to anon, authenticated;
