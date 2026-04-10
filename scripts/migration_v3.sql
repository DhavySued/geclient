-- Migration v3: adiciona updated_at em fiscal_month_records
-- Rode no SQL Editor do Supabase

ALTER TABLE public.fiscal_month_records
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Garante que a função set_updated_at existe
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at automaticamente em cada UPDATE
DROP TRIGGER IF EXISTS trg_fiscal_month_records_updated_at ON public.fiscal_month_records;
CREATE TRIGGER trg_fiscal_month_records_updated_at
  BEFORE UPDATE ON public.fiscal_month_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
