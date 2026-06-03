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
    scoreFiscal:    row.score_fiscal ?? 0,
    scoreCx:        row.score_cx ?? 0,
    pendingTaxes:   row.pending_taxes ?? [],
    hasEmployees:        row.has_employees ?? false,
    hasProLabore:        row.has_pro_labore ?? false,
    emExclusaoSimples:   row.em_exclusao_simples ?? false,
    active:              row.active ?? true,
    mapFiscal:           row.map_fiscal ?? true,
    mapNps:              row.map_nps ?? true,
    mapOnboarding:       row.map_onboarding ?? false,
    onboardingStatus:      row.onboarding_status ?? 'sem_inicio',
    onboardingStatusSince: row.onboarding_status_since ?? null,
    onboardingHistory:     row.onboarding_history ?? [],
    onboardingFinished:    row.onboarding_finished ?? false,
    onboardingFinishedAt:  row.onboarding_finished_at ?? null,
    lastInteraction: row.last_interaction,
    notes:          row.notes ?? '',
    entryDate:      row.entry_date ?? null,
    createdAt:      row.created_at ?? null,
    dpServices:        row.dp_services ?? {},
    dpServicesHistory: row.dp_services_history ?? [],
    parcelamento:        row.parcelamento         ?? {},
    parcelamentoHistory: row.parcelamento_history  ?? [],
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
    score_fiscal:    client.scoreFiscal ?? 0,
    score_cx:        client.scoreCx ?? 0,
    pending_taxes:   client.pendingTaxes ?? [],
    has_employees:        client.hasEmployees ?? false,
    has_pro_labore:       client.hasProLabore ?? false,
    em_exclusao_simples:  client.emExclusaoSimples ?? false,
    active:               client.active ?? true,
    map_fiscal:           client.mapFiscal ?? true,
    map_nps:              client.mapNps ?? true,
    map_onboarding:       client.mapOnboarding ?? false,
    onboarding_status:       client.onboardingStatus ?? 'sem_inicio',
    onboarding_status_since: client.onboardingStatusSince ?? null,
    onboarding_history:      client.onboardingHistory ?? [],
    onboarding_finished:     client.onboardingFinished ?? false,
    onboarding_finished_at:  client.onboardingFinishedAt ?? null,
    last_interaction: client.lastInteraction ?? new Date().toISOString().slice(0, 10),
    notes:           client.notes ?? '',
    entry_date:      client.entryDate || null,
    dp_services:         client.dpServices ?? {},
    dp_services_history: client.dpServicesHistory ?? [],
    parcelamento:         client.parcelamento        ?? {},
    parcelamento_history: client.parcelamentoHistory  ?? [],
  }
}
