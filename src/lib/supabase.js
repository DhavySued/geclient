import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas.')
}

export const supabase = createClient(url, key)

// ─── Mappers snake_case ↔ camelCase ──────────────────────────────────────────

export function fromDb(row) {
  if (!row) return null
  return {
    id:             row.id,
    name:           row.name,
    cnpj:           row.cnpj,
    level:          row.level,
    regime:         row.regime,
    tipo:           row.tipo ?? 'Serviço',
    fiscalStatus:   row.fiscal_status,
    cxStatus:       row.cx_status,
    monthlyStatus:  row.monthly_status,
    pendingTaxes:   row.pending_taxes ?? [],
    fiscalHistory:  row.fiscal_history ?? [],
    hasEmployees:   row.has_employees ?? false,
    hasProLabore:   row.has_pro_labore ?? false,
    lastInteraction: row.last_interaction,
    healthScore:    row.health_score,
    responsible:    row.responsible ?? '',
    notes:          row.notes ?? '',
    monthlyRevenue: Number(row.monthly_revenue ?? 0),
  }
}

export function toDb(client) {
  return {
    name:            client.name,
    cnpj:            client.cnpj,
    level:           client.level,
    regime:          client.regime,
    tipo:            client.tipo ?? 'Serviço',
    fiscal_status:   client.fiscalStatus,
    cx_status:       client.cxStatus,
    monthly_status:  client.monthlyStatus,
    pending_taxes:   client.pendingTaxes ?? [],
    fiscal_history:  client.fiscalHistory ?? [],
    has_employees:   client.hasEmployees ?? false,
    has_pro_labore:  client.hasProLabore ?? false,
    last_interaction: client.lastInteraction ?? new Date().toISOString().slice(0, 10),
    health_score:    client.healthScore ?? 70,
    responsible:     client.responsible ?? '',
    notes:           client.notes ?? '',
    monthly_revenue: client.monthlyRevenue ?? 0,
  }
}
