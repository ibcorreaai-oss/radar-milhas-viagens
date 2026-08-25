// Dark mode: light/dark/system, persistido em localStorage (§58 do
// PROMPT.md original — planejado desde o início via tailwind.config.ts
// `darkMode: 'class'`, nunca implementado até agora).
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'theme';

export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle('dark', resolveIsDark(preference));
}

// Script inline injetado em <head> pelo root layout — precisa rodar ANTES
// da hidratação do React pra não piscar o tema errado (FOUC). Por isso é
// uma string standalone, não pode importar nada deste módulo.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;
