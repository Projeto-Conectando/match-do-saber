import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const DICA_CABECA = 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais';

async function abrirSemCamera(page: Page, url: string) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto(url);
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-12.1: sem ?diagnostico não há painel', async ({ page }) => {
  await abrirSemCamera(page, '/');
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Diagnóstico' })).toHaveCount(0);
});

test('AC-12.2/AC-12.4/AC-12.5: com ?diagnostico, painel no canto sem cobrir o card, registro baixável, nada na rede', async ({ page }) => {
  const externas: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) externas.push(r.url()); });
  await abrirSemCamera(page, '/?diagnostico');
  const painel = page.getByRole('complementary', { name: 'Diagnóstico' });
  await expect(painel).toBeVisible();
  await expect(painel).toContainText('detecção: sem câmera');
  await expect(painel).toContainText(/quadros\/s: [1-9]/);

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');                                                // modo → Cabeça (dica mais longa)
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  const card = page.locator('article');
  await expect(card).toBeVisible();
  await expect(page.getByText(DICA_CABECA)).toBeVisible();

  // AC-12.3: com as linhas mais longas medidas no estande, nenhuma linha é cortada e o painel
  // não cobre o card, os pontos nem a dica do modo. Injeta e mede na mesma chamada síncrona,
  // porque o painel redesenha a cada 500 ms.
  const medida = await page.evaluate(([dica]) => {
    const painelEl = document.querySelector('aside[aria-label="Diagnóstico"]')!;
    const linhas = [...painelEl.querySelectorAll('p')];
    const longas: Record<number, string> = {
      2: 'pessoas: 1 · modo: Cabeça · tela: calibracao',
      3: 'punho D: y=0.31 conf 0.92 · acima do ombro',
      4: 'punho E: y=0.31 conf 0.92 · acima do ombro',
      5: 'ombros: y=0.45 / 0.46 conf 0.99 / 0.98',
      7: 'gestos (5 s): direita, maosParaCima, esquerda',
    };
    for (const [i, texto] of Object.entries(longas)) linhas[Number(i)]!.textContent = texto;
    const caixa = (el: Element | undefined) => {
      const r = el!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const ps = [...document.querySelectorAll('p')];
    return {
      linhas: linhas.map((p) => ({ texto: p.textContent, scrollWidth: p.scrollWidth, clientWidth: p.clientWidth })),
      painel: caixa(painelEl),
      outros: {
        card: caixa(document.querySelector('article')!),
        pontos: caixa(ps.find((p) => p.textContent?.startsWith('Pontos:'))),
        dica: caixa(ps.find((p) => p.textContent === dica)),
      },
    };
  }, [DICA_CABECA]);
  for (const l of medida.linhas) expect(l.scrollWidth, l.texto!).toBeLessThanOrEqual(l.clientWidth);
  const a = medida.painel;
  for (const [nome, b] of Object.entries(medida.outros)) {
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, nome).toBe(true);
  }

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar registro (60 s)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^match-do-saber-diagnostico-.*\.json$/);
  const dados = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(dados.versao).toBe(1);
  expect(Math.abs(dados.inicioPaginaMs + dados.amostras.at(-1).t - Date.now())).toBeLessThan(60_000);
  expect(dados.amostras.length).toBeGreaterThan(0);
  const ultima = dados.amostras.at(-1);
  for (const campo of ['t', 'dtMs', 'deteccaoMs', 'pessoas', 'tela', 'modo', 'pontos', 'medidas', 'gestos']) {
    expect(ultima).toHaveProperty(campo);
  }
  expect(ultima).toMatchObject({ tela: 'card', deteccaoMs: null, pessoas: 0 });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('match-do-saber:')))).toEqual([]);
  expect(externas).toEqual([]);
});
