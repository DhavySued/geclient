-- ============================================================
--  GECLIENT — Tabela de Auditoria
--  Cole este arquivo no SQL Editor do Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. audit_logs
-- ────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references users(id) on delete set null,
  user_name   text        not null default '',
  action      text        not null,   -- 'create' | 'update' | 'delete' | 'import'
  menu        text        not null,   -- 'cadastro' | 'fiscal' | 'cx' | 'tarefas' | 'usuarios' | 'configuracoes'
  entity      text        not null,   -- 'client' | 'task' | 'user' | 'fiscal_record'
  entity_id   text,                   -- id do registro afetado
  entity_name text,                   -- nome legível (ex: "Empresa XPTO", "Tarefa ABC")
  changes     jsonb,                  -- detalhes: { before, after } em updates; { data } em creates/deletes
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Índices
-- ────────────────────────────────────────────────────────────
create index if not exists idx_audit_user_id    on audit_logs (user_id);
create index if not exists idx_audit_action     on audit_logs (action);
create index if not exists idx_audit_menu       on audit_logs (menu);
create index if not exists idx_audit_entity     on audit_logs (entity);
create index if not exists idx_audit_created_at on audit_logs (created_at desc);

-- ────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ────────────────────────────────────────────────────────────
alter table audit_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_logs' and policyname = 'allow_all_audit_logs'
  ) then
    create policy allow_all_audit_logs on audit_logs for all using (true) with check (true);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 4. Realtime
-- ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'audit_logs'
      and schemaname = 'public'
  ) then
    execute 'alter publication supabase_realtime add table audit_logs';
  end if;
end $$;
