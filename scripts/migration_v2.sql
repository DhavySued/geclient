-- ──────────────────────────────────────────────────────────────────────────────
-- Migration v2: Refatoração de campos de empresas
-- Data: 2026-04-09
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Remover campos legados
ALTER TABLE public.clients DROP COLUMN IF EXISTS health_score;
ALTER TABLE public.clients DROP COLUMN IF EXISTS monthly_status;

-- 2. Adicionar novos campos de score (0–100, padrão 0)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS score_fiscal integer NOT NULL DEFAULT 0
    CHECK (score_fiscal BETWEEN 0 AND 100);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS score_cx integer NOT NULL DEFAULT 0
    CHECK (score_cx BETWEEN 0 AND 100);

-- 3. Corrigir constraint e default de fiscal_status
--    (os valores reais do app diferiam do schema original: regular/alerta/etc.)
--    Primeiro normalizar dados inválidos existentes antes de trocar a constraint.
UPDATE public.clients
  SET fiscal_status = 'sem_consulta'
  WHERE fiscal_status NOT IN (
    'sem_consulta', 'com_pendencia', 'comunicado_cliente',
    'em_regularizacao', 'resolvido', 'sem_pendencia'
  );

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_fiscal_status_check;

ALTER TABLE public.clients
  ALTER COLUMN fiscal_status SET DEFAULT 'sem_consulta';

ALTER TABLE public.clients
  ADD CONSTRAINT clients_fiscal_status_check
    CHECK (fiscal_status IN (
      'sem_consulta', 'com_pendencia', 'comunicado_cliente',
      'em_regularizacao', 'resolvido', 'sem_pendencia'
    ));

-- 4. Corrigir constraint de cx_status: adicionar 'cliente_novo' e mudar default
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_cx_status_check;

ALTER TABLE public.clients
  ALTER COLUMN cx_status SET DEFAULT 'cliente_novo';

ALTER TABLE public.clients
  ADD CONSTRAINT clients_cx_status_check
    CHECK (cx_status IN (
      'cliente_novo', 'promotor', 'neutro', 'risco_churn', 'detrator'
    ));
