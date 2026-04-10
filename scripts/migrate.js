import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clients = JSON.parse(readFileSync(join(__dirname, '../src/data/clients.json'), 'utf-8'))

const { Client } = pg

const client = new Client({
  host: 'db.pwwapsjfctntrdxsmpsp.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '@#$Dhavy123',
  ssl: { rejectUnauthorized: false },
})

const SCHEMA = `
-- Tabela principal de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text        NOT NULL,
  cnpj          text        NOT NULL,
  level         text        NOT NULL DEFAULT 'Standard'
                              CHECK (level IN ('Standard','Gold','Premium')),
  regime        text        NOT NULL DEFAULT 'Simples Nacional',
  fiscal_status text        NOT NULL DEFAULT 'regular'
                              CHECK (fiscal_status IN ('regular','alerta','irregular','bloqueado')),
  cx_status     text        NOT NULL DEFAULT 'neutro'
                              CHECK (cx_status IN ('promotor','neutro','risco_churn','detrator')),
  monthly_status text       NOT NULL DEFAULT 'pendente'
                              CHECK (monthly_status IN ('pendente','processando','concluido','atrasado')),
  pending_taxes  text[]     DEFAULT '{}',
  last_interaction date     DEFAULT CURRENT_DATE,
  health_score  integer     DEFAULT 70 CHECK (health_score BETWEEN 0 AND 100),
  responsible   text        DEFAULT '',
  notes         text        DEFAULT '',
  monthly_revenue numeric   DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Permissões para os roles do Supabase (PostgREST requer RLS ON + policy)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;

-- Habilita RLS com policy aberta (necessário para o anon key funcionar via PostgREST)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON public.clients;
CREATE POLICY allow_all ON public.clients FOR ALL USING (true) WITH CHECK (true);
`

async function run() {
  await client.connect()
  console.log('✓ Conectado ao Supabase')

  await client.query(SCHEMA)
  console.log('✓ Tabela clients criada/verificada')

  // Verifica se já há dados
  const { rows } = await client.query('SELECT COUNT(*) FROM public.clients')
  const count = Number(rows[0].count)

  if (count === 0) {
    console.log('  Inserindo dados iniciais...')
    for (const c of clients) {
      await client.query(
        `INSERT INTO public.clients
          (name, cnpj, level, regime, fiscal_status, cx_status, monthly_status,
           pending_taxes, last_interaction, health_score, responsible, notes, monthly_revenue)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          c.name, c.cnpj, c.level, c.regime,
          c.fiscalStatus, c.cxStatus, c.monthlyStatus,
          c.pendingTaxes, c.lastInteraction, c.healthScore,
          c.responsible, c.notes, c.monthlyRevenue,
        ]
      )
    }
    console.log(`✓ ${clients.length} clientes inseridos`)
  } else {
    console.log(`  Tabela já contém ${count} registros — seed ignorado`)
  }

  await client.end()
  console.log('✓ Migração concluída com sucesso!')
}

run().catch(err => {
  console.error('✗ Erro na migração:', err.message)
  process.exit(1)
})
