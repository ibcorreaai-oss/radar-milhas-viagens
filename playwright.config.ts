import { defineConfig, devices } from '@playwright/test';

// Smoke tests de fluxos críticos (auditoria de produção, 27/08) -- não é
// cobertura E2E completa, é o mínimo pra pegar regressão óbvia em rotas
// públicas e proteção de auth sem precisar de sessão/credencial real.
//
// Roda contra a URL de produção por padrão (mesmo padrão de verificação já
// usado em toda a auditoria desta sessão -- curl real contra o site real),
// não contra um servidor local: não exige `.env.local` com Supabase real
// configurado pra rodar, e valida o que realmente importa (o deploy real).
// Sobrescreva com SMOKE_TEST_BASE_URL=http://localhost:3000 pra testar
// local antes de um deploy, se quiser.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_TEST_BASE_URL || 'https://radar-milhas-viagens.vercel.app',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
