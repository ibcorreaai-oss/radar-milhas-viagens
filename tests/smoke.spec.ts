import { test, expect } from '@playwright/test';

// Smoke tests de fluxos críticos -- ver playwright.config.ts pro porquê de
// rodar contra produção real por padrão. Nenhum teste aqui faz login,
// preenche cartão ou completa uma ação irreversível (mesma regra que vale
// pra qualquer verificação manual desta sessão).

test.describe('rotas públicas', () => {
  test('home carrega', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Radar Milhas/);
  });

  test('robots.txt existe e desautoriza rotas privadas', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /dashboard');
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml existe', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
  });

  test('login carrega', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('proteção de rotas autenticadas', () => {
  for (const path of ['/dashboard', '/admin', '/assinatura', '/viagens', '/concierge']) {
    test(`${path} redireciona pra /login sem sessão`, async ({ page }) => {
      const res = await page.goto(path);
      expect(page.url()).toContain('/login');
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

test.describe('World Experience Radar -- leitura anônima (regressão)', () => {
  // Guarda de regressão pro bug real corrigido em 27/08: feature_flags
  // exigia auth pra leitura, então getFeatureFlags() caía no fallback
  // "tudo desligado" pra visitante anônimo e essas 5 páginas mostravam
  // "ainda não está ativado" mesmo com a flag true no banco (migrations
  // 0032/0033). Cada teste aqui falha se essa regressão voltar.
  const cases: Array<{ path: string; mustNotContain: string }> = [
    { path: '/estadias', mustNotContain: 'ainda não está ativado' },
    { path: '/cruzeiros', mustNotContain: 'ainda não está ativado' },
    { path: '/descobrir', mustNotContain: 'ainda não está ativado' },
    { path: '/oportunidades-mundiais', mustNotContain: 'ainda não está ativado' },
    { path: '/onde-ir', mustNotContain: 'ainda não está ativado' },
  ];

  for (const { path, mustNotContain } of cases) {
    test(`${path} não mostra "flag desativada" pra visitante anônimo`, async ({ page }) => {
      await page.goto(path);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toContain(mustNotContain);
    });
  }
});
