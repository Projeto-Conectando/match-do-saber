import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const DICA_MAO = 'É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais';

async function abrirSemCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('menu pelo teclado: abrir, mudar, fechar, lembrar e bloquear na partida (AC-9.1–9.6, 9.14, 9.17)', async ({ page }) => {
  await abrirSemCamera(page);
  const menu = page.getByRole('dialog', { name: 'Configurações' });
  const resumo = (t: string) => page.getByText(t, { exact: true });
  await expect(resumo('Modo: Corpo · Tempo por card: 15 s · Som: ligado')).toBeVisible();   // AC-9.4

  await page.keyboard.press('m');
  await expect(menu).toBeVisible();                                                       // AC-9.1
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();                                                        // AC-9.3

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowRight');                                                // modo → Mão
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');                                                // 15 → 20 s
  await page.keyboard.press('Enter');                                                     // fecha (AC-9.3)
  await expect(menu).toBeHidden();
  await expect(page.locator('article')).toHaveCount(0);                                   // Enter do menu não inicia
  await expect(resumo('Modo: Mão · Tempo por card: 20 s · Som: ligado')).toBeVisible();   // AC-9.2

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');                                                 // 20 → 15
  await page.keyboard.press('ArrowLeft');                                                 // 15 → 10
  await page.keyboard.press('ArrowLeft');                                                 // 10 fica (AC-9.17)
  await page.keyboard.press('m');                                                         // M também fecha
  await expect(resumo('Modo: Mão · Tempo por card: 10 s · Som: ligado')).toBeVisible();

  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(resumo('Modo: Mão · Tempo por card: 10 s · Som: ligado')).toBeVisible();   // AC-9.5

  await page.keyboard.press('Enter');
  const card = page.locator('article');
  await expect(card).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText(/^(10|9|8) s$/);   // AC-9.17: começa em 10 s (o relógio é real; sob carga a leitura pode atrasar)
  const dica = page.getByText(DICA_MAO);
  await expect(dica).toBeVisible();                                                       // AC-9.14
  const [a, b] = [(await dica.boundingBox())!, (await card.boundingBox())!];
  expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true); // FR-4
  await page.keyboard.press('m');
  await expect(menu).toHaveCount(0);                                                      // AC-9.6
});

test('menu pelo mouse (AC-9.2) e setas no modo Cabeça (AC-9.16)', async ({ page }) => {
  await abrirSemCamera(page);
  await page.getByRole('button', { name: 'Configurações' }).click();
  const menu = page.getByRole('dialog', { name: 'Configurações' });
  await menu.getByRole('button', { name: '○ Cabeça' }).click();
  await expect(menu.getByRole('button', { name: '◉ Cabeça' })).toBeVisible();
  await menu.getByRole('button', { name: 'Fechar' }).click();
  await expect(menu).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeVisible();
  await expect(menu).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});

test('AC-9.1/AC-9.18: ⚙ no canto superior direito abre um painel lateral à direita', async ({ page }) => {
  await abrirSemCamera(page);
  const vp = page.viewportSize()!;
  const botao = page.getByRole('button', { name: 'Configurações' });
  const b = (await botao.boundingBox())!;
  expect(b.x + b.width).toBeGreaterThan(vp.width - 48);
  expect(b.y).toBeLessThan(48);
  const iniciar = page.getByRole('button', { name: '▶ Iniciar' });
  const antes = (await iniciar.boundingBox())!;

  await botao.click();
  const painel = page.getByRole('dialog', { name: 'Configurações' }).locator(':scope > div');
  await expect(painel).toBeVisible();
  await page.waitForTimeout(300);                                    // fim da animação de entrada
  const p = (await painel.boundingBox())!;
  expect(p.x + p.width).toBeCloseTo(vp.width, 0);                   // encostado à direita
  expect(p.y).toBeCloseTo(0, 0);
  expect(p.height).toBeCloseTo(vp.height, 0);                       // altura da tela
  expect(p.width).toBeLessThanOrEqual(26 * 16 + 1);                 // até 26rem
  expect((await iniciar.boundingBox())!).toEqual(antes);            // Iniciar não sai do lugar
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog', { name: 'Configurações' })).toBeHidden();
});
