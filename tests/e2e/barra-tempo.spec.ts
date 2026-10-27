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
  await expect(barra).toHaveText('15 s');
  const caixa = (await barra.boundingBox())!;
  expect(caixa.width).toBeGreaterThan(1300);
  expect(caixa.height).toBeGreaterThanOrEqual(48);
  const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
  const antes = await largura();
  await page.waitForTimeout(2000);
  expect(await largura()).toBeLessThan(antes);
});

test('AC-4.7: nos últimos 5 s o card pulsa; com "saiba mais" aberto, não', async ({ page }) => {
  test.setTimeout(30_000);
  const card = page.locator('article');
  await expect(page.getByRole('timer')).toHaveText('5 s', { timeout: 12_000 });
  await expect(card).toHaveClass(/pulsando/);
  await page.keyboard.press('ArrowUp');                        // saiba mais pausa
  await expect(card).not.toHaveClass(/pulsando/);
});
