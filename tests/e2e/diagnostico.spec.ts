import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrirSemCamera(page: Page, url: string) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto(url);
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-12.1: sem ?diagnostico não há painel', async ({ page }) => {
  await abrirSemCamera(page, '/');
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Diagnóstico' })).toHaveCount(0);
});

test('AC-12.2/AC-12.4/AC-12.5: com ?diagnostico, painel no canto sem cobrir o card, registro baixável, nada na rede', async ({ page }) => {
  const externas: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) externas.push(r.url()); });
  await abrirSemCamera(page, '/?diagnostico');
  const painel = page.getByRole('complementary', { name: 'Diagnóstico' });
  await expect(painel).toBeVisible();
  await expect(painel).toContainText('detecção: sem câmera');
  await expect(painel).toContainText(/quadros\/s: [1-9]/);

  await page.keyboard.press('Enter');
  const card = page.locator('article');
  await expect(card).toBeVisible();
  const [a, b] = [(await painel.boundingBox())!, (await card.boundingBox())!];
  expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar registro (60 s)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^match-do-saber-diagnostico-.*\.json$/);
  const dados = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(dados.versao).toBe(1);
  expect(dados.amostras.length).toBeGreaterThan(0);
  const ultima = dados.amostras.at(-1);
  for (const campo of ['t', 'dtMs', 'deteccaoMs', 'pessoas', 'tela', 'modo', 'pontos', 'medidas', 'gestos']) {
    expect(ultima).toHaveProperty(campo);
  }
  expect(ultima).toMatchObject({ tela: 'card', deteccaoMs: null, pessoas: 0 });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('match-do-saber:')))).toEqual([]);
  expect(externas).toEqual([]);
});
