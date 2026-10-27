import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrir(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-1.1/AC-10.3: o jogo não começa sozinho, e depois de Sair fica na espera', async ({ page }) => {
  await abrir(page);
  await page.waitForTimeout(3000);
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByText('Fique no centro')).toHaveCount(0);

  await page.getByRole('button', { name: '▶ Iniciar' }).click();
  await expect(page.locator('article')).toBeVisible();
  await page.getByRole('button', { name: 'Sair da partida' }).click();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
});
