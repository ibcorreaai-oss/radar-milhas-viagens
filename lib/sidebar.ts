// Estado (expandida/recolhida) da sidebar do dashboard (ETAPA 12 —
// Collapsible Sidebar), persistido em localStorage — mesmo padrão de
// lib/theme.ts (chave própria, leitura defensiva com try/catch).
export const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

export function readStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeStoredSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // Sem persistência disponível — ainda aplica pro resto da sessão.
  }
}
