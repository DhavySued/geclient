-- ============================================================
--  GECLIENT — Kanban Fiscal: tabelas e histórico
--  Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. fiscal_items  (itens do checklist — INSS, FGTS, DAS…)
-- ────────────────────────────────────────────────────────────
create table if not exists fiscal_items (
  id         text primary key,             -- slug, ex: 'inss', 'fgts', 'das'
  label      text        not null,
  weight     numeric     not null default 1,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Tabelas de configuração (vincula itens ao perfil do cliente)
-- ────────────────────────────────────────────────────────────
create table if not exists regime_fiscal_items (
  regime         text not null,             -- 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  fiscal_item_id text not null references fiscal_items(id) on delete cascade,
  primary key (regime, fiscal_item_id)
);

create table if not exists condition_fiscal_items (
  condition      text not null,             -- 'employees' | 'pro_labore'
  fiscal_item_id text not null references fiscal_items(id) on delete cascade,
  primary key (condition, fiscal_item_id)
);

create table if not exists tipo_fiscal_items (
  tipo           text not null,             -- 'Serviço' | 'Comércio' | 'Misto'
  fiscal_item_id text not null references fiscal_items(id) on delete cascade,
  primary key (tipo, fiscal_item_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. fiscal_month_records  (registro mensal por empresa)
--
--   • Uma linha por (empresa, competência)
--   • status  = coluna do kanban
--   • checks  = { itemId: 'ok' | 'pending' | 'nok' }
--   • pending_taxes = impostos com pendência marcada
--   • note    = observação do analista
-- ────────────────────────────────────────────────────────────
create table if not exists fiscal_month_records (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references clients(id) on delete cascade,
  month         text        not null,       -- formato 'YYYY-MM'
  status        text        not null default 'sem_consulta',
                            -- 'sem_consulta' | 'com_pendencia' | 'comunicado_cliente'
                            -- 'em_regularizacao' | 'resolvido' | 'sem_pendencia'
  checks        jsonb       not null default '{}',
  pending_taxes text[]      not null default '{}',
  note          text        not null default '',
  updated_at    timestamptz not null default now(),

  unique (client_id, month)
);

create index if not exists idx_fmr_client_id  on fiscal_month_records (client_id);
create index if not exists idx_fmr_month      on fiscal_month_records (month);
create index if not exists idx_fmr_status     on fiscal_month_records (status);
create index if not exists idx_fmr_updated_at on fiscal_month_records (updated_at desc);

-- Mantém updated_at sempre atual
create or replace function set_fiscal_record_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fmr_updated_at on fiscal_month_records;
create trigger trg_fmr_updated_at
  before update on fiscal_month_records
  for each row execute function set_fiscal_record_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. fiscal_status_history  (audit log de mudanças de coluna)
--
--   Registrado automaticamente via trigger sempre que o status
--   de um fiscal_month_record é criado ou alterado.
-- ────────────────────────────────────────────────────────────
create table if not exists fiscal_status_history (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references clients(id) on delete cascade,
  month        text        not null,         -- competência afetada
  from_status  text,                         -- null na criação do registro
  to_status    text        not null,
  changed_at   timestamptz not null default now()
);

create index if not exists idx_fsh_client_id  on fiscal_status_history (client_id);
create index if not exists idx_fsh_month      on fiscal_status_history (month);
create index if not exists idx_fsh_changed_at on fiscal_status_history (changed_at desc);

-- Trigger que grava no histórico a cada mudança de status
create or replace function log_fiscal_status_change()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') or (old.status is distinct from new.status) then
    insert into fiscal_status_history (client_id, month, from_status, to_status)
    values (
      new.client_id,
      new.month,
      case when TG_OP = 'INSERT' then null else old.status end,
      new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fmr_status_history on fiscal_month_records;
create trigger trg_fmr_status_history
  after insert or update on fiscal_month_records
  for each row execute function log_fiscal_status_change();

-- ────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ────────────────────────────────────────────────────────────
alter table fiscal_month_records   enable row level security;
alter table fiscal_status_history  enable row level security;
alter table fiscal_items           enable row level security;
alter table regime_fiscal_items    enable row level security;
alter table condition_fiscal_items enable row level security;
alter table tipo_fiscal_items      enable row level security;

-- Políticas abertas (escritório interno, sem auth por usuário)
-- Ajuste para `auth.uid() = user_id` se quiser por usuário depois.
do $$ begin
  -- fiscal_month_records
  if not exists (select 1 from pg_policies where tablename='fiscal_month_records' and policyname='allow_all_fiscal_month_records') then
    create policy allow_all_fiscal_month_records on fiscal_month_records for all using (true) with check (true);
  end if;

  -- fiscal_status_history
  if not exists (select 1 from pg_policies where tablename='fiscal_status_history' and policyname='allow_all_fiscal_status_history') then
    create policy allow_all_fiscal_status_history on fiscal_status_history for all using (true) with check (true);
  end if;

  -- fiscal_items
  if not exists (select 1 from pg_policies where tablename='fiscal_items' and policyname='allow_all_fiscal_items') then
    create policy allow_all_fiscal_items on fiscal_items for all using (true) with check (true);
  end if;

  -- regime_fiscal_items
  if not exists (select 1 from pg_policies where tablename='regime_fiscal_items' and policyname='allow_all_regime_fiscal_items') then
    create policy allow_all_regime_fiscal_items on regime_fiscal_items for all using (true) with check (true);
  end if;

  -- condition_fiscal_items
  if not exists (select 1 from pg_policies where tablename='condition_fiscal_items' and policyname='allow_all_condition_fiscal_items') then
    create policy allow_all_condition_fiscal_items on condition_fiscal_items for all using (true) with check (true);
  end if;

  -- tipo_fiscal_items
  if not exists (select 1 from pg_policies where tablename='tipo_fiscal_items' and policyname='allow_all_tipo_fiscal_items') then
    create policy allow_all_tipo_fiscal_items on tipo_fiscal_items for all using (true) with check (true);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 6. kanban_column_settings  (ordem + rótulo das colunas do kanban)
--
--   • Uma linha por coluna de cada board.
--   • board_key: 'fiscal' | 'cx'
--   • col_id:    valor usado como droppableId e em fiscal_month_records.status
--   • position:  ordem de exibição (0 = primeira)
--   • is_custom: true = criada pelo usuário (pode ser excluída)
-- ────────────────────────────────────────────────────────────
create table if not exists kanban_column_settings (
  id        uuid    primary key default gen_random_uuid(),
  board_key text    not null,
  col_id    text    not null,
  label     text    not null,
  position  integer not null default 0,
  is_custom boolean not null default false,
  unique (board_key, col_id)
);

create index if not exists idx_kcs_board_position on kanban_column_settings (board_key, position);

alter table kanban_column_settings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'kanban_column_settings'
      and policyname = 'allow_all_kanban_column_settings'
  ) then
    create policy allow_all_kanban_column_settings
      on kanban_column_settings for all using (true) with check (true);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 7. Realtime — habilita para as tabelas usadas pelo app
--    Verifica antes de adicionar para evitar erro se já existir
-- ────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'fiscal_month_records',
    'fiscal_status_history',
    'fiscal_items',
    'kanban_column_settings'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and tablename = t
        and schemaname = 'public'
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
