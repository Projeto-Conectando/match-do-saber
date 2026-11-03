import { expect, test } from '@playwright/test';

test('partida completa pelo teclado, sem câmera (AC-1.6, AC-2.5, AC-3.4, AC-4.x, AC-5.1, AC-5.6)', async ({ page }) => {
  test.setTimeout(120_000); // 10 feedbacks de 3 s + 16 s de resumo
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new DOMException('negada', 'NotAllowedError')) },
    });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
  await page.keyboard.press('Enter');

  for (let i = 0; i < 10; i++) {
    const card = page.locator('article');
    await expect(card).toBeVisible();
    if (i === 0) {
      await page.keyboard.press('ArrowUp');
      await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
      await page.keyboard.press('ArrowUp');
    }
    await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
    await expect(page.getByText(/^É (verdadeira|falsa)$/)).toBeVisible();
  }

  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
  await expect(page.getByText(/^(Cuidado!|Você consegue|Parabéns!|Imune a fake news!)/)).toBeVisible(); // AC-5.7
  await page.waitForTimeout(16000);
  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible(); // AC-5.2: não expira
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible(); // AC-5.6 sem câmera: nova partida direto
});

test('arrastar o card com o mouse escolhe (AC-2.5)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  const box = (await page.locator('article').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});

test('tempo esgotado mostra feedback (AC-4.3)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await expect(page.getByText('Tempo esgotado')).toBeVisible({ timeout: 17000 });
});

test('FR-4: texto no limite máximo não é cortado em 1366×768', async ({ page }) => {
  await page.route('**/content/noticias.json', async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    json.noticias = json.noticias.map((n: Record<string, string>) => ({ ...n, titulo: 'T'.repeat(100), descricao: 'D '.repeat(110) }));
    await route.fulfill({ json });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  const card = page.locator('article');
  const caixa = (await card.boundingBox())!;
  expect(caixa.y).toBeGreaterThanOrEqual(0);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(768);
  const cortado = await card.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  expect(cortado).toBe(false);
});

async function iniciarSemCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
}

// No próprio navegador: espera o card ganhar a classe de saída, deixa a animação correr ~100 ms
// e lê o deslocamento horizontal (matriz do transform calculado) e se o feedback já apareceu.
function saidaAntesDoFeedback(page: import('@playwright/test').Page) {
  return page.evaluate(() => new Promise<{ classe: string; visivelFeedback: boolean; tx: number }>((resolve, reject) => {
    const t0 = performance.now();
    let visto: number | null = null;
    const passo = () => {
      const agora = performance.now();
      if (agora - t0 > 2000) return reject(new Error('o card não saiu'));
      const el = document.querySelector('article');
      if (el && /sai(Direita|Esquerda)/.test(el.className)) {
        visto ??= agora;
        if (agora - visto >= 100) {
          resolve({
            classe: el.className,
            visivelFeedback: /Acertou!|Errou/.test(document.body.innerText),
            tx: new DOMMatrix(getComputedStyle(el).transform).m41,
          });
          return;
        }
      }
      requestAnimationFrame(passo);
    };
    passo();
  }));
}

for (const [tecla, lado, classe, sinal] of [
  ['ArrowRight', 'direita', /saiDireita/, 1],
  ['ArrowLeft', 'esquerda', /saiEsquerda/, -1],
] as const) {
  test(`AC-2.5 + AC-${lado === 'direita' ? '2.1' : '2.2'}: ${tecla} faz o card sair pela ${lado} antes do feedback`, async ({ page }) => {
    await iniciarSemCamera(page);
    await page.keyboard.press(tecla);
    const r = await saidaAntesDoFeedback(page);
    expect(r.classe).toMatch(classe);
    expect(r.visivelFeedback).toBe(false);
    expect(Math.sign(r.tx)).toBe(sinal);
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  });
}

test('arrastar o card para a esquerda escolhe "falsa" e o card sai pela esquerda (AC-2.5, AC-2.2)', async ({ page }) => {
  await iniciarSemCamera(page);
  const box = (await page.locator('article').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2);
  await page.mouse.up();
  const r = await saidaAntesDoFeedback(page);
  expect(r.classe).toMatch(/saiEsquerda/);
  expect(r.visivelFeedback).toBe(false);
  expect(r.tx).toBeLessThan(0);
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});
