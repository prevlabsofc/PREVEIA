/** Cookie: super admin escolheu Sistema (/dashboard) em vez de /admin. */
export const MARPLE_PANEL_COOKIE = 'marple_panel'
export const MARPLE_PANEL_SISTEMA = 'sistema'
export const MARPLE_PANEL_ADMIN = 'admin'

/** TTL curto: só impede bounce imediato /escolha↔/dashboard; depois o seletor volta a funcionar. */
const PANEL_MAX_AGE_SEC = 120

export function setPanelPreference(value: typeof MARPLE_PANEL_SISTEMA | typeof MARPLE_PANEL_ADMIN) {
  if (typeof document === 'undefined') return
  document.cookie = `${MARPLE_PANEL_COOKIE}=${value}; Path=/; Max-Age=${PANEL_MAX_AGE_SEC}; SameSite=Lax`
}

export function clearPanelPreference() {
  if (typeof document === 'undefined') return
  document.cookie = `${MARPLE_PANEL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}
