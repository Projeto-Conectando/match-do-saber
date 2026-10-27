import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrirSemCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('menu pelo teclado: abrir, cancelar, escolher, lembrar e bloquear durante a partida (AC-9.1–9.6, AC-9.14)', async ({ page }) => {
  await abrirSemCamera(page);
  const botao = (nome: string) => page.getByRole('button', { name: `⚙ Modo de jogo: ${nome}` });
  const menu = page.getByRole('dialog', { name: 'Modo de jogo' });
  await expect(botao('Corpo')).toBeVisible();                     // AC-9.4

  await page.keyboard.press('m');
  await expect(menu).toBeVisible();                               // AC-9.1
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();                                // AC-9.3
  await expect(botao('Corpo')).toBeVisible();

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(botao('Mão')).toBeVisible();                       // AC-9.2
  await expect(page.locator('article')).toHaveCount(0);           // Enter do menu não inicia partida

  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(botao('Mão')).toBeVisible();                       // AC-9.5

  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  const dica = page.getByText('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais');
  await expect(dica).toBeVisible();                               // AC-9.14
  // FR-4: a dica do modo não cobre o card.
  const c = (await page.locator('article').boundingBox())!;
  const d = (await dica.boundingBox())!;
  const sobrepoe = d.x < c.x + c.width && c.x < d.x + d.width && d.y < c.y + c.height && c.y < d.y + d.height;
  expect(sobrepoe).toBe(false);
  await page.keyboard.press('m');
  await expect(menu).toHaveCount(0);                              // AC-9.6
});

test('menu pelo mouse escolhe Cabeça (AC-9.2)', async ({ page }) => {
  await abrirSemCamera(page);
  await page.getByRole('button', { name: '⚙ Modo de jogo: Corpo' }).click();
  const menu = page.getByRole('dialog', { name: 'Modo de jogo' });
  await menu.getByRole('button', { name: /Cabeça/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: '⚙ Modo de jogo: Cabeça' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeVisible();
  await expect(menu).toHaveCount(0); // Enter depois do clique inicia a partida, não reabre o menu
});

test('AC-9.16: setas funcionam no modo Mão', async ({ page }) => {
  await abrirSemCamera(page);
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});
