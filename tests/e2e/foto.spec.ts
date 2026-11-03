import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const FOTO = 'Sua foto na partida';

/** Joga `n` cards pelas setas, esperando o feedback de cada um e o card seguinte. */
async function escolher(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await expect(page.locator('article')).toBeVisible();
    await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  }
}

test('AC-13.3: sem câmera, o resumo não tem polaroid', async ({ page }) => {
  test.setTimeout(90_000); // 10 feedbacks de 3 s
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.keyboard.press('Enter');
  await escolher(page, 10);
  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
  await expect(page.locator('figure')).toHaveCount(0);
  await expect(page.locator('main img')).toHaveCount(0);
});

test('AC-13.1/AC-13.2/AC-13.4/AC-13.5: com câmera, polaroid do card do meio no resumo, só na memória', async ({ page }) => {
  test.setTimeout(150_000); // modelo de pose + 10 feedbacks de 3 s + partida seguinte
  // Câmera simulada: um canvas 1280×720 repintado a cada quadro, entregue como MediaStream.
  await page.addInitScript(() => {
    const getUserMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d')!;
      let n = 0;
      const pintar = () => {
        g.fillStyle = '#2a9d8f';
        g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#ffd166';
        g.fillRect((n++ * 8) % c.width, 300, 120, 120); // muda a cada quadro para o stream ter quadros novos
        requestAnimationFrame(pintar);
      };
      pintar();
      return c.captureStream(30);
    };
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia } });
  });
  const requisicoes: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('http')) requisicoes.push(`${r.url()} ${r.postData() ?? ''}`);
  });
  await page.goto('/');
  await expect(page.locator('video')).toBeVisible({ timeout: 60_000 }); // câmera "ativa": modelo carregado
  await expect(page.getByText(CAMERA_OFF)).toHaveCount(0);

  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();                   // AC-1.7
  await page.keyboard.press('Enter');                                               // pula a calibração (AC-1.8)
  await escolher(page, 10);

  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
  const foto = page.getByRole('img', { name: FOTO });
  await expect(foto).toBeVisible();
  expect(await foto.getAttribute('src')).toMatch(/^data:image\/jpeg/);
  expect(await foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(/^Match do Saber · \d+ de 10$/)).toBeVisible();

  // AC-13.2/AC-5.7: polaroid, placar, mensagem e técnicas cabem em 1366×768 sem se sobrepor.
  const caixas = {
    polaroid: (await page.locator('figure').boundingBox())!,
    placar: (await page.getByText(/^\d+ de 10$/).boundingBox())!,
    mensagem: (await page.getByText(/^(Cuidado!|Você consegue|Parabéns!|Imune a fake news!)/).boundingBox())!,
    tecnicas: (await page.locator('main ul').boundingBox())!,
  };
  console.log(`caixas: ${JSON.stringify(caixas)}`);
  for (const [nome, b] of Object.entries(caixas)) {
    expect(b.x, nome).toBeGreaterThanOrEqual(0);
    expect(b.y, nome).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, nome).toBeLessThanOrEqual(1366);
    expect(b.y + b.height, nome).toBeLessThanOrEqual(768);
  }
  // Nem a prévia da câmera, que fica no canto inferior direito por cima de tudo, cobre o resumo.
  const lista = [...Object.entries(caixas), ['prévia', (await page.locator('div:has(> video)').boundingBox())!] as const];
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const [[na, a], [nb, b]] = [lista[i]!, lista[j]!];
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${na} × ${nb}`).toBe(true);
    }
  }

  // AC-13.5: a foto não foi para a rede nem para o armazenamento do navegador.
  expect(requisicoes.filter((r) => r.includes('data:image'))).toEqual([]);
  expect(await page.evaluate(() => Object.values(localStorage).filter((v) => v.includes('data:image')))).toEqual([]);
  expect(await page.evaluate(() => Object.values(sessionStorage).filter((v) => v.includes('data:image')))).toEqual([]);

  // AC-13.4: Enter no resumo vai à calibração e apaga a foto; Esc volta à espera.
  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '▶ Iniciar' })).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);

  // Partida seguinte encerrada por Esc antes do card do meio: nenhuma foto em lugar nenhum.
  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();
  await page.keyboard.press('Enter');
  await escolher(page, 3);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '▶ Iniciar' })).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);
});
