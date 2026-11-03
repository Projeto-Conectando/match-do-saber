import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

/** Sem câmera e com um AudioContext falso que conta os osciladores tocados. */
async function abrir(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    const w = window as unknown as { __sons: number; AudioContext: unknown };
    w.__sons = 0;
    class Param { setValueAtTime() {} exponentialRampToValueAtTime() {} }
    class No { connect() {} }
    class Osc extends No { type = 'sine'; frequency = new Param(); start() { w.__sons++; } stop() {} }
    class Ganho extends No { gain = new Param(); }
    class Ctx {
      state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() { return new Osc(); }
      createGain() { return new Ganho(); }
    }
    w.AudioContext = Ctx;
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}
const sonsTocados = (page: Page) => page.evaluate(() => (window as unknown as { __sons: number }).__sons);

test('AC-10.1/AC-10.3: Iniciar começa; Sair (clique) e Esc encerram sem resumo', async ({ page }) => {
  await abrir(page);
  await page.getByRole('button', { name: '▶ Iniciar' }).click();
  await expect(page.locator('article')).toBeVisible();
  await page.getByRole('button', { name: 'Sair da partida' }).click();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);

  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(page.getByText(/^\d+ de \d+$/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sair da partida' })).toHaveCount(0);
});

test('AC-10.2: sem notícias, Iniciar desativado', async ({ page }) => {
  await page.route('**/content/noticias.json', (r) => r.fulfill({ json: { versao: 'x', noticias: [] } }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '▶ Iniciar' })).toBeDisabled();
});

test('AC-10.5: Sair não cobre o card', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  const [a, b] = [(await page.getByRole('button', { name: 'Sair da partida' }).boundingBox())!, (await page.locator('article').boundingBox())!];
  expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
});

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`AC-4.5: card centralizado na vertical em ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await abrir(page);
    await page.keyboard.press('Enter');
    const box = (await page.locator('article').boundingBox())!;
    const barra = (await page.getByRole('timer', { name: 'Tempo restante' }).boundingBox())!;
    expect(barra.y + barra.height).toBeCloseTo(vp.height, 0);          // colada na base
    expect(box.y + box.height).toBeLessThanOrEqual(barra.y);            // card não fica atrás da barra
    expect(Math.abs(box.y + box.height / 2 - barra.y / 2)).toBeLessThanOrEqual(8); // centro da área de jogo
  });
}

test('AC-11.1–11.3: som ligado toca na escolha e no resultado', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  await expect.poll(() => sonsTocados(page)).toBeGreaterThanOrEqual(2);
});

test('AC-11.4: som desligado não toca nada', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');                       // Som → Desligado
  await page.keyboard.press('Escape');
  await expect(page.getByText('Modo: Corpo · Tempo por card: 15 s · Som: desligado · Foto: ligada', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  await page.waitForTimeout(500);
  expect(await sonsTocados(page)).toBe(0);
});
