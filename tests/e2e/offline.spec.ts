import { expect, test } from '@playwright/test';

test('AC-8.1/AC-8.3: depois de uma visita online, abre e joga offline com imagens', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.reload(); // garante que o SW controla a página
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
  await page.keyboard.press('Enter');
  const img = page.locator('article img');
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
});

test('AC-8.2: manifest instalável em tela cheia', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest');
  expect(r.ok()).toBe(true);
  const m = await r.json();
  expect(m).toMatchObject({ name: 'Match do Saber', display: 'fullscreen', lang: 'pt-BR' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
});

test('NFR Security: nenhuma requisição sai do próprio site durante a partida', async ({ page }) => {
  const externas: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) externas.push(r.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  expect(externas).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

test.describe('falha ao carregar o catálogo', () => {
  test.use({ serviceWorkers: 'block' }); // garante que page.route intercepta o fetch do catálogo

  for (const [caso, resposta] of [
    ['404', { status: 404, body: 'não encontrado' }],
    ['JSON com formato inválido ({})', { status: 200, json: {} }],
  ] as const) {
    test(`catálogo ${caso} mostra "Conecte à internet uma vez para baixar o jogo"`, async ({ page }) => {
      await page.route('**/content/noticias.json', (route) => route.fulfill(resposta));
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
      });
      await page.goto('/');
      await expect(page.getByText('Conecte à internet uma vez para baixar o jogo')).toBeVisible();
    });
  }
});
