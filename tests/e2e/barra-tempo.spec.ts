import { expect, test } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.keyboard.press('Enter');
});

test('AC-2.3: o card não recebe transformação de inclinação', async ({ page }) => {
  const card = page.locator('article');
  await expect(card).toBeVisible();
  await page.waitForTimeout(500);
  await expect(card).not.toHaveAttribute('style', /transform/);
});

test('AC-4.6: barra larga na base, diminuindo com o tempo', async ({ page }) => {
  const barra = page.getByRole('timer', { name: 'Tempo restante' });
  await expect(barra).toHaveText(/^1[345] s$/);   // começa perto de 15 s: o relógio é real e, sob carga, a primeira leitura pode atrasar
  const caixa = (await barra.boundingBox())!;
  expect(caixa.width).toBeGreaterThan(1300);
  expect(caixa.height).toBeGreaterThanOrEqual(48);
  const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
  const antes = await largura();
  await page.waitForTimeout(2000);
  expect(await largura()).toBeLessThan(antes);
});

test('AC-3.1/AC-4.7 (v5.0.0): com o "saiba mais" aberto a barra continua diminuindo, ele não fecha sozinho e o card pulsa nos últimos 5 s', async ({ page }) => {
  test.setTimeout(30_000);
  const card = page.locator('article');
  const barra = page.getByRole('timer', { name: 'Tempo restante' });
  const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
  await page.keyboard.press('ArrowUp');
  await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
  const antes = await largura();
  await page.waitForTimeout(2000);
  expect(await largura()).toBeLessThan(antes);                       // não trava
  await page.waitForTimeout(4500);                                    // passa dos 5 s do antigo fechamento automático
  await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
  await expect(barra).toHaveText(/^[0-9] s$/, { timeout: 10_000 });   // chegou nos últimos segundos
  await expect(page.locator('article')).toHaveClass(/pulsando/);
});

type Caixa = { x: number; y: number; width: number; height: number };
const sobrepoe = (a: Caixa, b: Caixa) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`AC-4.8/AC-4.5 (v8.2.0): barra de tempo no card, colada embaixo, em ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    const card = page.locator('article');
    const barraCard = page.getByRole('timer', { name: 'Tempo do card' });
    const barraTela = page.getByRole('timer', { name: 'Tempo restante' });
    await expect(barraCard).toBeVisible();
    await expect(card.locator('img')).toHaveJSProperty('complete', true);

    const c = (await card.boundingBox())!;
    const b = (await barraCard.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(c.x - 2);
    expect(b.y).toBeGreaterThanOrEqual(c.y);
    expect(Math.abs(b.y + b.height - (c.y + c.height))).toBeLessThanOrEqual(2);   // encostada embaixo
    expect(Math.abs(b.width - c.width)).toBeLessThanOrEqual(2);                    // largura do card
    for (const el of await card.locator('img, h2, p').all()) {
      expect(sobrepoe(b, (await el.boundingBox())!)).toBe(false);                  // não cobre imagem, título, descrição, dica
    }

    // AC-4.5: o card continua centralizado e cabendo na área de jogo
    const t = (await barraTela.boundingBox())!;
    expect(c.y + c.height).toBeLessThanOrEqual(t.y);
    expect(Math.abs(c.y + c.height / 2 - t.y / 2)).toBeLessThanOrEqual(8);

    // mesmos segundos da barra da tela (lidos juntos; tolera um tique de diferença)
    const [sc, st] = await page.evaluate(() => {
      const seg = (n: string) => Number.parseInt(document.querySelector(`[aria-label="${n}"]`)!.textContent!, 10);
      return [seg('Tempo do card'), seg('Tempo restante')] as const;
    });
    expect(Math.abs(sc - st)).toBeLessThanOrEqual(1);
    await expect(barraCard).toHaveText(/^\d+ s$/);
    const largura = () => barraCard.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
    const antes = await largura();
    await page.waitForTimeout(2000);
    expect(await largura()).toBeLessThan(antes);

    // "saiba mais": a barra continua no card e fora do texto expandido
    await page.keyboard.press('ArrowUp');
    await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
    await expect(barraCard).toBeVisible();
    const saibaMais = (await card.locator(':scope > div').filter({ hasText: 'Texto expandido de teste.' }).boundingBox())!;
    const b2 = (await barraCard.boundingBox())!;
    const c2 = (await card.boundingBox())!;
    expect(sobrepoe(b2, saibaMais)).toBe(false);
    expect(Math.abs(b2.y + b2.height - (c2.y + c2.height))).toBeLessThanOrEqual(2);
  });
}
