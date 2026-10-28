import { expect, test } from '@playwright/test';

// Câmera falsa do Chromium + modelo de pose real: a detecção deixa os quadros lentos (> 100 ms).
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera'],
});

test('FR-1/AC-4.4: o relógio do card segue o tempo real mesmo com a detecção lenta', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.locator('video').first()).toBeVisible({ timeout: 30_000 });
  // O modelo de pose carrega depois da prévia: espera fixa para a detecção já estar rodando.
  await page.waitForTimeout(8000);

  await page.keyboard.press('Enter'); // abre a calibração
  await page.keyboard.press('Enter'); // pula a calibração
  await expect(page.locator('article')).toBeVisible();

  const barra = page.getByRole('timer', { name: 'Tempo restante' });
  const segundos = async () => Number.parseInt((await barra.innerText()).replace(/\D/g, ''), 10);
  const antes = await segundos();
  const inicio = Date.now();
  await page.waitForTimeout(10_000);
  const depois = await segundos();
  const real = (Date.now() - inicio) / 1000;

  const gasto = antes - depois;
  console.log(`barra: ${antes} s -> ${depois} s em ${real.toFixed(1)} s reais (gasto ${gasto} s)`);
  expect(Math.abs(gasto - real)).toBeLessThanOrEqual(1.5);
  expect(depois).toBeGreaterThanOrEqual(4);
  expect(depois).toBeLessThanOrEqual(6);
});
