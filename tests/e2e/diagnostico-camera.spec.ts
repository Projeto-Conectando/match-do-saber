import { expect, test } from '@playwright/test';

// Câmera falsa do Chromium + modelo de pose real. Arquivo próprio porque `launchOptions` só pode ser
// definido no topo do arquivo (força um worker novo).
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera'],
});

test('AC-12.3: com a câmera ativa, o painel mostra o tempo de detecção em ms', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?diagnostico');
  await page.waitForSelector('video', { state: 'visible', timeout: 30_000 });
  const painel = page.getByRole('complementary', { name: 'Diagnóstico' });
  await expect(painel).toContainText(/detecção: \d+ ms \(máx \d+ ms\)/, { timeout: 30_000 });
  console.log(`painel: ${(await painel.innerText()).split('\n').slice(0, 3).join(' | ')}`);
});
