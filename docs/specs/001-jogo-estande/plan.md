# Implementation Plan: Match do Saber — jogo de estande (MVP)

**Spec:** docs/specs/001-jogo-estande/spec.md
**Decisions:** docs/adr/001-frontend-stack.md, docs/adr/001-motion-input.md, docs/adr/001-content-pipeline.md
**Created:** 2026-10-26

## Global Constraints

- Tempos: 15 s por card (v2.0.0: configurável de 10 a 30 s, padrão 15 s), 3 s de feedback, 2 s de calibração, 10 s de tolerância sem pessoa (o "saiba mais" fechava sozinho após 5 s de inatividade até a v4.0.0; removido na v5.0.0); o resumo fica na tela até Enter.
- 10 cards por partida, 5 verdadeiros + 5 falsos, sem repetição; completa com o outro lado; com menos de 10 notícias, usa todas.
- Pontuação: +1 por acerto; 0 por erro ou tempo esgotado.
- Gestos: tronco para a **própria direita** = match (verdadeira); para a própria esquerda = descarte (falsa); dois punhos acima do nariz = saiba mais; ~300 ms / ~500 ms de permanência; retorno ao centro entre escolhas.
- Entrada alternativa: → match, ← descarte, ↑ saiba mais, Enter iniciar; arrastar o card com mouse/toque.
- (v1.1.0) Modos de jogo: Corpo (padrão), Mão (mão direita = match, esquerda = descarte, as duas = saiba mais) e Cabeça (inclinar para direita/esquerda; queixo para cima = saiba mais). Escolhidos pelo operador na tela de espera (tecla M), guardados no notebook até serem trocados; nunca mudam durante uma partida.
- (v6.0.0) Modo Mão: escolher por levantar a mão, por duas mãos para um lado ou arrastando do centro para o lado. A pausa por ausência vale só no modo Corpo.
- (v5.0.0) O cronômetro do card só pausa por "Volte para o centro": com o "saiba mais" aberto o tempo corre e a barra diminui; o "saiba mais" não fecha sozinho.
- (v4.0.0) Card parado até a escolha (sem inclinar com o corpo/cabeça); cronômetro numa barra grossa na base da tela com os segundos; nos últimos 5 s barra vermelha e card pulsando em vermelho (pausado, não pulsa).
- (v3.0.0) Início só manual: a câmera nunca inicia nada; "▶ Iniciar" ou Enter na espera abre a calibração (câmera ativa) ou começa direto (sem câmera); Enter na calibração a pula. Sair, ausência de 10 s e o fim de calibração vazia deixam o jogo na espera.
- (v2.0.0) Menu "Configurações": modo, tempo por card (10, 15, 20, 25, 30 s) e som (ligado/desligado). Botões "▶ Iniciar" (= Enter) e "✕ Sair" (= Esc, encerra sem resumo). Sons sintetizados: deslizar na escolha, positivo no acerto, erro no erro e no tempo esgotado. Card centralizado na vertical.
- Todos os textos em português do Brasil.
- Nada da câmera é gravado ou transmitido; nenhum cookie, rastreador ou analytics; o app publicado não contém credenciais.
- Telas de referência: 1366×768 ou maior, sem cortar título ou descrição.
- Stack (ADR): Vite 8 + React 18.3.1 + TypeScript + vite-plugin-pwa 2; testes com Vitest 5 + Playwright; GitHub Pages via GitHub Actions; MediaPipe Pose Landmarker lite (`@mediapipe/tasks-vision` 1.1.1, `numPoses: 3`).
- Mensagens fixas da spec: "Fique no centro", "Volte para o centro", "Nenhuma notícia publicada", "Câmera desativada — jogue pelas setas (Enter para começar)", "Câmera indisponível — use as setas", "Conecte à internet uma vez para baixar o jogo", "Acertou!", "Errou", "Tempo esgotado".

Gates de pré-implementação:
- **Simplicidade:** OK. São 3 componentes: `src/core` (domínio puro), `src/app` (UI + câmera) e o pipeline de conteúdo (`scripts/` + `apps-script/` + workflow). Dependências novas: só as listadas.
- **Anti-abstração:** OK. Um único modelo `Noticia`, e `LinhaPlanilha` existe só no script de publicação. MediaPipe e React são usados direto; o único adaptador é `criarRastreador`, que existe para manter o domínio testável sem câmera.
- **Integration-first:** OK. A Fase 0 define tipos, contratos e testes de contrato antes de qualquer implementação.

---

## Goal

Um PWA instalável e offline do Match do Saber, publicado no GitHub Pages, que joga partidas de 10 cards controladas pelo corpo (com teclado/mouse de reserva), mais o pipeline Planilha Google → GitHub Actions que publica só notícias aprovadas.

---

## Phase 0: Contracts and Tests First

**Implements:** FR-6, FR-7 (contratos) | **Satisfies:** — (trava formatos)
**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/core/types.ts`, `src/core/catalogo.ts`, `src/core/catalogo.test.ts`, `scripts/sync/validar.ts`, `scripts/sync/validar.test.ts`
**Interfaces:** Consumes: nothing. Produces: tipos `Veredito`, `Tecnica`, `Noticia`, `Catalogo`, `TECNICA_ROTULO` (`src/core/types.ts`); `parseCatalogo(json: unknown): Catalogo` (`src/core/catalogo.ts`); `LinhaPlanilha`, `Descarte`, `lerLinhas(valores: string[][]): LinhaPlanilha[]`, `validarLinhas(linhas: LinhaPlanilha[]): { aprovadas: LinhaPlanilha[]; descartes: Descarte[] }` (`scripts/sync/validar.ts`).

Cria o esqueleto do projeto e trava os dois contratos: o catálogo que o app lê e as regras de validação da planilha. A implementação fica como stub que lança erro, para os testes falharem.

> Nota: o ADR 001-frontend-stack fixa React 18, então este plano usa `react@18.3.1`. Migrar para o React 19 (atual) exigiria emendar o ADR.

- [ ] Criar `package.json`:
  ```json
  {
    "name": "match-do-saber",
    "private": true,
    "type": "module",
    "scripts": {
      "prepare-assets": "tsx scripts/preparar-assets.ts",
      "predev": "npm run prepare-assets",
      "dev": "vite",
      "prebuild": "npm run prepare-assets",
      "build": "tsc --noEmit && vite build",
      "preview": "vite preview --port 4173",
      "test": "vitest run",
      "sync": "tsx scripts/sync/main.ts",
      "fixture": "tsx scripts/fixture.ts",
      "e2e": "npm run fixture && npm run build && playwright test"
    },
    "dependencies": {
      "@mediapipe/tasks-vision": "1.1.1",
      "react": "18.3.1",
      "react-dom": "18.3.1"
    },
    "devDependencies": {
      "@playwright/test": "1.64.1",
      "@testing-library/jest-dom": "7.0.1",
      "@testing-library/react": "16.3.3",
      "@types/node": "26.6.5",
      "@types/react": "18.3.31",
      "@types/react-dom": "18.3.7",
      "@vitejs/plugin-react": "6.1.2",
      "googleapis": "188.0.0",
      "jsdom": "30.1.3",
      "sharp": "0.35.5",
      "tsx": "4.23.15",
      "typescript": "5.9.3",
      "vite": "8.3.5",
      "vite-plugin-pwa": "2.0.0",
      "vitest": "5.0.5"
    }
  }
  ```
  Antes do `npm install`, conferir com `npm view @types/react-dom@18 version` e `npm view typescript@5 version` as últimas versões 5.x/18.x. O TypeScript 7 (nativo) é recente demais para ser a base; a versão 5.x é a usada pelo ecossistema do Vite.
- [ ] Criar `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "jsx": "react-jsx",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "skipLibCheck": true,
      "types": ["vite/client", "vite-plugin-pwa/client", "@testing-library/jest-dom", "node"],
      "noEmit": true
    },
    "include": ["src", "scripts", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
  }
  ```
- [ ] Criar `vite.config.ts` (o PWA entra na Fase 6):
  ```ts
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    base: process.env.BASE_PATH ?? '/',
    plugins: [react()],
  });
  ```
- [ ] Criar `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
      environment: 'node', // testes de componente declaram `// @vitest-environment jsdom` no topo
      setupFiles: ['tests/setup.ts'],
    },
  });
  ```
  e `tests/setup.ts`:
  ```ts
  import '@testing-library/jest-dom/vitest';
  ```
- [ ] Criar `index.html`:
  ```html
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Match do Saber</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```
- [ ] Criar `.gitignore`:
  ```
  node_modules/
  dist/
  public/mediapipe/
  public/content/
  public/icons/*.png
  test-results/
  playwright-report/
  .env
  *.service-account.json
  ```
- [ ] Criar `src/core/types.ts`:
  ```ts
  export type Veredito = 'verdadeira' | 'falsa';
  export type Tecnica = 'fonte' | 'data' | 'imagem' | 'contexto';

  export const VEREDITOS: readonly Veredito[] = ['verdadeira', 'falsa'];
  export const TECNICAS: readonly Tecnica[] = ['fonte', 'data', 'imagem', 'contexto'];

  export const TECNICA_ROTULO: Record<Tecnica, string> = {
    fonte: 'Checar a fonte',
    data: 'Conferir a data',
    imagem: 'Verificar a imagem',
    contexto: 'Analisar o contexto',
  };

  export interface Noticia {
    id: string;
    titulo: string;
    descricao: string;
    saibaMais: string;
    imagem: string;
    veredito: Veredito;
    explicacao: string;
    tecnica: Tecnica;
    fonteUrl: string;
  }

  export interface Catalogo {
    versao: string;
    noticias: Noticia[];
  }
  ```
- [ ] Criar o stub `src/core/catalogo.ts`:
  ```ts
  import type { Catalogo } from './types';

  export function parseCatalogo(_json: unknown): Catalogo {
    throw new Error('não implementado');
  }
  ```
- [ ] Escrever o teste de contrato `src/core/catalogo.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { parseCatalogo } from './catalogo';

  const noticia = {
    id: 'n1', titulo: 'T', descricao: 'D', saibaMais: 'S', imagem: 'content/img/n1.webp',
    veredito: 'falsa', explicacao: 'E', tecnica: 'fonte', fonteUrl: 'https://exemplo.org',
  };

  describe('parseCatalogo', () => {
    it('aceita um catálogo válido', () => {
      const c = parseCatalogo({ versao: '2026-10-26T12:00:00Z', noticias: [noticia] });
      expect(c.noticias).toHaveLength(1);
      expect(c.noticias[0]?.veredito).toBe('falsa');
    });

    it('aceita catálogo vazio', () => {
      expect(parseCatalogo({ versao: 'x', noticias: [] }).noticias).toEqual([]);
    });

    it.each([
      ['não-objeto', 42],
      ['sem noticias', { versao: 'x' }],
      ['veredito inválido', { versao: 'x', noticias: [{ ...noticia, veredito: 'talvez' }] }],
      ['tecnica inválida', { versao: 'x', noticias: [{ ...noticia, tecnica: 'sorte' }] }],
      ['campo faltando', { versao: 'x', noticias: [{ ...noticia, titulo: undefined }] }],
    ])('rejeita %s', (_nome, json) => {
      expect(() => parseCatalogo(json)).toThrow(/catálogo inválido/);
    });
  });
  ```
- [ ] Criar o stub `scripts/sync/validar.ts`:
  ```ts
  export const COLUNAS = [
    'id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
    'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status',
  ] as const;
  export type Coluna = (typeof COLUNAS)[number];
  export type LinhaPlanilha = Record<Coluna, string> & { linha: number };
  export interface Descarte { linha: number; id: string; motivo: string }

  export function lerLinhas(_valores: string[][]): LinhaPlanilha[] {
    throw new Error('não implementado');
  }

  export function validarLinhas(_linhas: LinhaPlanilha[]): { aprovadas: LinhaPlanilha[]; descartes: Descarte[] } {
    throw new Error('não implementado');
  }
  ```
- [ ] Escrever o teste de contrato `scripts/sync/validar.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { COLUNAS, lerLinhas, validarLinhas, type LinhaPlanilha } from './validar';

  const base: Omit<LinhaPlanilha, 'linha'> = {
    id: 'n1', titulo: 'Título', descricao: 'Desc', saiba_mais: 'Mais',
    imagem: 'https://drive.google.com/file/d/ABC123/view', veredito: 'falsa',
    explicacao: 'Expl', tecnica: 'fonte', fonte_url: 'https://exemplo.org',
    revisado_por: 'Ana', status: 'aprovada',
  };
  const l = (linha: number, over: Partial<LinhaPlanilha> = {}): LinhaPlanilha => ({ ...base, linha, ...over });

  describe('lerLinhas', () => {
    it('mapeia pelo cabeçalho, numera a partir da linha 2 e ignora linhas vazias', () => {
      const valores = [
        [...COLUNAS],
        COLUNAS.map((c) => (base as Record<string, string>)[c] ?? ''),
        [],
        ['', '', ''],
      ];
      const linhas = lerLinhas(valores);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({ linha: 2, id: 'n1', status: 'aprovada' });
    });

    it('apara espaços e normaliza enums para minúsculas', () => {
      const valores = [[...COLUNAS], COLUNAS.map((c) => {
        const v = (base as Record<string, string>)[c] ?? '';
        return c === 'status' ? ' Aprovada ' : c === 'veredito' ? 'FALSA' : v;
      })];
      expect(lerLinhas(valores)[0]).toMatchObject({ status: 'aprovada', veredito: 'falsa' });
    });
  });

  describe('validarLinhas', () => {
    it('aprova linha completa', () => {
      const r = validarLinhas([l(2)]);
      expect(r.aprovadas.map((x) => x.id)).toEqual(['n1']);
      expect(r.descartes).toEqual([]);
    });

    it.each([
      [{ status: 'rascunho' }, 'status não é "aprovada"'],
      [{ fonte_url: '' }, 'campo obrigatório vazio: fonte_url'],
      [{ revisado_por: '' }, 'campo obrigatório vazio: revisado_por'],
      [{ fonte_url: 'exemplo.org' }, 'fonte_url não é um link http(s) válido'],
      [{ veredito: 'talvez' }, 'veredito deve ser "verdadeira" ou "falsa"'],
      [{ tecnica: 'sorte' }, 'tecnica deve ser fonte, data, imagem ou contexto'],
      [{ id: 'com espaço' }, 'id só pode ter letras, números e hífen'],
      [{ titulo: 'x'.repeat(101) }, 'titulo com mais de 100 caracteres'],
      [{ descricao: 'x'.repeat(221) }, 'descricao com mais de 220 caracteres'],
      [{ saiba_mais: 'x'.repeat(1201) }, 'saiba_mais com mais de 1200 caracteres'],
      [{ imagem: 'https://exemplo.org/foto.jpg' }, 'imagem não é um link do Google Drive'],
    ])('descarta %o com motivo', (over, motivo) => {
      const r = validarLinhas([l(5, over as Partial<LinhaPlanilha>)]);
      expect(r.aprovadas).toEqual([]);
      expect(r.descartes).toEqual([{ linha: 5, id: (over as { id?: string }).id ?? 'n1', motivo }]);
    });

    it('descarta todas as linhas com id duplicado', () => {
      const r = validarLinhas([l(2), l(3), l(4, { id: 'n2' })]);
      expect(r.aprovadas.map((x) => x.id)).toEqual(['n2']);
      expect(r.descartes).toEqual([
        { linha: 2, id: 'n1', motivo: 'id duplicado' },
        { linha: 3, id: 'n1', motivo: 'id duplicado' },
      ]);
    });
  });
  ```
- [ ] Rodar `npm install`.
- [ ] Rodar `npx vitest run src/core/catalogo.test.ts scripts/sync/validar.test.ts`. Esperado: FAIL ("não implementado").
- [ ] Commit: `test: add contract tests for catalog and sheet validation`

---

## Phase 1: Validação do conteúdo

**Implements:** FR-6 (regras de coluna), FR-7 (regras de publicação) | **Satisfies:** AC-7.3 (regras de linha), AC-6.4 (catálogo vazio válido)
**Files:** `src/core/catalogo.ts`, `scripts/sync/validar.ts`
**Interfaces:** Consumes: tipos da Fase 0. Produces: `parseCatalogo` e `lerLinhas`/`validarLinhas` funcionando; `driveFileId(link: string): string | null` (exportado de `scripts/sync/validar.ts`).

Implementa os dois contratos da Fase 0.

- [ ] Implementar `src/core/catalogo.ts`:
  ```ts
  import { TECNICAS, VEREDITOS, type Catalogo, type Noticia } from './types';

  const CAMPOS_TEXTO = ['id', 'titulo', 'descricao', 'saibaMais', 'imagem', 'explicacao', 'fonteUrl'] as const;

  function invalido(motivo: string): never {
    throw new Error(`catálogo inválido: ${motivo}`);
  }

  function parseNoticia(n: unknown, i: number): Noticia {
    if (typeof n !== 'object' || n === null) invalido(`notícia ${i} não é objeto`);
    const o = n as Record<string, unknown>;
    for (const c of CAMPOS_TEXTO) {
      if (typeof o[c] !== 'string' || o[c] === '') invalido(`notícia ${i}: campo ${c}`);
    }
    if (!VEREDITOS.includes(o.veredito as never)) invalido(`notícia ${i}: veredito`);
    if (!TECNICAS.includes(o.tecnica as never)) invalido(`notícia ${i}: tecnica`);
    return o as unknown as Noticia;
  }

  export function parseCatalogo(json: unknown): Catalogo {
    if (typeof json !== 'object' || json === null) invalido('não é objeto');
    const o = json as Record<string, unknown>;
    if (typeof o.versao !== 'string') invalido('versao');
    if (!Array.isArray(o.noticias)) invalido('noticias');
    return { versao: o.versao, noticias: o.noticias.map(parseNoticia) };
  }
  ```
- [ ] Implementar `scripts/sync/validar.ts` (substitui o stub inteiro):
  ```ts
  export const COLUNAS = [
    'id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
    'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status',
  ] as const;
  export type Coluna = (typeof COLUNAS)[number];
  export type LinhaPlanilha = Record<Coluna, string> & { linha: number };
  export interface Descarte { linha: number; id: string; motivo: string }

  const ENUMS: readonly Coluna[] = ['veredito', 'tecnica', 'status'];
  const LIMITES: Partial<Record<Coluna, number>> = { titulo: 100, descricao: 220, saiba_mais: 1200 };

  export function driveFileId(link: string): string | null {
    const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{10,})/.exec(link);
    return m?.[1] ?? null;
  }

  export function lerLinhas(valores: string[][]): LinhaPlanilha[] {
    const [cabecalho = [], ...resto] = valores;
    const indice = new Map(cabecalho.map((h, i) => [h.trim().toLowerCase(), i]));
    const linhas: LinhaPlanilha[] = [];
    resto.forEach((cells, i) => {
      if (cells.every((c) => (c ?? '').trim() === '')) return;
      const linha = { linha: i + 2 } as LinhaPlanilha;
      for (const col of COLUNAS) {
        const pos = indice.get(col);
        let v = (pos === undefined ? '' : cells[pos] ?? '').trim();
        if (ENUMS.includes(col)) v = v.toLowerCase();
        linha[col] = v;
      }
      linhas.push(linha);
    });
    return linhas;
  }

  function motivo(l: LinhaPlanilha): string | null {
    if (l.status !== 'aprovada') return 'status não é "aprovada"';
    for (const col of COLUNAS) if (l[col] === '') return `campo obrigatório vazio: ${col}`;
    if (!/^[a-z0-9-]+$/i.test(l.id)) return 'id só pode ter letras, números e hífen';
    if (l.veredito !== 'verdadeira' && l.veredito !== 'falsa') return 'veredito deve ser "verdadeira" ou "falsa"';
    if (!['fonte', 'data', 'imagem', 'contexto'].includes(l.tecnica)) return 'tecnica deve ser fonte, data, imagem ou contexto';
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(l.fonte_url)) return 'fonte_url não é um link http(s) válido';
    for (const [col, max] of Object.entries(LIMITES) as [Coluna, number][]) {
      if (l[col].length > max) return `${col} com mais de ${max} caracteres`;
    }
    if (!driveFileId(l.imagem)) return 'imagem não é um link do Google Drive';
    return null;
  }

  export function validarLinhas(linhas: LinhaPlanilha[]): { aprovadas: LinhaPlanilha[]; descartes: Descarte[] } {
    const contagem = new Map<string, number>();
    for (const l of linhas) if (l.id) contagem.set(l.id, (contagem.get(l.id) ?? 0) + 1);
    const aprovadas: LinhaPlanilha[] = [];
    const descartes: Descarte[] = [];
    for (const l of linhas) {
      const m = (contagem.get(l.id) ?? 0) > 1 ? 'id duplicado' : motivo(l);
      if (m) descartes.push({ linha: l.linha, id: l.id, motivo: m });
      else aprovadas.push(l);
    }
    return { aprovadas, descartes };
  }
  ```
- [ ] Rodar `npx vitest run src/core/catalogo.test.ts scripts/sync/validar.test.ts`. Esperado: PASS.
- [ ] Commit: `feat(conteudo): validate catalog and sheet rows`

> **Complexity note:** Gate: Simplicidade (rastreabilidade). Violation: os limites de tamanho (100/220/1200) e a regra de formato do `id` não estão literalmente na spec. Justification: os limites são a única forma de garantir FR-4 ("não cortar título ou descrição em 1366×768"), e o formato do `id` é necessário para virar nome de arquivo de imagem (FR-7, "embutir as imagens"). Se a equipe de conteúdo precisar de textos maiores, ajustar `LIMITES` junto com o CSS da Fase 5.

---

## Phase 2: Script de publicação (planilha → catálogo + imagens)

**Implements:** FR-7 | **Satisfies:** AC-7.2 (geração), AC-7.3 (imagem inacessível + resumo), AC-7.5 (falha não publica)
**Files:** `scripts/sync/sincronizar.ts`, `scripts/sync/sincronizar.test.ts`, `scripts/sync/google.ts`, `scripts/sync/main.ts`, `scripts/fixture.ts`
**Interfaces:** Consumes: `lerLinhas`, `validarLinhas`, `driveFileId`, `Descarte` (Fase 1); `Catalogo`, `Noticia`, `Veredito`, `Tecnica` (Fase 0). Produces: `FonteConteudo`, `sincronizar(fonte: FonteConteudo, destino: string, agora?: Date): Promise<{ catalogo: Catalogo; descartes: Descarte[] }>`, `resumoMarkdown(r): string`; os comandos `npm run sync` (planilha real) e `npm run fixture` (12 notícias de teste em `public/content/`).

Lê a planilha, baixa e otimiza as imagens e escreve `public/content/noticias.json` mais `public/content/img/*.webp`. O acesso ao Google fica atrás de `FonteConteudo` para poder testar sem rede. Se a leitura da planilha falhar, o script lança erro: o workflow (Fase 6) para antes do deploy e o site antigo continua no ar.

- [ ] Escrever o teste `scripts/sync/sincronizar.test.ts`:
  ```ts
  import { mkdtemp, readFile, stat } from 'node:fs/promises';
  import { tmpdir } from 'node:os';
  import { join } from 'node:path';
  import sharp from 'sharp';
  import { describe, expect, it } from 'vitest';
  import { resumoMarkdown, sincronizar, type FonteConteudo } from './sincronizar';
  import { COLUNAS } from './validar';

  const linha = (id: string, over: Record<string, string> = {}) => {
    const v: Record<string, string> = {
      id, titulo: `Título ${id}`, descricao: 'Desc', saiba_mais: 'Mais',
      imagem: `https://drive.google.com/file/d/IMG_${id}_0000000/view`, veredito: 'verdadeira',
      explicacao: 'Expl', tecnica: 'data', fonte_url: 'https://exemplo.org', revisado_por: 'Ana',
      status: 'aprovada', ...over,
    };
    return COLUNAS.map((c) => v[c] ?? '');
  };

  async function png(): Promise<Buffer> {
    return sharp({ create: { width: 1600, height: 900, channels: 3, background: '#f00' } }).png().toBuffer();
  }

  describe('sincronizar', () => {
    it('gera catálogo, imagens webp ≤ 800px e lista descartes', async () => {
      const destino = await mkdtemp(join(tmpdir(), 'mds-'));
      const fonte: FonteConteudo = {
        lerValores: async () => [[...COLUNAS], linha('a'), linha('b', { status: 'rascunho' }), linha('c')],
        baixarImagem: async (fileId) => {
          if (fileId === 'IMG_c_0000000') throw new Error('403');
          return png();
        },
      };
      const r = await sincronizar(fonte, destino, new Date('2026-10-26T12:00:00Z'));

      expect(r.catalogo.noticias.map((n) => n.id)).toEqual(['a']);
      expect(r.catalogo.noticias[0]).toMatchObject({ imagem: 'content/img/a.webp', saibaMais: 'Mais', fonteUrl: 'https://exemplo.org' });
      expect(r.catalogo.noticias[0]).not.toHaveProperty('revisado_por');
      expect(r.descartes).toEqual([
        { linha: 3, id: 'b', motivo: 'status não é "aprovada"' },
        { linha: 4, id: 'c', motivo: 'imagem inacessível' },
      ]);

      const json = JSON.parse(await readFile(join(destino, 'noticias.json'), 'utf8'));
      expect(json).toEqual(r.catalogo);
      const meta = await sharp(join(destino, 'img', 'a.webp')).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(800);
      await expect(stat(join(destino, 'img', 'c.webp'))).rejects.toThrow();
    });

    it('propaga erro quando a planilha não pode ser lida', async () => {
      const destino = await mkdtemp(join(tmpdir(), 'mds-'));
      const fonte: FonteConteudo = {
        lerValores: async () => { throw new Error('planilha inacessível'); },
        baixarImagem: async () => png(),
      };
      await expect(sincronizar(fonte, destino)).rejects.toThrow('planilha inacessível');
      await expect(stat(join(destino, 'noticias.json'))).rejects.toThrow();
    });
  });

  describe('resumoMarkdown', () => {
    it('lista publicadas e descartes com motivo', () => {
      const md = resumoMarkdown({
        catalogo: { versao: 'v', noticias: [{ id: 'a' } as never] },
        descartes: [{ linha: 3, id: 'b', motivo: 'status não é "aprovada"' }],
      });
      expect(md).toContain('1 notícia(s) publicada(s)');
      expect(md).toContain('| 3 | b | status não é "aprovada" |');
    });
  });
  ```
- [ ] Rodar `npx vitest run scripts/sync/sincronizar.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] Implementar `scripts/sync/sincronizar.ts`:
  ```ts
  import { mkdir, rm, writeFile } from 'node:fs/promises';
  import { join } from 'node:path';
  import sharp from 'sharp';
  import type { Catalogo, Noticia, Tecnica, Veredito } from '../../src/core/types';
  import { driveFileId, lerLinhas, validarLinhas, type Descarte } from './validar';

  export interface FonteConteudo {
    lerValores(): Promise<string[][]>;
    baixarImagem(fileId: string): Promise<Buffer>;
  }

  export async function sincronizar(
    fonte: FonteConteudo,
    destino: string,
    agora: Date = new Date(),
  ): Promise<{ catalogo: Catalogo; descartes: Descarte[] }> {
    const valores = await fonte.lerValores();
    const { aprovadas, descartes } = validarLinhas(lerLinhas(valores));

    const dirImg = join(destino, 'img');
    await rm(dirImg, { recursive: true, force: true });
    await mkdir(dirImg, { recursive: true });

    const noticias: Noticia[] = [];
    for (const l of aprovadas) {
      try {
        const original = await fonte.baixarImagem(driveFileId(l.imagem)!);
        await sharp(original)
          .rotate()
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(join(dirImg, `${l.id}.webp`));
      } catch {
        descartes.push({ linha: l.linha, id: l.id, motivo: 'imagem inacessível' });
        continue;
      }
      noticias.push({
        id: l.id,
        titulo: l.titulo,
        descricao: l.descricao,
        saibaMais: l.saiba_mais,
        imagem: `content/img/${l.id}.webp`,
        veredito: l.veredito as Veredito,
        explicacao: l.explicacao,
        tecnica: l.tecnica as Tecnica,
        fonteUrl: l.fonte_url,
      });
    }
    descartes.sort((a, b) => a.linha - b.linha);

    const catalogo: Catalogo = { versao: agora.toISOString(), noticias };
    await writeFile(join(destino, 'noticias.json'), JSON.stringify(catalogo, null, 2));
    return { catalogo, descartes };
  }

  export function resumoMarkdown(r: { catalogo: Catalogo; descartes: Descarte[] }): string {
    const linhas = [
      '## Publicação do Match do Saber',
      '',
      `${r.catalogo.noticias.length} notícia(s) publicada(s). ${r.descartes.length} linha(s) não publicada(s).`,
    ];
    if (r.descartes.length > 0) {
      linhas.push('', '| Linha | id | Motivo |', '|---|---|---|');
      for (const d of r.descartes) linhas.push(`| ${d.linha} | ${d.id || '(vazio)'} | ${d.motivo} |`);
    }
    return linhas.join('\n') + '\n';
  }
  ```
- [ ] Rodar `npx vitest run scripts/sync/sincronizar.test.ts`. Esperado: PASS.
- [ ] Implementar `scripts/sync/google.ts` (adaptador real, sem teste automatizado, verificado na Fase 7):
  ```ts
  import { google } from 'googleapis';
  import type { FonteConteudo } from './sincronizar';

  export function fonteGoogle(credenciaisJson: string, sheetId: string): FonteConteudo {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credenciaisJson),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    return {
      async lerValores() {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'noticias!A1:K' });
        return (r.data.values ?? []) as string[][];
      },
      async baixarImagem(fileId) {
        const r = await drive.files.get(
          { fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'arraybuffer' },
        );
        return Buffer.from(r.data as ArrayBuffer);
      },
    };
  }
  ```
- [ ] Implementar `scripts/sync/main.ts`:
  ```ts
  import { appendFile } from 'node:fs/promises';
  import { fonteGoogle } from './google';
  import { resumoMarkdown, sincronizar } from './sincronizar';

  const credenciais = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const sheetId = process.env.SHEET_ID;
  if (!credenciais || !sheetId) {
    console.error('Defina GOOGLE_SERVICE_ACCOUNT_JSON e SHEET_ID.');
    process.exit(1);
  }

  try {
    const r = await sincronizar(fonteGoogle(credenciais, sheetId), 'public/content');
    const md = resumoMarkdown(r);
    console.log(md);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
  } catch (e) {
    const msg = `## Publicação falhou\n\n${(e as Error).message}\n\nO jogo publicado continua com o conteúdo anterior.\n`;
    console.error(msg);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, msg);
    process.exit(1);
  }
  ```
- [ ] Implementar `scripts/fixture.ts` (conteúdo de teste para dev/E2E, sem Google):
  ```ts
  import sharp from 'sharp';
  import { sincronizar } from './sync/sincronizar';
  import { COLUNAS } from './sync/validar';

  const tecnicas = ['fonte', 'data', 'imagem', 'contexto'];
  const cores = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261'];
  const linhas = Array.from({ length: 12 }, (_, i) => {
    const v: Record<string, string> = {
      id: `teste-${i + 1}`,
      titulo: `Notícia de teste ${i + 1}: manchete bombástica que você precisa ver`,
      descricao: 'Descrição curta de teste para o card, com até duas linhas de texto.',
      saiba_mais: 'Texto expandido de teste. '.repeat(8),
      imagem: `https://drive.google.com/file/d/FIXTURE_${i}_0000/view`,
      veredito: i % 2 === 0 ? 'verdadeira' : 'falsa',
      explicacao: `Explicação de teste ${i + 1}.`,
      tecnica: tecnicas[i % 4]!,
      fonte_url: 'https://exemplo.org/fonte',
      revisado_por: 'Equipe de teste',
      status: 'aprovada',
    };
    return COLUNAS.map((c) => v[c] ?? '');
  });

  const r = await sincronizar(
    {
      lerValores: async () => [[...COLUNAS], ...linhas],
      baixarImagem: async (id) => {
        const i = Number(id.split('_')[1]);
        return sharp({ create: { width: 800, height: 600, channels: 3, background: cores[i % 4]! } }).png().toBuffer();
      },
    },
    'public/content',
  );
  console.log(`Fixture: ${r.catalogo.noticias.length} notícias em public/content`);
  ```
- [ ] Rodar `npm run fixture`. Esperado: `Fixture: 12 notícias em public/content`.
- [ ] Commit: `feat(conteudo): sync sheet to static catalog with optimized images`

---

## Phase 3: Núcleo do jogo (sorteio + máquina de estados)

**Implements:** FR-1, FR-5 | **Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.6, AC-3.1 (pausa), AC-3.2, AC-3.3, AC-3.5, AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-5.1 (dados), AC-5.2, AC-5.3, AC-5.4, AC-5.5, AC-5.6, AC-6.1, AC-6.2, AC-6.3, AC-6.4
**Files:** `src/core/sorteio.ts`, `src/core/sorteio.test.ts`, `src/core/partida.ts`, `src/core/partida.test.ts`
**Interfaces:** Consumes: `Noticia`, `Veredito`, `Tecnica` (Fase 0). Produces: `sortear(noticias: Noticia[], rng: () => number, total?: number): Noticia[]`; de `src/core/partida.ts`: `TEMPOS`, `Resultado`, `Presenca`, `Partida`, `Estado`, `Evento`, `Contexto`, `ESTADO_INICIAL`, `reduzir(estado: Estado, evento: Evento, ctx: Contexto): Estado`, `pontos(p: Partida): number`, `tecnicasDaPartida(p: Partida): Tecnica[]`.

Toda a regra do jogo vira uma função pura dirigida por eventos (`tick` com dt e presença, `escolha`, `saibaMais`, `enter`), testável sem relógio nem câmera.

- [ ] Escrever `src/core/sorteio.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { sortear } from './sorteio';
  import type { Noticia, Veredito } from './types';

  const n = (id: string, veredito: Veredito): Noticia => ({
    id, veredito, titulo: id, descricao: '', saibaMais: '', imagem: '', explicacao: '', tecnica: 'fonte', fonteUrl: '',
  });
  const lote = (v: number, f: number) => [
    ...Array.from({ length: v }, (_, i) => n(`v${i}`, 'verdadeira')),
    ...Array.from({ length: f }, (_, i) => n(`f${i}`, 'falsa')),
  ];
  function rngSeed(seed: number) {
    return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
  }
  const conta = (cards: Noticia[]) => ({
    v: cards.filter((c) => c.veredito === 'verdadeira').length,
    f: cards.filter((c) => c.veredito === 'falsa').length,
    unicos: new Set(cards.map((c) => c.id)).size,
  });

  describe('sortear', () => {
    it('AC-6.1: 5 verdadeiras + 5 falsas sem repetição', () => {
      expect(conta(sortear(lote(8, 9), rngSeed(1)))).toEqual({ v: 5, f: 5, unicos: 10 });
    });
    it('AC-6.1: ordem aleatória (sementes diferentes geram ordens diferentes)', () => {
      const a = sortear(lote(8, 9), rngSeed(1)).map((c) => c.id).join();
      const b = sortear(lote(8, 9), rngSeed(2)).map((c) => c.id).join();
      expect(a).not.toBe(b);
    });
    it('AC-6.2: completa com o outro lado', () => {
      expect(conta(sortear(lote(3, 12), rngSeed(3)))).toEqual({ v: 3, f: 7, unicos: 10 });
    });
    it('AC-6.3: com menos de 10, usa todas', () => {
      expect(conta(sortear(lote(2, 4), rngSeed(4)))).toEqual({ v: 2, f: 4, unicos: 6 });
    });
    it('AC-6.4: sem notícias, partida vazia', () => {
      expect(sortear([], rngSeed(5))).toEqual([]);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/sorteio.test.ts`. Esperado: FAIL.
- [ ] Implementar `src/core/sorteio.ts`:
  ```ts
  import type { Noticia } from './types';

  function embaralhar<T>(itens: T[], rng: () => number): T[] {
    const a = [...itens];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  export function sortear(noticias: Noticia[], rng: () => number, total = 10): Noticia[] {
    const v = embaralhar(noticias.filter((x) => x.veredito === 'verdadeira'), rng);
    const f = embaralhar(noticias.filter((x) => x.veredito === 'falsa'), rng);
    const metade = Math.floor(total / 2);
    let nv = Math.min(v.length, metade);
    let nf = Math.min(f.length, total - metade);
    let falta = total - nv - nf;
    const extraV = Math.min(falta, v.length - nv);
    nv += extraV;
    falta -= extraV;
    nf += Math.min(falta, f.length - nf);
    return embaralhar([...v.slice(0, nv), ...f.slice(0, nf)], rng);
  }
  ```
- [ ] Rodar `npx vitest run src/core/sorteio.test.ts`. Esperado: PASS.
- [ ] Escrever `src/core/partida.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import {
    ESTADO_INICIAL, TEMPOS, pontos, reduzir, tecnicasDaPartida,
    type Contexto, type Estado, type Evento, type Presenca,
  } from './partida';
  import type { Noticia, Tecnica, Veredito } from './types';

  const n = (id: string, veredito: Veredito, tecnica: Tecnica = 'fonte'): Noticia => ({
    id, veredito, tecnica, titulo: id, descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '',
  });
  const noticias = [n('v1', 'verdadeira', 'data'), n('f1', 'falsa', 'fonte'), n('v2', 'verdadeira', 'data')];
  const ctx = (over: Partial<Contexto> = {}): Contexto => ({ noticias, rng: () => 0.5, cameraAtiva: true, ...over });

  const centro: Presenca = { presente: true, centralizado: true };
  const lado: Presenca = { presente: true, centralizado: false };
  const ninguem: Presenca = { presente: false, centralizado: false };
  const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });

  function rodar(estado: Estado, eventos: Evento[], c = ctx()): Estado {
    return eventos.reduce((s, e) => reduzir(s, e, c), estado);
  }
  const emCard = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }], c);
  function cardAtual(s: Estado) {
    if (s.tela !== 'card') throw new Error(`esperava card, veio ${s.tela}`);
    return s.partida.cards[s.indice]!;
  }

  describe('espera e calibração', () => {
    it('AC-1.1: pessoa no quadro leva à calibração', () => {
      expect(reduzir(ESTADO_INICIAL, tick(16, lado), ctx()).tela).toBe('calibracao');
    });
    it('AC-1.2: 2 s contínuos no centro iniciam a partida com 15 s', () => {
      const s = rodar(ESTADO_INICIAL, [tick(16), tick(1000), tick(1000)]);
      expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: TEMPOS.cardMs });
    });
    it('AC-1.3: sair do centro reinicia a contagem', () => {
      const s = rodar(ESTADO_INICIAL, [tick(16), tick(1500), tick(16, lado), tick(1500)]);
      expect(s).toMatchObject({ tela: 'calibracao', centradoMs: 1500 });
    });
    it('AC-1.4: 10 s sem ninguém na calibração volta à espera', () => {
      const s = rodar(ESTADO_INICIAL, [tick(16), tick(5000, ninguem), tick(5000, ninguem)]);
      expect(s.tela).toBe('espera');
    });
    it('AC-1.6: Enter na espera inicia sem calibração', () => {
      expect(emCard().tela).toBe('card');
    });
    it('AC-6.4: sem notícias, não inicia', () => {
      const c = ctx({ noticias: [] });
      expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16)], c).tela).toBe('espera');
    });
  });

  describe('card', () => {
    it('AC-4.1: acerto soma ponto e mostra feedback de 3 s', () => {
      const s0 = emCard();
      const s = reduzir(s0, { tipo: 'escolha', resposta: cardAtual(s0).veredito }, ctx());
      expect(s).toMatchObject({ tela: 'feedback', restanteMs: TEMPOS.feedbackMs });
      if (s.tela !== 'feedback') throw new Error();
      expect(s.partida.resultados).toEqual(['acerto']);
      expect(pontos(s.partida)).toBe(1);
    });
    it('AC-4.2: erro não soma ponto', () => {
      const s0 = emCard();
      const errada = cardAtual(s0).veredito === 'verdadeira' ? 'falsa' : 'verdadeira';
      const s = reduzir(s0, { tipo: 'escolha', resposta: errada }, ctx());
      if (s.tela !== 'feedback') throw new Error();
      expect(s.partida.resultados).toEqual(['erro']);
      expect(pontos(s.partida)).toBe(0);
    });
    it('AC-4.3: tempo esgotado registra "tempo"', () => {
      const s = rodar(emCard(), [tick(10000), tick(5000)]);
      if (s.tela !== 'feedback') throw new Error(s.tela);
      expect(s.partida.resultados).toEqual(['tempo']);
    });
    it('AC-4.4: depois do feedback vem o próximo card com 15 s; escolha no feedback é ignorada', () => {
      const s1 = reduzir(emCard(), { tipo: 'escolha', resposta: 'falsa' }, ctx());
      const s2 = reduzir(s1, { tipo: 'escolha', resposta: 'falsa' }, ctx());
      expect(s2).toBe(s1);
      expect(rodar(s1, [tick(3000)])).toMatchObject({ tela: 'card', indice: 1, restanteMs: TEMPOS.cardMs });
    });
    it('AC-3.1/AC-3.2: saiba mais pausa e retoma o cronômetro', () => {
      const s = rodar(emCard(), [tick(1000), { tipo: 'saibaMais' }, tick(3000)]);
      expect(s).toMatchObject({ saibaMais: true, restanteMs: 14000 });
      expect(rodar(s, [{ tipo: 'saibaMais' }, tick(1000)])).toMatchObject({ saibaMais: false, restanteMs: 13000 });
    });
    it('AC-3.3: escolha com saiba mais aberto registra normalmente', () => {
      const s = rodar(emCard(), [{ tipo: 'saibaMais' }, { tipo: 'escolha', resposta: 'falsa' }]);
      expect(s.tela).toBe('feedback');
    });
    it('AC-3.5: saiba mais fecha sozinho após 5 s', () => {
      const s = rodar(emCard(), [{ tipo: 'saibaMais' }, tick(4900)]);
      expect(s).toMatchObject({ saibaMais: true });
      expect(rodar(s, [tick(100)])).toMatchObject({ saibaMais: false, restanteMs: TEMPOS.cardMs });
    });
    it('AC-5.3/AC-5.4: sem pessoa pausa; voltando antes de 10 s continua do mesmo card', () => {
      const s = rodar(emCard(), [tick(1000), tick(4000, ninguem)]);
      expect(s).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: 14000 });
      expect(rodar(s, [tick(1000)])).toMatchObject({ tela: 'card', indice: 0, ausenteMs: null, restanteMs: 13000 });
    });
    it('AC-5.5: 10 s sem pessoa encerra e volta à espera', () => {
      expect(rodar(emCard(), [tick(6000, ninguem), tick(4000, ninguem)]).tela).toBe('espera');
    });
    it('câmera indisponível (presenca null) não pausa', () => {
      expect(rodar(emCard(), [tick(2000, null)])).toMatchObject({ restanteMs: 13000, ausenteMs: null });
    });
  });

  describe('resumo', () => {
    const jogarTudo = (c = ctx()) => {
      let s = emCard(c);
      for (let i = 0; i < 3; i++) s = rodar(s, [{ tipo: 'escolha', resposta: 'verdadeira' }, tick(3000)], c);
      return s;
    };
    it('AC-5.1: resumo com pontos e técnicas sem repetição', () => {
      const s = jogarTudo();
      if (s.tela !== 'resumo') throw new Error(s.tela);
      expect(pontos(s.partida)).toBe(2);
      expect(tecnicasDaPartida(s.partida).sort()).toEqual(['data', 'fonte']);
    });
    it('AC-5.2: resumo não expira', () => {
      expect(rodar(jogarTudo(), [tick(600000, ninguem)]).tela).toBe('resumo');
    });
    it('AC-5.6: Enter no resumo vai para a calibração (câmera ativa) ou inicia direto (sem câmera)', () => {
      expect(reduzir(jogarTudo(), { tipo: 'enter' }, ctx()).tela).toBe('calibracao');
      const semCamera = ctx({ cameraAtiva: false });
      const s = reduzir(jogarTudo(semCamera), { tipo: 'enter' }, semCamera);
      expect(s).toMatchObject({ tela: 'card', indice: 0 });
      if (s.tela !== 'card') throw new Error();
      expect(s.partida.resultados).toEqual([]);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/partida.test.ts`. Esperado: FAIL.
- [ ] Implementar `src/core/partida.ts`:
  ```ts
  import { sortear } from './sorteio';
  import type { Noticia, Tecnica, Veredito } from './types';

  export const TEMPOS = {
    cardMs: 15000,
    feedbackMs: 3000,
    calibracaoMs: 2000,
    ausenciaMs: 10000,
    saibaMaisOciosoMs: 5000,
  } as const;

  export type Resultado = 'acerto' | 'erro' | 'tempo';
  export interface Presenca { presente: boolean; centralizado: boolean }
  export interface Partida { cards: Noticia[]; resultados: Resultado[] }

  export type EstadoCard = {
    tela: 'card';
    partida: Partida;
    indice: number;
    restanteMs: number;
    saibaMais: boolean;
    saibaMaisOciosoMs: number;
    ausenteMs: number | null;
  };

  export type Estado =
    | { tela: 'espera' }
    | { tela: 'calibracao'; centradoMs: number; ausenteMs: number }
    | EstadoCard
    | { tela: 'feedback'; partida: Partida; indice: number; restanteMs: number }
    | { tela: 'resumo'; partida: Partida };

  export type Evento =
    | { tipo: 'tick'; dtMs: number; presenca: Presenca | null }
    | { tipo: 'escolha'; resposta: Veredito }
    | { tipo: 'saibaMais' }
    | { tipo: 'enter' };

  export interface Contexto { noticias: Noticia[]; rng: () => number; cameraAtiva: boolean }

  export const ESTADO_INICIAL: Estado = { tela: 'espera' };
  const CALIBRACAO: Estado = { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };

  function card(partida: Partida, indice: number): EstadoCard {
    return { tela: 'card', partida, indice, restanteMs: TEMPOS.cardMs, saibaMais: false, saibaMaisOciosoMs: 0, ausenteMs: null };
  }

  function iniciarPartida(ctx: Contexto): Estado {
    const cards = sortear(ctx.noticias, ctx.rng);
    return cards.length === 0 ? ESTADO_INICIAL : card({ cards, resultados: [] }, 0);
  }

  function registrar(e: EstadoCard, r: Resultado): Estado {
    return {
      tela: 'feedback',
      partida: { ...e.partida, resultados: [...e.partida.resultados, r] },
      indice: e.indice,
      restanteMs: TEMPOS.feedbackMs,
    };
  }

  export function reduzir(estado: Estado, evento: Evento, ctx: Contexto): Estado {
    switch (estado.tela) {
      case 'espera': {
        if (ctx.noticias.length === 0) return estado;
        if (evento.tipo === 'enter') return iniciarPartida(ctx);
        if (evento.tipo === 'tick' && evento.presenca?.presente) return CALIBRACAO;
        return estado;
      }
      case 'calibracao': {
        if (evento.tipo === 'enter') return iniciarPartida(ctx);
        if (evento.tipo !== 'tick') return estado;
        const p = evento.presenca;
        if (!p || !p.presente) {
          const ausenteMs = estado.ausenteMs + evento.dtMs;
          return ausenteMs >= TEMPOS.ausenciaMs ? ESTADO_INICIAL : { tela: 'calibracao', centradoMs: 0, ausenteMs };
        }
        if (!p.centralizado) return { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };
        const centradoMs = estado.centradoMs + evento.dtMs;
        return centradoMs >= TEMPOS.calibracaoMs ? iniciarPartida(ctx) : { tela: 'calibracao', centradoMs, ausenteMs: 0 };
      }
      case 'card': {
        if (evento.tipo === 'escolha') {
          const certo = evento.resposta === estado.partida.cards[estado.indice]!.veredito;
          return registrar(estado, certo ? 'acerto' : 'erro');
        }
        if (evento.tipo === 'saibaMais') return { ...estado, saibaMais: !estado.saibaMais, saibaMaisOciosoMs: 0 };
        if (evento.tipo !== 'tick') return estado;
        const p = evento.presenca;
        if (p && !p.presente) {
          const ausenteMs = (estado.ausenteMs ?? 0) + evento.dtMs;
          return ausenteMs >= TEMPOS.ausenciaMs ? ESTADO_INICIAL : { ...estado, ausenteMs };
        }
        const base: EstadoCard = { ...estado, ausenteMs: null };
        if (base.saibaMais) {
          const ocioso = base.saibaMaisOciosoMs + evento.dtMs;
          return ocioso >= TEMPOS.saibaMaisOciosoMs
            ? { ...base, saibaMais: false, saibaMaisOciosoMs: 0 }
            : { ...base, saibaMaisOciosoMs: ocioso };
        }
        const restanteMs = base.restanteMs - evento.dtMs;
        return restanteMs <= 0 ? registrar(base, 'tempo') : { ...base, restanteMs };
      }
      case 'feedback': {
        if (evento.tipo !== 'tick') return estado;
        const restanteMs = estado.restanteMs - evento.dtMs;
        if (restanteMs > 0) return { ...estado, restanteMs };
        const proximo = estado.indice + 1;
        return proximo < estado.partida.cards.length
          ? card(estado.partida, proximo)
          : { tela: 'resumo', partida: estado.partida };
      }
      case 'resumo': {
        if (evento.tipo !== 'enter') return estado;
        return ctx.cameraAtiva ? CALIBRACAO : iniciarPartida(ctx);
      }
    }
  }

  export function pontos(p: Partida): number {
    return p.resultados.filter((r) => r === 'acerto').length;
  }

  export function tecnicasDaPartida(p: Partida): Tecnica[] {
    return [...new Set(p.cards.slice(0, p.resultados.length).map((c) => c.tecnica))];
  }
  ```
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS.
- [ ] Commit: `feat(partida): game state machine, scoring and balanced draw`

---

## Phase 4: Interpretação de gestos

**Implements:** FR-2 (lógica) | **Satisfies:** AC-1.5, AC-2.1, AC-2.2, AC-2.3 (valor de inclinação), AC-2.4, AC-3.1 (gesto)
**Files:** `src/core/gestos.ts`, `src/core/gestos.test.ts`
**Interfaces:** Consumes: `Presenca` (`src/core/partida.ts`). Produces: `Ponto`, `Pose`, `Gesto`, `LeituraGesto`, `Interpretador`, `CONFIG_GESTOS`, `escolherJogador(poses: Pose[]): Pose | null`, `criarInterpretador(cfg?: typeof CONFIG_GESTOS): Interpretador` com `ler(pose: Pose | null, tMs: number): LeituraGesto` e `calibrar(): void`.

Converte landmarks normalizados (coordenadas cruas da câmera, sem espelhar) em presença, inclinação (-1..1) e gestos confirmados. Índices do MediaPipe Pose usados: 0 nariz, 11/12 ombros, 15/16 punhos.

- [ ] Escrever `src/core/gestos.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { criarInterpretador, escolherJogador, type Pose } from './gestos';

  /** Pose sintética: cxJogador é o centro do tronco do ponto de vista do jogador (0..1, espelhado). */
  function pose(cxJogador: number, opts: { largura?: number; maosAcima?: boolean } = {}): Pose {
    const largura = opts.largura ?? 0.2;
    const cx = 1 - cxJogador; // coordenada crua da câmera
    const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.6, visibility: 1 }));
    p[0] = { x: cx, y: 0.3, visibility: 1 };
    p[11] = { x: cx + largura / 2, y: 0.45, visibility: 1 };
    p[12] = { x: cx - largura / 2, y: 0.45, visibility: 1 };
    const yMao = opts.maosAcima ? 0.15 : 0.7;
    p[15] = { x: cx + largura, y: yMao, visibility: 1 };
    p[16] = { x: cx - largura, y: yMao, visibility: 1 };
    return p;
  }

  function sequencia(interp: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) {
    return passos.flatMap(([p, t]) => interp.ler(p, t).gestos);
  }

  describe('escolherJogador', () => {
    it('AC-1.5: escolhe a pessoa mais central e maior', () => {
      const canto = pose(0.1, { largura: 0.3 });
      const centralPequena = pose(0.5, { largura: 0.1 });
      const centralGrande = pose(0.55, { largura: 0.25 });
      expect(escolherJogador([canto, centralPequena, centralGrande])).toBe(centralGrande);
      expect(escolherJogador([])).toBeNull();
    });
  });

  describe('interpretador', () => {
    it('presença e centralização', () => {
      const i = criarInterpretador();
      expect(i.ler(null, 0).presenca).toEqual({ presente: false, centralizado: false });
      expect(i.ler(pose(0.5), 10).presenca).toEqual({ presente: true, centralizado: true });
      expect(i.ler(pose(0.8), 20).presenca).toEqual({ presente: true, centralizado: false });
    });

    it('AC-2.1: direita do jogador por 300 ms = "direita"', () => {
      const i = criarInterpretador();
      i.ler(pose(0.5), 0);
      i.calibrar();
      expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 300]])).toEqual([]);
      expect(sequencia(i, [[pose(0.7), 400]])).toEqual(['direita']);
    });

    it('AC-2.2: esquerda do jogador por 300 ms = "esquerda"', () => {
      const i = criarInterpretador();
      i.ler(pose(0.5), 0);
      i.calibrar();
      expect(sequencia(i, [[pose(0.3), 100], [pose(0.3), 450]])).toEqual(['esquerda']);
    });

    it('mede relativo à calibração', () => {
      const i = criarInterpretador();
      i.ler(pose(0.6), 0);
      i.calibrar();
      expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 500]])).toEqual([]);
    });

    it('AC-2.3: inclinação proporcional sem gesto abaixo do limiar', () => {
      const i = criarInterpretador();
      i.ler(pose(0.5), 0);
      i.calibrar();
      const l = i.ler(pose(0.56), 100);
      expect(l.inclinacao).toBeCloseTo(0.5, 1);
      expect(sequencia(i, [[pose(0.56), 1000]])).toEqual([]);
    });

    it('AC-2.4: exige voltar ao centro entre escolhas', () => {
      const i = criarInterpretador();
      i.ler(pose(0.5), 0);
      i.calibrar();
      expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 400]])).toEqual(['direita']);
      expect(sequencia(i, [[pose(0.7), 800], [pose(0.7), 1500]])).toEqual([]);
      expect(sequencia(i, [[pose(0.5), 1600], [pose(0.7), 1700], [pose(0.7), 2000]])).toEqual(['direita']);
    });

    it('AC-3.1: duas mãos acima do nariz por 500 ms = "maosParaCima", uma vez por levantada', () => {
      const i = criarInterpretador();
      const g = sequencia(i, [
        [pose(0.5, { maosAcima: true }), 0],
        [pose(0.5, { maosAcima: true }), 400],
        [pose(0.5, { maosAcima: true }), 500],
        [pose(0.5, { maosAcima: true }), 2000],
      ]);
      expect(g).toEqual(['maosParaCima']);
      expect(sequencia(i, [[pose(0.5), 2100], [pose(0.5, { maosAcima: true }), 2200], [pose(0.5, { maosAcima: true }), 2700]]))
        .toEqual(['maosParaCima']);
    });

    it('perder a pessoa zera a contagem', () => {
      const i = criarInterpretador();
      i.ler(pose(0.5), 0);
      i.calibrar();
      expect(sequencia(i, [[pose(0.7), 100], [null, 200], [pose(0.7), 300], [pose(0.7), 500]])).toEqual([]);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/gestos.test.ts`. Esperado: FAIL.
- [ ] Implementar `src/core/gestos.ts`:
  ```ts
  import type { Presenca } from './partida';

  export interface Ponto { x: number; y: number; visibility?: number }
  export type Pose = Ponto[];
  export type Gesto = 'direita' | 'esquerda' | 'maosParaCima';
  export interface LeituraGesto { presenca: Presenca; inclinacao: number; gestos: Gesto[] }
  export interface Interpretador { ler(pose: Pose | null, tMs: number): LeituraGesto; calibrar(): void }

  export const CONFIG_GESTOS = {
    limiar: 0.12,
    zonaRetorno: 0.05,
    zonaCalibracao: 0.1,
    permanenciaLadoMs: 300,
    permanenciaMaosMs: 500,
  };

  const NARIZ = 0, OMBRO_E = 11, OMBRO_D = 12, PUNHO_E = 15, PUNHO_D = 16;

  /** Centro do tronco do ponto de vista do jogador (imagem espelhada) e largura dos ombros. */
  function medir(p: Pose): { cx: number; largura: number } {
    const a = p[OMBRO_E]!, b = p[OMBRO_D]!;
    return { cx: 1 - (a.x + b.x) / 2, largura: Math.abs(a.x - b.x) };
  }

  export function escolherJogador(poses: Pose[]): Pose | null {
    let melhor: Pose | null = null;
    let nota = -Infinity;
    for (const p of poses) {
      const { cx, largura } = medir(p);
      const n = largura * (1 - Math.abs(cx - 0.5));
      if (n > nota) { nota = n; melhor = p; }
    }
    return melhor;
  }

  export function criarInterpretador(cfg = CONFIG_GESTOS): Interpretador {
    let centro: number | null = null;
    let ultimoCx = 0.5;
    let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
    let travadoLado = false;
    let maosDesde: number | null = null;
    let travadoMaos = false;

    return {
      calibrar() {
        centro = ultimoCx;
      },
      ler(pose, tMs) {
        if (!pose) {
          lado = null;
          maosDesde = null;
          return { presenca: { presente: false, centralizado: false }, inclinacao: 0, gestos: [] };
        }
        const gestos: Gesto[] = [];
        const { cx } = medir(pose);
        ultimoCx = cx;
        const d = cx - (centro ?? 0.5);
        const inclinacao = Math.max(-1, Math.min(1, d / cfg.limiar));

        if (travadoLado) {
          if (Math.abs(d) < cfg.zonaRetorno) travadoLado = false;
        } else {
          const dir = d > cfg.limiar ? 'direita' : d < -cfg.limiar ? 'esquerda' : null;
          if (!dir) lado = null;
          else if (lado?.gesto !== dir) lado = { gesto: dir, desde: tMs };
          else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
            gestos.push(dir);
            travadoLado = true;
            lado = null;
          }
        }

        const nariz = pose[NARIZ]!.y;
        const maosAcima = pose[PUNHO_E]!.y < nariz && pose[PUNHO_D]!.y < nariz;
        if (!maosAcima) {
          maosDesde = null;
          travadoMaos = false;
        } else if (maosDesde === null) {
          maosDesde = tMs;
        } else if (!travadoMaos && tMs - maosDesde >= cfg.permanenciaMaosMs) {
          gestos.push('maosParaCima');
          travadoMaos = true;
        }

        return {
          presenca: { presente: true, centralizado: Math.abs(cx - 0.5) < cfg.zonaCalibracao },
          inclinacao,
          gestos,
        };
      },
    };
  }
  ```
- [ ] Rodar `npx vitest run src/core/gestos.test.ts`. Esperado: PASS.
- [ ] Commit: `feat(gestos): body gesture interpreter with calibration and hysteresis`

---

## Phase 5: App (telas, câmera, teclado e mouse)

**Implements:** FR-2 (adaptador + feedback visual), FR-3, FR-4, FR-1 (UI) | **Satisfies:** AC-2.3 (inclinação visível), AC-2.5, AC-2.6, AC-3.4, AC-4.1/4.2/4.3 (conteúdo do feedback), AC-5.1 (tela), AC-6.4 (mensagem); cenários de erro de câmera
**Files:** `src/main.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `src/app/Telas.tsx`, `src/app/CameraPreview.tsx`, `src/app/rastreador.ts`, `src/app/useJogo.ts`, `src/app/Telas.test.tsx`, `scripts/preparar-assets.ts`, `public/icons/icon.svg`, `playwright.config.ts`, `tests/e2e/partida.spec.ts`
**Interfaces:** Consumes: `parseCatalogo` (Fase 1); `reduzir`, `ESTADO_INICIAL`, `Estado`, `Evento`, `pontos`, `tecnicasDaPartida`, `TEMPOS` (Fase 3); `criarInterpretador`, `escolherJogador`, `Pose`, `Gesto` (Fase 4); `TECNICA_ROTULO`, `Noticia` (Fase 0). Produces: o app jogável em `npm run dev`; `criarRastreador(): Promise<Rastreador>` e `abrirCamera(video: HTMLVideoElement): Promise<MediaStream>` (`src/app/rastreador.ts`).

Liga o núcleo à UI. Um único loop `requestAnimationFrame` gera os `tick`s, com presença vinda da câmera, ou `null` sem câmera. A inclinação do card é aplicada direto no estilo, por ref, sem passar pelo estado.

- [ ] Criar `scripts/preparar-assets.ts` (copia o WASM, baixa o modelo e gera os ícones; é idempotente):
  ```ts
  import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
  import sharp from 'sharp';

  const MODELO_URL =
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
  const existe = (p: string) => stat(p).then(() => true, () => false);

  await mkdir('public/mediapipe', { recursive: true });
  await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe/wasm', { recursive: true });

  const modelo = 'public/mediapipe/pose_landmarker_lite.task';
  if (!(await existe(modelo))) {
    const r = await fetch(MODELO_URL);
    if (!r.ok) throw new Error(`falha ao baixar modelo: ${r.status}`);
    await writeFile(modelo, Buffer.from(await r.arrayBuffer()));
  }

  for (const tam of [192, 512]) {
    await sharp('public/icons/icon.svg').resize(tam, tam).png().toFile(`public/icons/icon-${tam}.png`);
  }
  console.log('assets prontos');
  ```
- [ ] Criar `public/icons/icon.svg`:
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="96" fill="#1b1035"/>
    <path d="M256 400 120 270a80 80 0 0 1 136-110 80 80 0 0 1 136 110Z" fill="#ff4f7b"/>
    <path d="m200 255 40 40 80-90" fill="none" stroke="#fff" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  ```
- [ ] Rodar `npm run prepare-assets`. Esperado: `assets prontos`, com `public/mediapipe/wasm/vision_wasm_internal.wasm` e `public/mediapipe/pose_landmarker_lite.task` criados.
- [ ] Criar `src/app/rastreador.ts` (adaptador do MediaPipe, verificado manualmente na Fase 7):
  ```ts
  import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
  import type { Pose } from '../core/gestos';

  export interface Rastreador { detectar(video: HTMLVideoElement, tMs: number): Pose[]; fechar(): void }

  export async function criarRastreador(): Promise<Rastreador> {
    const base = import.meta.env.BASE_URL;
    const vision = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    const criar = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${base}mediapipe/pose_landmarker_lite.task`, delegate },
        runningMode: 'VIDEO',
        numPoses: 3,
      });
    const landmarker = await criar('GPU').catch(() => criar('CPU'));
    let ultimo = -1;
    return {
      detectar(video, tMs) {
        const t = Math.max(tMs, ultimo + 1);
        ultimo = t;
        return landmarker.detectForVideo(video, t).landmarks;
      },
      fechar() {
        landmarker.close();
      },
    };
  }

  export async function abrirCamera(video: HTMLVideoElement): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    return stream;
  }
  ```
- [ ] Criar `src/app/useJogo.ts`:
  ```ts
  import { useEffect, useReducer, useRef, useState } from 'react';
  import { criarInterpretador, escolherJogador, type Gesto, type Pose } from '../core/gestos';
  import { ESTADO_INICIAL, reduzir, type Contexto, type Estado, type Evento } from '../core/partida';
  import type { Noticia } from '../core/types';
  import { abrirCamera, criarRastreador, type Rastreador } from './rastreador';

  export type StatusCamera = 'carregando' | 'ativa' | 'negada' | 'indisponivel';

  const EVENTO_DO_GESTO: Record<Gesto, Evento> = {
    direita: { tipo: 'escolha', resposta: 'verdadeira' },
    esquerda: { tipo: 'escolha', resposta: 'falsa' },
    maosParaCima: { tipo: 'saibaMais' },
  };

  const EVENTO_DA_TECLA: Record<string, Evento | undefined> = {
    ArrowRight: EVENTO_DO_GESTO.direita,
    ArrowLeft: EVENTO_DO_GESTO.esquerda,
    ArrowUp: EVENTO_DO_GESTO.maosParaCima,
    Enter: { tipo: 'enter' },
  };

  export function useJogo(noticias: Noticia[]) {
    const [camera, setCamera] = useState<StatusCamera>('carregando');
    const ctx = useRef<Contexto>({ noticias, rng: Math.random, cameraAtiva: false });
    ctx.current = { noticias, rng: Math.random, cameraAtiva: camera === 'ativa' };
    const [estado, despachar] = useReducer((s: Estado, e: Evento) => reduzir(s, e, ctx.current), ESTADO_INICIAL);

    const videoRef = useRef<HTMLVideoElement>(null);
    const inclinacaoRef = useRef(0);
    const poseRef = useRef<Pose | null>(null);
    const interp = useRef(criarInterpretador());
    const rastreador = useRef<Rastreador | null>(null);
    const telaAnterior = useRef(estado.tela);

    // Calibra o centro ao sair da calibração para o primeiro card.
    useEffect(() => {
      if (telaAnterior.current === 'calibracao' && estado.tela === 'card') interp.current.calibrar();
      telaAnterior.current = estado.tela;
    }, [estado.tela]);

    // Câmera + modelo.
    useEffect(() => {
      let stream: MediaStream | null = null;
      let cancelado = false;
      (async () => {
        const video = videoRef.current;
        if (!video || !navigator.mediaDevices?.getUserMedia) return setCamera('negada');
        try {
          stream = await abrirCamera(video);
        } catch {
          return setCamera('negada');
        }
        try {
          const r = await criarRastreador();
          if (cancelado) return r.fechar();
          rastreador.current = r;
          stream.getVideoTracks()[0]?.addEventListener('ended', () => {
            rastreador.current = null;
            setCamera('indisponivel');
          });
          setCamera('ativa');
        } catch {
          setCamera('indisponivel');
        }
      })();
      return () => {
        cancelado = true;
        stream?.getTracks().forEach((t) => t.stop());
        rastreador.current?.fechar();
      };
    }, []);

    // Loop único: tick por quadro.
    useEffect(() => {
      let raf = 0;
      let anterior = performance.now();
      const quadro = (agora: number) => {
        const dtMs = Math.min(agora - anterior, 100);
        anterior = agora;
        const video = videoRef.current;
        const r = rastreador.current;
        if (r && video && video.readyState >= 2) {
          const pose = escolherJogador(r.detectar(video, agora));
          poseRef.current = pose;
          const leitura = interp.current.ler(pose, agora);
          inclinacaoRef.current = leitura.inclinacao;
          despachar({ tipo: 'tick', dtMs, presenca: leitura.presenca });
          for (const g of leitura.gestos) despachar(EVENTO_DO_GESTO[g]);
        } else {
          poseRef.current = null;
          inclinacaoRef.current = 0;
          despachar({ tipo: 'tick', dtMs, presenca: null });
        }
        raf = requestAnimationFrame(quadro);
      };
      raf = requestAnimationFrame(quadro);
      return () => cancelAnimationFrame(raf);
    }, []);

    // Teclado (FR-3).
    useEffect(() => {
      const tecla = (e: KeyboardEvent) => {
        const ev = EVENTO_DA_TECLA[e.key];
        if (ev) {
          e.preventDefault();
          despachar(ev);
        }
      };
      window.addEventListener('keydown', tecla);
      return () => window.removeEventListener('keydown', tecla);
    }, []);

    return { estado, despachar, camera, videoRef, inclinacaoRef, poseRef };
  }
  ```
- [ ] Criar `src/app/CameraPreview.tsx` (AC-2.6):
  ```tsx
  import { useEffect, useRef, type RefObject } from 'react';
  import type { Pose } from '../core/gestos';
  import s from './App.module.css';

  const OSSOS: [number, number][] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

  export function CameraPreview({ videoRef, poseRef, visivel }: {
    videoRef: RefObject<HTMLVideoElement>;
    poseRef: RefObject<Pose | null>;
    visivel: boolean;
  }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      let raf = 0;
      const desenhar = () => {
        const c = canvas.current;
        const g = c?.getContext('2d');
        if (c && g) {
          g.clearRect(0, 0, c.width, c.height);
          const p = poseRef.current;
          if (p) {
            g.strokeStyle = '#7cff6b';
            g.lineWidth = 3;
            for (const [a, b] of OSSOS) {
              const pa = p[a], pb = p[b];
              if (!pa || !pb) continue;
              g.beginPath();
              g.moveTo(pa.x * c.width, pa.y * c.height);
              g.lineTo(pb.x * c.width, pb.y * c.height);
              g.stroke();
            }
          }
        }
        raf = requestAnimationFrame(desenhar);
      };
      raf = requestAnimationFrame(desenhar);
      return () => cancelAnimationFrame(raf);
    }, [poseRef]);

    return (
      <div className={s.preview} hidden={!visivel} aria-hidden>
        <video ref={videoRef} muted playsInline />
        <canvas ref={canvas} width={320} height={180} />
      </div>
    );
  }
  ```
  O `video` e o `canvas` são espelhados via CSS (`transform: scaleX(-1)`), então o esqueleto é desenhado em coordenadas cruas e aparece espelhado junto com a imagem.
- [ ] Escrever o teste de componentes `src/app/Telas.test.tsx`:
  ```tsx
  // @vitest-environment jsdom
  import { render, screen } from '@testing-library/react';
  import { describe, expect, it } from 'vitest';
  import type { Noticia } from '../core/types';
  import { TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';

  const noticia: Noticia = {
    id: 'n1', titulo: 'Título X', descricao: 'Descrição Y', saibaMais: 'Mais Z', imagem: 'content/img/n1.webp',
    veredito: 'falsa', explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
  };

  describe('telas', () => {
    it('AC-6.4: espera sem notícias', () => {
      render(<TelaEspera semNoticias camera="ativa" />);
      expect(screen.getByText('Nenhuma notícia publicada')).toBeInTheDocument();
    });
    it('espera com câmera negada orienta a usar as setas', () => {
      render(<TelaEspera semNoticias={false} camera="negada" />);
      expect(screen.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeInTheDocument();
    });
    it('FR-4: card mostra imagem, título, descrição, cronômetro e dica do saiba mais', () => {
      const { container } = render(<TelaCard noticia={noticia} restanteMs={14200} saibaMais={false} ausente={false} cardRef={{ current: null }} onArrastar={() => {}} />);
      expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
      expect(screen.getByText('Título X')).toBeInTheDocument();
      expect(screen.getByText('Descrição Y')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText(/Saiba mais/)).toBeInTheDocument();
    });
    it('AC-3.1: saiba mais aberto mostra o texto expandido', () => {
      render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais ausente={false} cardRef={{ current: null }} onArrastar={() => {}} />);
      expect(screen.getByText('Mais Z')).toBeInTheDocument();
    });
    it('AC-5.3: ausente mostra "Volte para o centro"', () => {
      render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente cardRef={{ current: null }} onArrastar={() => {}} />);
      expect(screen.getByText('Volte para o centro')).toBeInTheDocument();
    });
    it.each([
      ['acerto', 'Acertou!'],
      ['erro', 'Errou'],
      ['tempo', 'Tempo esgotado'],
    ] as const)('AC-4.x: feedback %s mostra selo, veredito, explicação e técnica', (resultado, selo) => {
      render(<TelaFeedback noticia={noticia} resultado={resultado} />);
      expect(screen.getByText(selo)).toBeInTheDocument();
      expect(screen.getByText('É falsa')).toBeInTheDocument();
      expect(screen.getByText('Explicação W')).toBeInTheDocument();
      expect(screen.getByText('Verificar a imagem')).toBeInTheDocument();
    });
    it('AC-5.1: resumo com "N de M" e técnicas', () => {
      render(<TelaResumo pontos={7} total={10} tecnicas={['fonte', 'data']} />);
      expect(screen.getByText('7 de 10')).toBeInTheDocument();
      expect(screen.getByText('Checar a fonte')).toBeInTheDocument();
      expect(screen.getByText('Conferir a data')).toBeInTheDocument();
    });
  });
  ```
- [ ] Rodar `npx vitest run src/app`. Esperado: FAIL (módulo `./Telas` inexistente).
- [ ] Implementar `src/app/Telas.tsx`:
  ```tsx
  import { useRef, type RefObject } from 'react';
  import type { Resultado } from '../core/partida';
  import { TECNICA_ROTULO, type Noticia, type Tecnica } from '../core/types';
  import type { StatusCamera } from './useJogo';
  import s from './App.module.css';

  const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
  const src = (caminho: string) => `${import.meta.env.BASE_URL}${caminho}`;

  export function TelaEspera({ semNoticias, camera }: { semNoticias: boolean; camera: StatusCamera }) {
    return (
      <main className={s.centro}>
        <h1 className={s.logo}>Match do Saber</h1>
        {semNoticias ? (
          <p className={s.aviso}>Nenhuma notícia publicada</p>
        ) : camera === 'negada' || camera === 'indisponivel' ? (
          <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
        ) : (
          <p className={s.chamada}>Chegue mais perto e fique de frente para a câmera para jogar</p>
        )}
      </main>
    );
  }

  export function TelaCalibracao({ progresso }: { progresso: number }) {
    return (
      <main className={s.centro}>
        <p className={s.chamada}>Fique no centro</p>
        <div className={s.barra}><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
        <p className={s.dica}>Direita: é verdade · Esquerda: é falsa · Duas mãos para cima: saiba mais</p>
      </main>
    );
  }

  export function TelaCard({ noticia, restanteMs, saibaMais, ausente, cardRef, onArrastar }: {
    noticia: Noticia;
    restanteMs: number;
    saibaMais: boolean;
    ausente: boolean;
    cardRef: RefObject<HTMLElement>;
    onArrastar: (lado: 'direita' | 'esquerda') => void;
  }) {
    const inicioX = useRef<number | null>(null);
    return (
      <main className={s.mesa}>
        <div className={s.lado}>✗ Falsa</div>
        <article
          ref={cardRef}
          className={s.card}
          onPointerDown={(e) => { inicioX.current = e.clientX; }}
          onPointerUp={(e) => {
            if (inicioX.current === null) return;
            const dx = e.clientX - inicioX.current;
            inicioX.current = null;
            if (dx > 100) onArrastar('direita');
            else if (dx < -100) onArrastar('esquerda');
          }}
        >
          <div className={s.cronometro}>{Math.ceil(restanteMs / 1000)}</div>
          {saibaMais ? (
            <div className={s.saibaMais}>
              <h2>{noticia.titulo}</h2>
              <p>{noticia.saibaMais}</p>
            </div>
          ) : (
            <>
              <img src={src(noticia.imagem)} alt="" draggable={false} />
              <h2>{noticia.titulo}</h2>
              <p>{noticia.descricao}</p>
              <p className={s.dica}>🙌 Saiba mais: levante as duas mãos (ou ↑)</p>
            </>
          )}
        </article>
        <div className={s.lado}>Verdade ✓</div>
        {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
      </main>
    );
  }

  export function TelaFeedback({ noticia, resultado }: { noticia: Noticia; resultado: Resultado }) {
    return (
      <main className={s.centro}>
        <p className={`${s.selo} ${s[resultado]}`}>{SELO[resultado]}</p>
        <h2>{noticia.veredito === 'verdadeira' ? 'É verdadeira' : 'É falsa'}</h2>
        <p className={s.explicacao}>{noticia.explicacao}</p>
        <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      </main>
    );
  }

  export function TelaResumo({ pontos, total, tecnicas }: { pontos: number; total: number; tecnicas: Tecnica[] }) {
    return (
      <main className={s.centro}>
        <h1>Fim de jogo!</h1>
        <p className={s.placar}>{`${pontos} de ${total}`}</p>
        <h2>Técnicas que você praticou</h2>
        <ul className={s.tecnicas}>{tecnicas.map((t) => <li key={t}>{TECNICA_ROTULO[t]}</li>)}</ul>
        <p className={s.dica}>Operador: Enter para a próxima partida</p>
      </main>
    );
  }
  ```
- [ ] Implementar `src/app/App.tsx`:
  ```tsx
  import { useEffect, useRef, useState } from 'react';
  import { parseCatalogo } from '../core/catalogo';
  import { TEMPOS, pontos, tecnicasDaPartida } from '../core/partida';
  import type { Noticia } from '../core/types';
  import { CameraPreview } from './CameraPreview';
  import { TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';
  import { useJogo } from './useJogo';
  import s from './App.module.css';

  export function App() {
    const [noticias, setNoticias] = useState<Noticia[] | null>(null);
    const [erro, setErro] = useState(false);

    useEffect(() => {
      fetch(`${import.meta.env.BASE_URL}content/noticias.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j) => setNoticias(parseCatalogo(j).noticias))
        .catch((e) => {
          console.error(e);
          setErro(true);
        });
    }, []);

    if (erro) return <main className={s.centro}><p className={s.aviso}>Conecte à internet uma vez para baixar o jogo</p></main>;
    if (!noticias) return <main className={s.centro}><p>Carregando…</p></main>;
    return <Jogo noticias={noticias} />;
  }

  function Jogo({ noticias }: { noticias: Noticia[] }) {
    const { estado, despachar, camera, videoRef, inclinacaoRef, poseRef } = useJogo(noticias);
    const cardRef = useRef<HTMLElement>(null);

    // Inclinação do card acompanhando o corpo (AC-2.3), fora do ciclo de render.
    useEffect(() => {
      let raf = 0;
      const aplicar = () => {
        const el = cardRef.current;
        if (el) el.style.transform = `translateX(${inclinacaoRef.current * 60}px) rotate(${inclinacaoRef.current * 12}deg)`;
        raf = requestAnimationFrame(aplicar);
      };
      raf = requestAnimationFrame(aplicar);
      return () => cancelAnimationFrame(raf);
    }, [inclinacaoRef]);

    let tela;
    switch (estado.tela) {
      case 'espera':
        tela = <TelaEspera semNoticias={noticias.length === 0} camera={camera} />;
        break;
      case 'calibracao':
        tela = <TelaCalibracao progresso={estado.centradoMs / TEMPOS.calibracaoMs} />;
        break;
      case 'card':
        tela = (
          <TelaCard
            key={estado.indice}
            noticia={estado.partida.cards[estado.indice]!}
            restanteMs={estado.restanteMs}
            saibaMais={estado.saibaMais}
            ausente={estado.ausenteMs !== null}
            cardRef={cardRef}
            onArrastar={(lado) => despachar({ tipo: 'escolha', resposta: lado === 'direita' ? 'verdadeira' : 'falsa' })}
          />
        );
        break;
      case 'feedback':
        tela = <TelaFeedback noticia={estado.partida.cards[estado.indice]!} resultado={estado.partida.resultados[estado.indice]!} />;
        break;
      case 'resumo':
        tela = <TelaResumo pontos={pontos(estado.partida)} total={estado.partida.cards.length} tecnicas={tecnicasDaPartida(estado.partida)} />;
        break;
    }

    return (
      <div className={s.app}>
        {tela}
        {camera === 'indisponivel' && estado.tela !== 'espera' && (
          <p className={s.faixa}>Câmera indisponível — use as setas</p>
        )}
        <CameraPreview videoRef={videoRef} poseRef={poseRef} visivel={camera === 'ativa'} />
      </div>
    );
  }
  ```
- [ ] Implementar `src/main.tsx`:
  ```tsx
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from './app/App';

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  ```
- [ ] Implementar `src/app/App.module.css` (sem cortar texto, FR-4; tipografia fluida para 1366×768+):
  ```css
  :global(html, body, #root) { margin: 0; height: 100%; }
  :global(body) { background: #1b1035; color: #fff; font-family: system-ui, sans-serif; overflow: hidden; }
  .app { height: 100%; position: relative; }
  .centro { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1rem; padding: 2rem; box-sizing: border-box; }
  .logo { font-size: clamp(3rem, 7vw, 6rem); margin: 0; color: #ff4f7b; }
  .chamada { font-size: clamp(1.5rem, 3vw, 2.5rem); }
  .aviso { font-size: clamp(1.25rem, 2.5vw, 2rem); background: #3a2470; padding: 1rem 2rem; border-radius: 1rem; }
  .dica { opacity: 0.8; font-size: 1.1rem; }
  .barra { width: 40vw; height: 1rem; background: #3a2470; border-radius: 1rem; overflow: hidden; }
  .barra > div { height: 100%; background: #7cff6b; transition: width 0.1s linear; }
  .mesa { height: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; justify-items: center; }
  .lado { font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; opacity: 0.7; }
  .card { position: relative; width: min(34rem, 42vw); max-height: 92vh; background: #fff; color: #1b1035; border-radius: 1.5rem; padding: 1.25rem; box-sizing: border-box; display: flex; flex-direction: column; gap: 0.5rem; touch-action: none; user-select: none; transition: transform 0.08s linear; }
  .card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 1rem; }
  .card h2 { margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.75rem); line-height: 1.2; overflow-wrap: anywhere; }
  .card p { margin: 0; font-size: clamp(1rem, 1.5vw, 1.2rem); overflow-wrap: anywhere; }
  .saibaMais { overflow-y: auto; max-height: 80vh; }
  .cronometro { position: absolute; top: -1rem; right: -1rem; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #ff4f7b; color: #fff; display: grid; place-items: center; font-size: 1.5rem; font-weight: 700; }
  .sobreposicao { position: absolute; inset: 0; background: rgb(27 16 53 / 0.85); display: grid; place-items: center; font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; }
  .selo { font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 800; margin: 0; }
  .acerto { color: #7cff6b; }
  .erro { color: #ff4f7b; }
  .tempo { color: #ffd166; }
  .explicacao { font-size: clamp(1.25rem, 2.2vw, 1.75rem); max-width: 60rem; }
  .tecnica { background: #3a2470; padding: 0.5rem 1.25rem; border-radius: 2rem; font-size: 1.25rem; }
  .placar { font-size: clamp(3rem, 8vw, 6rem); font-weight: 800; margin: 0; }
  .tecnicas { list-style: none; padding: 0; display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; font-size: 1.25rem; }
  .faixa { position: absolute; top: 0; left: 0; right: 0; margin: 0; background: #ffd166; color: #1b1035; text-align: center; padding: 0.5rem; font-weight: 700; }
  .preview { position: absolute; right: 1rem; bottom: 1rem; width: 320px; height: 180px; border-radius: 0.75rem; overflow: hidden; border: 3px solid #fff; }
  .preview video, .preview canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  ```
- [ ] Rodar `npx vitest run src/app`. Esperado: PASS.
- [ ] Criar `playwright.config.ts`:
  ```ts
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testDir: 'tests/e2e',
    use: { baseURL: 'http://localhost:4173', viewport: { width: 1366, height: 768 } },
    webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
  });
  ```
- [ ] Escrever `tests/e2e/partida.spec.ts` (partida inteira sem câmera, pela entrada alternativa):
  ```ts
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
    await page.keyboard.press('Enter');
    const card = page.locator('article');
    const caixa = (await card.boundingBox())!;
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(768);
    const cortado = await card.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(cortado).toBe(false);
  });
  ```
- [ ] Rodar `npm run e2e`. Esperado: 4 passed.
- [ ] Commit: `feat(app): screens, camera pipeline and keyboard/pointer input`

---

## Phase 6: Instalável, offline e publicação

**Implements:** FR-8, FR-6 (planilha configurada + menu), FR-7 (disparo + deploy) | **Satisfies:** AC-7.1, AC-7.2, AC-7.4, AC-7.5, AC-8.1, AC-8.2, AC-8.3
**Files:** `vite.config.ts`, `src/main.tsx`, `tests/e2e/offline.spec.ts`, `.github/workflows/publicar.yml`, `apps-script/Code.gs`, `docs/operacao.md`
**Interfaces:** Consumes: `npm run sync` (Fase 2), `npm run build` (Fase 5). Produces: o site publicado em `https://<owner>.github.io/<repo>/`, o menu "Publicar no jogo" e o guia de operação.

Faz o app instalável e offline (precache de app, notícias, imagens, WASM e modelo), com atualização automática, e conecta planilha → GitHub Actions → GitHub Pages.

- [ ] Escrever `tests/e2e/offline.spec.ts`:
  ```ts
  import { expect, test } from '@playwright/test';

  test('AC-8.1/AC-8.3: depois de uma visita online, abre e joga offline com imagens', async ({ page, context }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    });
    await page.goto('/');
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state;
    });
    await page.reload(); // garante que o SW controla a página
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
    await page.keyboard.press('Enter');
    const img = page.locator('article img');
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  });

  test('AC-8.2: manifest instalável em tela cheia', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest');
    expect(r.ok()).toBe(true);
    const m = await r.json();
    expect(m).toMatchObject({ name: 'Match do Saber', display: 'fullscreen', lang: 'pt-BR' });
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
  });

  test('NFR Security: nenhuma requisição sai do próprio site durante a partida', async ({ page }) => {
    const externas: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) externas.push(r.url()); });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    });
    await page.goto('/');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(3500);
    expect(externas).toEqual([]);
    expect(await page.context().cookies()).toEqual([]);
  });
  ```
- [ ] Rodar `npm run e2e`. Esperado: FAIL nos testes de `offline.spec.ts` (sem service worker nem manifest).
- [ ] Substituir `vite.config.ts`:
  ```ts
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import { VitePWA } from 'vite-plugin-pwa';

  export default defineConfig({
    base: process.env.BASE_PATH ?? '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,json,wasm,task}'],
          globIgnores: ['**/vision_wasm_module_internal.*'],
          maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
        manifest: {
          name: 'Match do Saber',
          short_name: 'Match do Saber',
          description: 'Jogo de checagem de notícias',
          lang: 'pt-BR',
          display: 'fullscreen',
          start_url: '.',
          scope: '.',
          background_color: '#1b1035',
          theme_color: '#1b1035',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  });
  ```
- [ ] Atualizar `src/main.tsx`, registrando o SW com atualização automática (AC-7.4):
  ```tsx
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { registerSW } from 'virtual:pwa-register';
  import { App } from './app/App';

  registerSW({ immediate: true });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  ```
- [ ] Rodar `npm run e2e`. Esperado: 7 passed.
- [ ] Criar `.github/workflows/publicar.yml` (antes de criar, conferir as últimas majors de `actions/checkout`, `actions/setup-node`, `actions/upload-pages-artifact` e `actions/deploy-pages`):
  ```yaml
  name: Publicar jogo
  on:
    push:
      branches: [main]
    workflow_dispatch:
    repository_dispatch:
      types: [publicar-conteudo]

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: pages
    cancel-in-progress: false

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 24
            cache: npm
        - run: npm ci
        - run: npm test
        - name: Ler planilha e gerar conteúdo
          run: npm run sync
          env:
            GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
            SHEET_ID: ${{ vars.SHEET_ID }}
        - run: npm run build
          env:
            BASE_PATH: /${{ github.event.repository.name }}/
        - uses: actions/upload-pages-artifact@v3
          with:
            path: dist
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deploy.outputs.page_url }}
      steps:
        - id: deploy
          uses: actions/deploy-pages@v4
  ```
  Se `npm run sync` falhar, o job `build` para e o `deploy` não roda: o site anterior continua no ar (AC-7.5).
- [ ] Criar `apps-script/Code.gs` (colado no editor do Apps Script da planilha):
  ```js
  const COLUNAS = ['id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
    'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status'];

  function onOpen() {
    SpreadsheetApp.getUi()
      .createMenu('Match do Saber')
      .addItem('Publicar no jogo', 'publicar')
      .addToUi();
  }

  function publicar() {
    const ui = SpreadsheetApp.getUi();
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('GITHUB_TOKEN');
    const repo = props.getProperty('GITHUB_REPO');
    if (!token || !repo) {
      ui.alert('Publicação não configurada. Avise a equipe técnica.');
      return;
    }
    const resp = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      payload: JSON.stringify({ event_type: 'publicar-conteudo' }),
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() === 204) {
      ui.alert('Publicação iniciada! Em alguns minutos as notícias aprovadas estarão no jogo.\n\n' +
        'Para ver o resumo (inclusive linhas não publicadas e o motivo): https://github.com/' + repo + '/actions');
    } else {
      ui.alert('Não foi possível iniciar a publicação (código ' + resp.getResponseCode() + '). Avise a equipe técnica.');
    }
  }

  /** Rodar uma vez pelo editor: cabeçalho, listas suspensas e destaque de campos vazios (AC-7.1). */
  function configurarPlanilha() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName('noticias') || ss.insertSheet('noticias');
    aba.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
    aba.setFrozenRows(1);
    const max = aba.getMaxRows() - 1;
    const lista = (col, valores) => aba.getRange(2, COLUNAS.indexOf(col) + 1, max, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build());
    lista('veredito', ['verdadeira', 'falsa']);
    lista('tecnica', ['fonte', 'data', 'imagem', 'contexto']);
    lista('status', ['rascunho', 'aprovada']);
    const intervalo = aba.getRange(2, 1, max, COLUNAS.length);
    const regra = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(COUNTA($A2:$K2)>0; A2="")')
      .setBackground('#f4c7c3')
      .setRanges([intervalo])
      .build();
    aba.setConditionalFormatRules([regra]);
  }
  ```
  Se a planilha estiver em inglês, o separador da fórmula é `,` em vez de `;`.
- [ ] Criar `docs/operacao.md` (guia de configuração única e de uso no evento):
  ```markdown
  # Operação do Match do Saber

  ## Configuração (uma vez, equipe técnica)
  1. Google Cloud: criar uma conta de serviço, ativar as APIs Google Sheets e Google Drive e gerar uma chave JSON.
  2. Compartilhar a planilha e a pasta de imagens do Drive com o e-mail da conta de serviço como **Leitor**.
  3. GitHub › Settings › Secrets and variables › Actions:
     - Secret `GOOGLE_SERVICE_ACCOUNT_JSON` = conteúdo da chave JSON.
     - Variable `SHEET_ID` = ID da planilha (trecho da URL entre `/d/` e `/edit`).
  4. GitHub › Settings › Pages › Source: **GitHub Actions**.
  5. Criar um token fine-grained só para este repositório com **Contents: Read and write** (necessário para `repository_dispatch`), com validade de 1 ano. Anotar a data de expiração.
  6. Na planilha: Extensões › Apps Script › colar `apps-script/Code.gs`. Em Configurações do projeto › Propriedades do script, criar `GITHUB_TOKEN` (o token) e `GITHUB_REPO` (`dono/repositorio`). Rodar `configurarPlanilha` uma vez e autorizar.
  7. Dar acesso de leitura ao repositório para a pessoa de conteúdo (para ver o resumo das publicações).

  ## Publicar notícias (equipe de conteúdo)
  1. Preencher uma linha por notícia na aba `noticias`. A imagem é o link de compartilhamento do arquivo no Drive.
  2. Quando a notícia estiver revisada, preencher `revisado_por` e mudar `status` para `aprovada`.
  3. Menu **Match do Saber › Publicar no jogo**.
  4. Em alguns minutos, abrir o link do resumo para conferir as linhas não publicadas e o motivo.

  ## No dia do evento (operador)
  1. Com internet, abrir o jogo no Chrome do notebook (ou pelo ícone instalado) e aguardar a tela de espera. Isso baixa a versão mais recente para uso offline.
  2. Para instalar: ícone de instalar na barra de endereço › Instalar.
  3. Permitir a câmera quando o navegador pedir.
  4. Teclas: → verdade, ← falsa, ↑ saiba mais, Enter iniciar / próxima partida.
  ```
- [ ] Commit: `feat(pwa): offline install, auto-update and sheet-triggered publishing`

---

## Phase 7: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs, NFRs

- [ ] Rodar a suíte completa: `npm test && npm run e2e`. Esperado: todos os testes Vitest passam e os 7 do Playwright passam.
- [ ] Rodar `npm run build`. Esperado: sem erros de TypeScript; `dist/sw.js` e `dist/manifest.webmanifest` gerados.
- [ ] Teste no notebook real, com webcam, a 1,5–2 m (`npm run dev`, ou o site publicado):
  - AC-1.1 a AC-1.5, AC-2.1 a AC-2.4, AC-2.6, AC-3.1 a AC-3.3, AC-5.3 a AC-5.5: jogar 3 partidas só com o corpo, incluindo sair do quadro, uma segunda pessoa entrando e o "saiba mais". Ajustar `CONFIG_GESTOS` (limiar, tempos) se necessário e rodar de novo `npx vitest run src/core/gestos.test.ts`.
  - NFR Performance: no DevTools › Performance, gravar 30 s de partida. Esperado: ≥ 15 fps no loop, gesto confirmado ≤ 1 s, troca de card < 300 ms, ícone → espera ≤ 5 s com cache.
  - NFR Reliability: deixar o jogo rodando por 8 h (ou um ensaio de 2 h, registrando a memória no `chrome://memory-internals` / gerenciador de tarefas a cada 30 min). Esperado: sem queda e sem crescimento contínuo de memória.
  - Erros de câmera: negar a permissão; desconectar a webcam USB no meio da partida.
- [ ] Teste da publicação de ponta a ponta com a planilha real (AC-7.1 a AC-7.5): criar uma linha válida, uma em rascunho, uma sem fonte e uma com `id` duplicado; publicar pelo menu; conferir o resumo no Actions e o jogo atualizado depois de recarregar online; revogar temporariamente o acesso da conta de serviço e conferir que a publicação falha e o site continua igual.
- [ ] Commit: `feat: complete 001-jogo-estande MVP`

---

## Phase 8 (added v1.1.0): Modos de jogo acessíveis

**Implements:** FR-9, Story 9 | **Satisfies:** AC-9.1–AC-9.16 (lógica e UI; hardware na Fase 9)
**Files:** `src/core/modos.ts`, `src/core/modos.test.ts`, `src/core/gestos.ts`, `src/core/gestos-modos.test.ts`, `src/app/useModoJogo.ts`, `src/app/useJogo.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `tests/e2e/modos.spec.ts`
**Interfaces:** Consumes: `Presenca` (`src/core/partida.ts`); `Pose`, `Gesto`, `LeituraGesto`, `Interpretador`, `CONFIG_GESTOS`, `escolherJogador`, `criarInterpretador` (`src/core/gestos.ts`, Fase 4); `useJogo` (`src/app/useJogo.ts`, Fase 5 + revisões D1–D4); telas de `src/app/Telas.tsx`. Produces: de `src/core/modos.ts`: `ModoJogo`, `MODOS`, `MODO_PADRAO`, `MODO_ROTULO`, `DICA_GESTOS`, `DICA_SAIBA_MAIS`, `Armazenamento`, `lerModo(a: Armazenamento | null): ModoJogo`, `salvarModo(a: Armazenamento | null, modo: ModoJogo): void`; `criarInterpretador(modo?: ModoJogo, cfg?: typeof CONFIG_GESTOS): Interpretador`; `useModoJogo(podeAbrir: () => boolean)`; `useJogo(noticias, modo?, pausado?)`; `MenuModo`.

Adiciona os modos Mão e Cabeça ao interpretador de gestos, que continua puro e usa o mesmo modelo de pose: punhos e ombros no modo Mão, orelhas e nariz no modo Cabeça. Também adiciona o menu "Modo de jogo" na tela de espera, com o modo guardado no notebook. O modo Corpo e todos os testes existentes ficam como estão.

Decisões técnicas (inline, sem ADR novo):
- **Mesmo modelo de pose para mão e cabeça:** a inclinação da cabeça é calculada pelas orelhas (landmarks 7 e 8), e o "queixo para cima" pela posição do nariz (0) em relação às orelhas. Isso evita um segundo modelo, como o Face Landmarker, mais download e mais custo de processamento.
- **Lados anatômicos:** os landmarks 16 (punho direito) e 8 (orelha direita) são da própria direita do jogador e não dependem do espelhamento da imagem.
- **Modo guardado no `localStorage`:** a chave é `match-do-saber:modo` e é o único valor persistido (FR-9 "Must not"). O acesso fica protegido por try/catch: se o navegador bloquear o armazenamento, o jogo usa o modo Corpo.

### 8.1 Modos (núcleo)

- [ ] Escrever `src/core/modos.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { DICA_GESTOS, MODO_PADRAO, MODOS, lerModo, salvarModo, type Armazenamento } from './modos';

  function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
    const dados = { ...inicial };
    return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
  }
  const quebrado: Armazenamento = {
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
  };

  describe('modos de jogo', () => {
    it('lista Corpo, Mão e Cabeça, com Corpo como padrão', () => {
      expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
      expect(MODO_PADRAO).toBe('corpo');
    });
    it('AC-9.4: sem valor guardado, usa Corpo', () => {
      expect(lerModo(memoria())).toBe('corpo');
      expect(lerModo(null)).toBe('corpo');
    });
    it('AC-9.5: lê o modo guardado', () => {
      const a = memoria();
      salvarModo(a, 'cabeca');
      expect(lerModo(a)).toBe('cabeca');
    });
    it('valor inválido ou armazenamento bloqueado: usa Corpo e não lança erro', () => {
      expect(lerModo(memoria({ 'match-do-saber:modo': 'pe' }))).toBe('corpo');
      expect(lerModo(quebrado)).toBe('corpo');
      expect(() => salvarModo(quebrado, 'mao')).not.toThrow();
    });
    it('FR-9: guarda só a chave do modo', () => {
      const a = memoria();
      salvarModo(a, 'mao');
      expect(a.dados).toEqual({ 'match-do-saber:modo': 'mao' });
    });
    it('AC-9.14: dicas de cada modo', () => {
      expect(DICA_GESTOS.mao).toBe('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais');
      expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais');
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/modos.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] Implementar `src/core/modos.ts`:
  ```ts
  export type ModoJogo = 'corpo' | 'mao' | 'cabeca';

  export const MODOS: readonly ModoJogo[] = ['corpo', 'mao', 'cabeca'];
  export const MODO_PADRAO: ModoJogo = 'corpo';

  export const MODO_ROTULO: Record<ModoJogo, string> = { corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' };

  export const DICA_GESTOS: Record<ModoJogo, string> = {
    corpo: 'Direita: é verdade · Esquerda: é falsa · Duas mãos para cima: saiba mais',
    mao: 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais',
    cabeca: 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais',
  };

  export const DICA_SAIBA_MAIS: Record<ModoJogo, string> = {
    corpo: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
    mao: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
    cabeca: 'Saiba mais: levante o queixo (ou ↑)',
  };

  export interface Armazenamento {
    getItem(chave: string): string | null;
    setItem(chave: string, valor: string): void;
  }

  const CHAVE = 'match-do-saber:modo';

  export function lerModo(a: Armazenamento | null): ModoJogo {
    try {
      const v = a?.getItem(CHAVE);
      return MODOS.includes(v as ModoJogo) ? (v as ModoJogo) : MODO_PADRAO;
    } catch {
      return MODO_PADRAO;
    }
  }

  export function salvarModo(a: Armazenamento | null, modo: ModoJogo): void {
    try {
      a?.setItem(CHAVE, modo);
    } catch {
      // Armazenamento bloqueado: a escolha vale até o jogo ser fechado.
    }
  }
  ```
- [ ] Rodar `npx vitest run src/core/modos.test.ts`. Esperado: PASS.
- [ ] Commit: `feat(modos): game mode list, labels and saved choice (Phase 8.1: Modos)`

### 8.2 Interpretador para os modos Mão e Cabeça

- [ ] Escrever `src/core/gestos-modos.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { criarInterpretador, type Pose } from './gestos';

  /** Pose sintética em coordenadas cruas da câmera; cxJogador é o centro do ponto de vista do jogador. */
  function base(cxJogador = 0.5): Pose {
    const cx = 1 - cxJogador;
    const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.8, visibility: 1 }));
    p[0] = { x: cx, y: 0.33, visibility: 1 };          // nariz
    p[7] = { x: cx + 0.05, y: 0.3, visibility: 1 };    // orelha esquerda
    p[8] = { x: cx - 0.05, y: 0.3, visibility: 1 };    // orelha direita
    p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };   // ombro esquerdo
    p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };   // ombro direito
    p[15] = { x: cx + 0.15, y: 0.7, visibility: 1 };   // punho esquerdo
    p[16] = { x: cx - 0.15, y: 0.7, visibility: 1 };   // punho direito
    return p;
  }
  function maos(o: { direita?: boolean; esquerda?: boolean }, cx = 0.5): Pose {
    const p = base(cx);
    if (o.direita) p[16] = { ...p[16]!, y: 0.3 };
    if (o.esquerda) p[15] = { ...p[15]!, y: 0.3 };
    return p;
  }
  /** rollGraus > 0 = cabeça inclinada para a própria direita; queixo > 0 = olhando para cima. */
  function cabeca(rollGraus: number, queixo = 0, cx = 0.5): Pose {
    const p = base(cx);
    const dy = Math.tan((rollGraus * Math.PI) / 180) * 0.1;
    p[7] = { ...p[7]!, y: 0.3 - dy / 2 };
    p[8] = { ...p[8]!, y: 0.3 + dy / 2 };
    p[0] = { ...p[0]!, y: 0.33 - queixo * 0.1 };
    return p;
  }
  function seq(i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) {
    return passos.flatMap(([p, t]) => i.ler(p, t).gestos);
  }

  describe('modo Mão', () => {
    it('presença pela parte de cima do corpo; card não inclina', () => {
      const i = criarInterpretador('mao');
      expect(i.ler(maos({}), 0)).toMatchObject({ presenca: { presente: true, centralizado: true }, inclinacao: 0 });
      expect(i.ler(maos({}, 0.8), 10).presenca.centralizado).toBe(false);
    });
    it('AC-9.7: mão direita acima do ombro por 300 ms = "direita"; esquerda = "esquerda"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[maos({ direita: true }), 0], [maos({ direita: true }), 200]])).toEqual([]);
      expect(seq(i, [[maos({ direita: true }), 300]])).toEqual(['direita']);
      const j = criarInterpretador('mao');
      expect(seq(j, [[maos({ esquerda: true }), 0], [maos({ esquerda: true }), 300]])).toEqual(['esquerda']);
    });
    it('AC-9.8: duas mãos por 500 ms = "maosParaCima", sem escolha; baixar uma mão por vez não escolhe', () => {
      const i = criarInterpretador('mao');
      const ambas = maos({ direita: true, esquerda: true });
      expect(seq(i, [[ambas, 0], [ambas, 400]])).toEqual([]);
      expect(seq(i, [[ambas, 500], [ambas, 1500]])).toEqual(['maosParaCima']);
      expect(seq(i, [[maos({ esquerda: true }), 1600], [maos({ esquerda: true }), 2000]])).toEqual([]);
      expect(seq(i, [[maos({}), 2100], [maos({ esquerda: true }), 2200], [maos({ esquerda: true }), 2500]])).toEqual(['esquerda']);
    });
    it('AC-9.9: exige baixar as mãos entre escolhas', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[maos({ direita: true }), 0], [maos({ direita: true }), 300]])).toEqual(['direita']);
      expect(seq(i, [[maos({ direita: true }), 700], [maos({ direita: true }), 1500]])).toEqual([]);
      expect(seq(i, [[maos({}), 1600], [maos({ direita: true }), 1700], [maos({ direita: true }), 2000]])).toEqual(['direita']);
    });
    it('perder a pessoa zera a contagem', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[maos({ direita: true }), 0], [null, 100], [maos({ direita: true }), 200], [maos({ direita: true }), 400]])).toEqual([]);
    });
  });

  describe('modo Cabeça', () => {
    it('AC-9.10: inclinar para a própria direita ~15° por 300 ms = "direita"; esquerda = "esquerda"', () => {
      const i = criarInterpretador('cabeca');
      i.ler(cabeca(0), 0);
      i.calibrar();
      expect(seq(i, [[cabeca(20), 100], [cabeca(20), 300]])).toEqual([]);
      expect(seq(i, [[cabeca(20), 400]])).toEqual(['direita']);
      const j = criarInterpretador('cabeca');
      j.ler(cabeca(0), 0);
      j.calibrar();
      expect(seq(j, [[cabeca(-20), 100], [cabeca(-20), 400]])).toEqual(['esquerda']);
    });
    it('mede em relação à calibração', () => {
      const i = criarInterpretador('cabeca');
      i.ler(cabeca(10), 0);
      i.calibrar();
      expect(seq(i, [[cabeca(20), 100], [cabeca(20), 1000]])).toEqual([]);
    });
    it('AC-9.13: inclinação proporcional abaixo do limiar, sem escolha', () => {
      const i = criarInterpretador('cabeca');
      i.ler(cabeca(0), 0);
      i.calibrar();
      expect(i.ler(cabeca(7.5), 100).inclinacao).toBeCloseTo(0.5, 1);
      expect(seq(i, [[cabeca(7.5), 1000]])).toEqual([]);
    });
    it('AC-9.12: exige voltar a cabeça ao centro entre escolhas', () => {
      const i = criarInterpretador('cabeca');
      i.ler(cabeca(0), 0);
      i.calibrar();
      expect(seq(i, [[cabeca(20), 100], [cabeca(20), 400]])).toEqual(['direita']);
      expect(seq(i, [[cabeca(20), 800], [cabeca(20), 1500]])).toEqual([]);
      expect(seq(i, [[cabeca(3), 1600], [cabeca(20), 1700], [cabeca(20), 2000]])).toEqual(['direita']);
    });
    it('AC-9.11: queixo para cima por 500 ms = "maosParaCima", uma vez por levantada, sem escolha', () => {
      const i = criarInterpretador('cabeca');
      i.ler(cabeca(0), 0);
      i.calibrar();
      expect(seq(i, [[cabeca(0, 0.3), 100], [cabeca(0, 0.3), 500]])).toEqual([]);
      expect(seq(i, [[cabeca(0, 0.3), 600], [cabeca(0, 0.3), 2000]])).toEqual(['maosParaCima']);
      expect(seq(i, [[cabeca(0), 2100], [cabeca(0, 0.3), 2200], [cabeca(0, 0.3), 2700]])).toEqual(['maosParaCima']);
    });
    it('sem calibração, usa a primeira leitura do queixo como referência', () => {
      const i = criarInterpretador('cabeca');
      expect(seq(i, [[cabeca(0), 0], [cabeca(0), 1000]])).toEqual([]);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/gestos-modos.test.ts`. Esperado: FAIL, porque `criarInterpretador('mao')` ainda se comporta como o modo Corpo.
- [ ] Substituir `src/core/gestos.ts`. O modo Corpo é o mesmo código de antes, agora em `interpretadorCorpo`:
  ```ts
  import type { ModoJogo } from './modos';
  import type { Presenca } from './partida';

  export interface Ponto { x: number; y: number; visibility?: number }
  export type Pose = Ponto[];
  /** 'maosParaCima' é o gesto de "saiba mais" do modo ativo (no modo Cabeça, queixo para cima). */
  export type Gesto = 'direita' | 'esquerda' | 'maosParaCima';
  export interface LeituraGesto { presenca: Presenca; inclinacao: number; gestos: Gesto[] }
  export interface Interpretador { ler(pose: Pose | null, tMs: number): LeituraGesto; calibrar(): void }

  export const CONFIG_GESTOS = {
    limiar: 0.12,
    zonaRetorno: 0.05,
    zonaCalibracao: 0.1,
    permanenciaLadoMs: 300,
    permanenciaMaosMs: 500,
    margemMaoOmbro: 0.05,
    limiarCabecaGraus: 15,
    retornoCabecaGraus: 6,
    limiarQueixo: 0.25,
  };
  type Config = typeof CONFIG_GESTOS;

  const NARIZ = 0, ORELHA_E = 7, ORELHA_D = 8, OMBRO_E = 11, OMBRO_D = 12, PUNHO_E = 15, PUNHO_D = 16;
  const AUSENTE: LeituraGesto = { presenca: { presente: false, centralizado: false }, inclinacao: 0, gestos: [] };

  /** Centro do tronco do ponto de vista do jogador (imagem espelhada) e largura dos ombros. */
  function medir(p: Pose): { cx: number; largura: number } {
    const a = p[OMBRO_E]!, b = p[OMBRO_D]!;
    return { cx: 1 - (a.x + b.x) / 2, largura: Math.abs(a.x - b.x) };
  }

  function presenca(cx: number, cfg: Config): Presenca {
    return { presente: true, centralizado: Math.abs(cx - 0.5) < cfg.zonaCalibracao };
  }

  const limitar = (v: number) => Math.max(-1, Math.min(1, v));

  export function escolherJogador(poses: Pose[]): Pose | null {
    let melhor: Pose | null = null;
    let nota = -Infinity;
    for (const p of poses) {
      const { cx, largura } = medir(p);
      const n = largura * (1 - Math.abs(cx - 0.5));
      if (n > nota) { nota = n; melhor = p; }
    }
    return melhor;
  }

  /** Detecta um deslocamento lateral mantido por `permanenciaLadoMs`, com retorno obrigatório ao centro. */
  function criarLado(limiar: number, retorno: number, cfg: Config) {
    let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
    let travado = false;
    return {
      zerar() { lado = null; },
      ler(d: number, tMs: number): Gesto | null {
        if (travado) {
          if (Math.abs(d) < retorno) travado = false;
          return null;
        }
        const dir = d > limiar ? 'direita' : d < -limiar ? 'esquerda' : null;
        if (!dir) lado = null;
        else if (lado?.gesto !== dir) lado = { gesto: dir, desde: tMs };
        else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
          travado = true;
          lado = null;
          return dir;
        }
        return null;
      },
    };
  }

  /** Dispara uma vez quando `ativo` fica verdadeiro por `ms`; rearma quando `ativo` volta a falso. */
  function criarGatilho(ms: number) {
    let desde: number | null = null;
    let disparado = false;
    return {
      zerar() { desde = null; },
      ler(ativo: boolean, tMs: number): boolean {
        if (!ativo) { desde = null; disparado = false; return false; }
        if (desde === null) { desde = tMs; return false; }
        if (!disparado && tMs - desde >= ms) { disparado = true; return true; }
        return false;
      },
    };
  }

  function interpretadorCorpo(cfg: Config): Interpretador {
    let centro: number | null = null;
    let ultimoCx = 0.5;
    const lado = criarLado(cfg.limiar, cfg.zonaRetorno, cfg);
    const maos = criarGatilho(cfg.permanenciaMaosMs);
    return {
      calibrar() { centro = ultimoCx; },
      ler(pose, tMs) {
        if (!pose) { lado.zerar(); maos.zerar(); return AUSENTE; }
        const gestos: Gesto[] = [];
        const { cx } = medir(pose);
        ultimoCx = cx;
        const d = cx - (centro ?? 0.5);
        const g = lado.ler(d, tMs);
        if (g) gestos.push(g);
        const nariz = pose[NARIZ]!.y;
        if (maos.ler(pose[PUNHO_E]!.y < nariz && pose[PUNHO_D]!.y < nariz, tMs)) gestos.push('maosParaCima');
        return { presenca: presenca(cx, cfg), inclinacao: limitar(d / cfg.limiar), gestos };
      },
    };
  }

  function interpretadorMao(cfg: Config): Interpretador {
    let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
    let travadoLado = false;
    const ambas = criarGatilho(cfg.permanenciaMaosMs);
    return {
      calibrar() {},
      ler(pose, tMs) {
        if (!pose) { lado = null; ambas.zerar(); return AUSENTE; }
        const gestos: Gesto[] = [];
        const { cx } = medir(pose);
        const acima = (punho: number, ombro: number) => pose[punho]!.y < pose[ombro]!.y - cfg.margemMaoOmbro;
        const dir = acima(PUNHO_D, OMBRO_D);
        const esq = acima(PUNHO_E, OMBRO_E);

        if (ambas.ler(dir && esq, tMs)) {
          gestos.push('maosParaCima');
          travadoLado = true; // baixar uma mão por vez depois do "saiba mais" não escolhe
        }
        if (!dir && !esq) travadoLado = false;

        if (travadoLado || dir === esq) {
          lado = null;
        } else {
          const g = dir ? 'direita' : 'esquerda';
          if (lado?.gesto !== g) lado = { gesto: g, desde: tMs };
          else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
            gestos.push(g);
            travadoLado = true;
            lado = null;
          }
        }
        return { presenca: presenca(cx, cfg), inclinacao: 0, gestos };
      },
    };
  }

  function interpretadorCabeca(cfg: Config): Interpretador {
    let ultimoRoll = 0;
    let ultimoQueixo: number | null = null;
    let rollCentro = 0;
    let queixoCentro: number | null = null;
    const lado = criarLado(cfg.limiarCabecaGraus, cfg.retornoCabecaGraus, cfg);
    const queixo = criarGatilho(cfg.permanenciaMaosMs);
    return {
      calibrar() {
        rollCentro = ultimoRoll;
        queixoCentro = ultimoQueixo;
      },
      ler(pose, tMs) {
        if (!pose) { lado.zerar(); queixo.zerar(); return AUSENTE; }
        const gestos: Gesto[] = [];
        const { cx } = medir(pose);
        const oe = pose[ORELHA_E]!, od = pose[ORELHA_D]!, nariz = pose[NARIZ]!;
        const dist = Math.max(Math.abs(oe.x - od.x), 1e-6);
        // Orelha direita mais baixa que a esquerda = cabeça inclinada para a própria direita.
        const roll = (Math.atan2(od.y - oe.y, dist) * 180) / Math.PI;
        // Nariz subindo em relação às orelhas = queixo para cima.
        const q = ((oe.y + od.y) / 2 - nariz.y) / dist;
        ultimoRoll = roll;
        ultimoQueixo = q;
        if (queixoCentro === null) queixoCentro = q;

        const d = roll - rollCentro;
        const g = lado.ler(d, tMs);
        if (g) gestos.push(g);
        if (queixo.ler(q - queixoCentro > cfg.limiarQueixo, tMs)) gestos.push('maosParaCima');
        return { presenca: presenca(cx, cfg), inclinacao: limitar(d / cfg.limiarCabecaGraus), gestos };
      },
    };
  }

  export function criarInterpretador(modo: ModoJogo = 'corpo', cfg: Config = CONFIG_GESTOS): Interpretador {
    if (modo === 'mao') return interpretadorMao(cfg);
    if (modo === 'cabeca') return interpretadorCabeca(cfg);
    return interpretadorCorpo(cfg);
  }
  ```
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS, incluindo todos os testes antigos de `gestos.test.ts`, que continuam usando `criarInterpretador()` no modo Corpo.
- [ ] Commit: `feat(gestos): hand and head interpreters for accessible modes (Phase 8.2: Interpretador)`

### 8.3 Menu "Modo de jogo" e telas

> **Parcialmente invalidado na v2.0.0:** o menu "Modo de jogo" (`useModoJogo`, `MenuModo`, botão "⚙ Modo de jogo: <modo>") foi reescrito na Fase 10.4 como "Configurações". As dicas por modo (AC-9.14) e a pausa da câmera com o menu aberto continuam valendo.

- [ ] Acrescentar a `src/app/Telas.test.tsx`. Os imports novos são `fireEvent` de `@testing-library/react`, `vi` de `vitest` e `MenuModo`, `TelaCalibracao`. Acrescentar este bloco:
  ```tsx
  describe('modos de jogo (v1.1.0)', () => {
    it('AC-9.1/AC-9.2: espera mostra o modo ativo e abre o menu', () => {
      const abrir = vi.fn();
      render(<TelaEspera semNoticias={false} camera="ativa" modo="mao" onAbrirMenu={abrir} />);
      fireEvent.click(screen.getByRole('button', { name: '⚙ Modo de jogo: Mão' }));
      expect(abrir).toHaveBeenCalledOnce();
    });
    it('AC-9.1: menu lista os três modos, com o ativo marcado', () => {
      const escolher = vi.fn();
      render(<MenuModo ativo="corpo" destacado={0} onEscolher={escolher} onFechar={() => {}} />);
      const menu = screen.getByRole('dialog', { name: 'Modo de jogo' });
      expect(menu).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Corpo \(padrão\)/ })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: /Cabeça/ }));
      expect(escolher).toHaveBeenCalledWith('cabeca');
    });
    it.each([
      ['mao', 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais'],
      ['cabeca', 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais'],
    ] as const)('AC-9.14: calibração e card mostram os gestos do modo %s', (modo, dica) => {
      const { unmount } = render(<TelaCalibracao progresso={0} modo={modo} />);
      expect(screen.getByText(dica)).toBeInTheDocument();
      unmount();
      render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo={modo} cardRef={{ current: null }} onArrastar={() => {}} />);
      expect(screen.getByText(dica)).toBeInTheDocument();
    });
    it('AC-9.14: no modo Cabeça, a dica do saiba mais fala do queixo', () => {
      render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo="cabeca" cardRef={{ current: null }} onArrastar={() => {}} />);
      expect(screen.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeInTheDocument();
    });
  });
  ```
- [ ] Escrever `tests/e2e/modos.spec.ts`:
  ```ts
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
    await expect(page.getByText('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais')).toBeVisible(); // AC-9.14
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
  ```
- [ ] Rodar `npx vitest run src/app` e `npm run fixture && npx vite build && npx playwright test tests/e2e/modos.spec.ts`. Esperado: FAIL. (`npm run e2e` para no `tsc` enquanto as props novas não existem.)
- [ ] Criar `src/app/useModoJogo.ts`:
  ```ts
  import { useCallback, useEffect, useMemo, useState } from 'react';
  import { MODOS, lerModo, salvarModo, type Armazenamento, type ModoJogo } from '../core/modos';

  function armazenamentoDoNavegador(): Armazenamento | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  /** Modo de jogo do estande (FR-9). `podeAbrir` diz se o jogo está na tela de espera. */
  export function useModoJogo(podeAbrir: () => boolean) {
    const armazenamento = useMemo(armazenamentoDoNavegador, []);
    const [modo, setModo] = useState<ModoJogo>(() => lerModo(armazenamento));
    const [menu, setMenu] = useState({ aberto: false, destacado: 0 });

    const fechar = useCallback(() => setMenu({ aberto: false, destacado: 0 }), []);
    const abrir = useCallback(() => {
      if (podeAbrir()) setMenu({ aberto: true, destacado: MODOS.indexOf(modo) });
    }, [podeAbrir, modo]);
    const escolher = useCallback((m: ModoJogo) => {
      setModo(m);
      salvarModo(armazenamento, m);
      setMenu({ aberto: false, destacado: 0 });
    }, [armazenamento]);

    // Captura no window: com o menu aberto, nenhuma tecla chega ao jogo (Enter não inicia partida).
    useEffect(() => {
      const tecla = (e: KeyboardEvent) => {
        const m = e.key === 'm' || e.key === 'M';
        if (!menu.aberto) {
          if (m && podeAbrir()) { e.preventDefault(); abrir(); }
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (m || e.key === 'Escape') fechar();
        else if (e.key === 'ArrowDown') setMenu((s) => ({ ...s, destacado: (s.destacado + 1) % MODOS.length }));
        else if (e.key === 'ArrowUp') setMenu((s) => ({ ...s, destacado: (s.destacado + MODOS.length - 1) % MODOS.length }));
        else if (e.key === 'Enter') escolher(MODOS[menu.destacado]!);
      };
      window.addEventListener('keydown', tecla, { capture: true });
      return () => window.removeEventListener('keydown', tecla, { capture: true });
    }, [menu, podeAbrir, abrir, fechar, escolher]);

    return { modo, menuAberto: menu.aberto, destacado: menu.destacado, abrir, fechar, escolher };
  }
  ```
- [ ] Alterar `src/app/useJogo.ts` em três pontos, mantendo o resto do arquivo como está:
  1. A assinatura e o interpretador por modo:
     ```ts
     import type { ModoJogo } from '../core/modos';
     // ...
     export function useJogo(noticias: Noticia[], modo: ModoJogo = 'corpo', pausado = false) {
       // ...(estado, refs e camera inalterados)...
       const interp = useRef(criarInterpretador(modo));
       const pausadoRef = useRef(pausado);
       pausadoRef.current = pausado;

       // O modo só muda na tela de espera (FR-9), então trocar o interpretador aqui não afeta uma partida.
       useEffect(() => {
         interp.current = criarInterpretador(modo);
       }, [modo]);
     ```
  2. No laço por quadro, enquanto o menu estiver aberto, a câmera não gera presença nem gestos. Isso impede que alguém entrando no quadro dispare a calibração com o menu aberto:
     ```ts
     if (r && video && video.readyState >= 2) {
       const pose = escolherJogador(r.detectar(video, agora));
       poseRef.current = pose;
       const leitura = interp.current.ler(pose, agora);
       inclinacaoRef.current = pausadoRef.current ? 0 : leitura.inclinacao;
       despachar({ tipo: 'tick', dtMs, presenca: pausadoRef.current ? null : leitura.presenca });
       if (!pausadoRef.current) for (const g of leitura.gestos) despachar(EVENTO_DO_GESTO[g]);
     } else {
     ```
  3. Nenhuma outra mudança: o listener de teclado do jogo não precisa saber do menu, porque o `useModoJogo` intercepta as teclas antes, na fase de captura.
- [ ] Alterar `src/app/Telas.tsx`:
  - Imports: acrescentar `import { DICA_GESTOS, DICA_SAIBA_MAIS, MODO_ROTULO, MODOS, type ModoJogo } from '../core/modos';`.
  - Substituir `TelaEspera` e `TelaCalibracao`, e acrescentar `MenuModo`:
  ```tsx
  export function TelaEspera({ semNoticias, camera, modo = 'corpo', onAbrirMenu = () => {} }: {
    semNoticias: boolean;
    camera: StatusCamera;
    modo?: ModoJogo;
    onAbrirMenu?: () => void;
  }) {
    return (
      <main className={s.centro}>
        <h1 className={s.logo}>Match do Saber</h1>
        {semNoticias ? (
          <p className={s.aviso}>Nenhuma notícia publicada</p>
        ) : camera === 'negada' || camera === 'indisponivel' ? (
          <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
        ) : (
          <p className={s.chamada}>Chegue mais perto e fique de frente para a câmera para jogar</p>
        )}
        <button
          type="button"
          className={s.botaoModo}
          onClick={(e) => { e.currentTarget.blur(); onAbrirMenu(); }}
        >
          {`⚙ Modo de jogo: ${MODO_ROTULO[modo]}`}
        </button>
      </main>
    );
  }

  export function TelaCalibracao({ progresso, modo = 'corpo' }: { progresso: number; modo?: ModoJogo }) {
    return (
      <main className={s.centro}>
        <p className={s.chamada}>Fique no centro</p>
        <div className={s.barra}><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
        <p className={s.dica}>{DICA_GESTOS[modo]}</p>
      </main>
    );
  }

  export function MenuModo({ ativo, destacado, onEscolher, onFechar }: {
    ativo: ModoJogo;
    destacado: number;
    onEscolher: (modo: ModoJogo) => void;
    onFechar: () => void;
  }) {
    return (
      <div className={s.sobreposicao} role="dialog" aria-modal="true" aria-label="Modo de jogo">
        <div className={s.menu}>
          <h2>Modo de jogo</h2>
          <ul>
            {MODOS.map((m, i) => (
              <li key={m}>
                <button
                  type="button"
                  className={i === destacado ? s.destacado : undefined}
                  aria-pressed={m === ativo}
                  onClick={() => onEscolher(m)}
                >
                  {`${m === ativo ? '◉' : '○'} ${MODO_ROTULO[m]}${m === 'corpo' ? ' (padrão)' : ''}`}
                </button>
                <p className={s.dica}>{DICA_GESTOS[m]}</p>
              </li>
            ))}
          </ul>
          <p className={s.dica}>↑/↓ e Enter para escolher · Esc para fechar</p>
          <button type="button" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    );
  }
  ```
  - Em `TelaCard`, acrescentar a prop `modo = 'corpo'` (`modo?: ModoJogo` no tipo). Trocar a linha da dica dentro do card por `<p className={s.dica}>{DICA_SAIBA_MAIS[modo]}</p>`. Logo depois de `<div className={s.lado}>Verdade ✓</div>`, acrescentar:
  ```tsx
  {modo !== 'corpo' && <p className={s.dicaModo}>{DICA_GESTOS[modo]}</p>}
  ```
  A dica do modo fica fora do card, para não reduzir o espaço do texto da notícia (FR-4).
- [ ] Alterar `src/app/App.tsx`, função `Jogo`:
  ```tsx
  import { useModoJogo } from './useModoJogo';
  import { MenuModo, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';
  import type { Estado } from '../core/partida';
  // ...
  function Jogo({ noticias }: { noticias: Noticia[] }) {
    const telaRef = useRef<Estado['tela']>('espera');
    const podeAbrirMenu = useCallback(() => telaRef.current === 'espera', []);
    const modoJogo = useModoJogo(podeAbrirMenu);
    const { estado, despachar, camera, videoRef, inclinacaoRef, poseRef } = useJogo(noticias, modoJogo.modo, modoJogo.menuAberto);
    telaRef.current = estado.tela;
    // ...(cardRef, cardSaindoRef e laço de inclinação inalterados)...
  ```
  E nas telas: `TelaEspera` recebe `modo={modoJogo.modo} onAbrirMenu={modoJogo.abrir}`; `TelaCalibracao` recebe `modo={modoJogo.modo}`; os dois `TelaCard` recebem `modo={modoJogo.modo}`. Logo antes de `<CameraPreview …/>`:
  ```tsx
  {modoJogo.menuAberto && (
    <MenuModo ativo={modoJogo.modo} destacado={modoJogo.destacado} onEscolher={modoJogo.escolher} onFechar={modoJogo.fechar} />
  )}
  ```
  (`useCallback` entra no import de `react`.)
- [ ] Acrescentar a `src/app/App.module.css`:
  ```css
  .botaoModo { margin-top: 1.5rem; font-size: 1.1rem; padding: 0.6rem 1.25rem; border-radius: 2rem; border: 2px solid #fff; background: transparent; color: #fff; cursor: pointer; }
  .menu { background: #2a1850; padding: 2rem; border-radius: 1.5rem; font-size: 1.1rem; font-weight: 400; max-width: 40rem; text-align: left; }
  .menu h2 { margin-top: 0; font-size: 1.75rem; }
  .menu ul { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.75rem; }
  .menu button { font-size: 1.25rem; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 2px solid transparent; background: #3a2470; color: #fff; cursor: pointer; }
  .menu .destacado { border-color: #7cff6b; }
  .dicaModo { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); margin: 0; background: #3a2470; padding: 0.5rem 1.25rem; border-radius: 2rem; font-size: 1.1rem; white-space: nowrap; }
  ```
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS. São os 80 testes anteriores, mais os novos de `modos`, `gestos-modos` e `Telas`, e 15 testes de ponta a ponta (12 + 3).
- [ ] Commit: `feat(app): game mode menu with accessible hand and head modes (Phase 8.3: Menu e telas)`

---

## Phase 9 (added v1.1.0): Verificação dos modos no hardware

**Implements:** FR-9 | **Satisfies:** AC-9.7–AC-9.13, AC-9.15 (hardware)

- [ ] No notebook real, com webcam, escolher o modo Mão e jogar 2 partidas sentado, a ~1–1,5 m:
  - Mão direita, mão esquerda e as duas mãos, conferindo também o bloqueio até baixar as mãos.
  - Conferir que levantar as duas mãos com um pequeno atraso entre elas não registra uma escolha. Se registrar, aumentar `permanenciaLadoMs` só para o modo Mão.
- [ ] Escolher o modo Cabeça e jogar 2 partidas sentado:
  - Inclinar a cabeça para a direita e para a esquerda, levantar o queixo, e conferir o retorno ao centro entre escolhas e a inclinação do card.
  - Ajustar `limiarCabecaGraus`, `retornoCabecaGraus` e `limiarQueixo` se for preciso, e rodar de novo `npx vitest run src/core/gestos-modos.test.ts`.
- [ ] Teste com pelo menos uma pessoa com baixa mobilidade, se possível. Anotar no relatório da Fase 7 o que funcionou e o que precisou de ajuste.
- [ ] Desempenho em DevTools nos modos Mão e Cabeça: gesto confirmado em até 1 s e pelo menos 15 quadros por segundo.
- [ ] Fechar e reabrir o jogo sem internet e conferir que o modo escolhido continua ativo (AC-9.5).
- [ ] Com a câmera ligada e uma pessoa no quadro, abrir o menu "Modo de jogo" na tela de espera e conferir que a calibração não começa enquanto o menu está aberto (FR-9).

---

## Phase 10 (added v2.0.0): Configurações, Iniciar/Sair, sons e card centralizado

**Implements:** FR-9 (reescrito), FR-10, FR-11, FR-1 (tempo por card e sair), FR-4 (centralização) | **Satisfies:** AC-1.2, AC-4.4, AC-4.5, AC-9.1–AC-9.6, AC-9.14, AC-9.16, AC-9.17, AC-10.1–AC-10.5, AC-11.1–AC-11.5
**Files:** `src/core/modos.ts`, `src/core/modos.test.ts`, `src/core/partida.ts`, `src/core/partida.test.ts`, `src/core/sons.ts`, `src/core/sons.test.ts`, `src/app/audio.ts`, `src/app/useSons.ts`, `src/app/useConfiguracoes.ts` (substitui `src/app/useModoJogo.ts`, que é removido), `src/app/useJogo.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `tests/e2e/configuracoes.spec.ts` (substitui `tests/e2e/modos.spec.ts`, que é removido), `tests/e2e/partida-v2.spec.ts`, `docs/operacao.md`
**Interfaces:** Consumes: `Estado`, `Evento`, `Contexto`, `reduzir`, `TEMPOS` (`src/core/partida.ts`); `criarInterpretador(modo)` (`src/core/gestos.ts`); `ModoJogo`, `MODOS`, `MODO_ROTULO`, `DICA_GESTOS`, `DICA_SAIBA_MAIS`, `Armazenamento` (`src/core/modos.ts`, Fase 8.1). Produces:
- `src/core/modos.ts`: `Configuracoes`, `CONFIG_PADRAO`, `TEMPOS_CARD_S`, `ItemConfig`, `ITENS_CONFIG`, `ROTULO_ITEM`, `OPCOES`, `lerConfiguracoes`, `salvarConfiguracoes`, `mudarValor`, `rotuloValor`, `resumoConfiguracoes`. Saem `lerModo` e `salvarModo`.
- `src/core/partida.ts`: `Contexto.tempoCardMs` e o evento `{ tipo: 'sair' }`.
- `src/core/sons.ts`: `Som`, `sonsDaTransicao`.
- `src/app/audio.ts`: `criarTocador`.
- `src/app/useSons.ts`: `useSons`.
- `src/app/useConfiguracoes.ts`: `useConfiguracoes`.
- `src/app/Telas.tsx`: `MenuConfiguracoes`, `BotaoSair`.
- `src/app/useJogo.ts`: `useJogo(noticias, config, pausado)`.

Esta fase reescreve o menu da Fase 8.3, que passa a se chamar "Configurações" e reúne modo, tempo por card e som. O tempo por card deixa de ser fixo. Entram os botões "▶ Iniciar" e "✕ Sair", os sons e a centralização vertical do card. Os gestos (Fase 8.2) não mudam.

Itens invalidados pela v2.0.0, que esta fase reescreve:
- `src/app/useModoJogo.ts` → `src/app/useConfiguracoes.ts`
- `MenuModo` → `MenuConfiguracoes`
- o botão "⚙ Modo de jogo: <modo>" → "⚙ Configurações" mais a linha de resumo
- `lerModo`/`salvarModo` → `lerConfiguracoes`/`salvarConfiguracoes`
- os testes "modos de jogo (v1.1.0)" de `Telas.test.tsx` que usam `MenuModo` ou o botão antigo
- `tests/e2e/modos.spec.ts`

Decisões técnicas (inline, sem ADR novo):
- **Sons sintetizados no navegador** (Web Audio: osciladores e envelopes), sem arquivos de áudio. Funcionam offline sem nada a mais no precache (FR-11) e não precisam de licença.
- **"Quando tocar" fica num módulo puro** (`sonsDaTransicao(antes, depois)`), testável com o reducer. O módulo que gera o som (`audio.ts`) só é verificado em E2E, com um `AudioContext` falso, e na Fase 11.
- **Liberação do áudio:** o navegador só libera o áudio depois de uma interação, então o `AudioContext` é criado ou retomado no primeiro `pointerdown`/`keydown`.
- **Chaves no notebook:** as três configurações ficam em `match-do-saber:modo` (mesma chave da v1.1.0, então o modo já escolhido continua valendo), `match-do-saber:tempoCard` e `match-do-saber:som`.

### 10.1 Configurações (núcleo)

- [ ] Substituir `src/core/modos.test.ts`. Os testes de `lerModo`/`salvarModo` são invalidados e substituídos por estes:
  ```ts
  import { describe, expect, it } from 'vitest';
  import {
    CONFIG_PADRAO, DICA_GESTOS, ITENS_CONFIG, MODOS, TEMPOS_CARD_S,
    lerConfiguracoes, mudarValor, resumoConfiguracoes, rotuloValor, salvarConfiguracoes, type Armazenamento,
  } from './modos';

  function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
    const dados = { ...inicial };
    return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
  }
  const quebrado: Armazenamento = {
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
  };

  describe('configurações do estande', () => {
    it('itens e opções', () => {
      expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
      expect(TEMPOS_CARD_S).toEqual([10, 15, 20, 25, 30]);
      expect(ITENS_CONFIG).toEqual(['modo', 'tempoCardS', 'som']);
    });
    it('AC-9.4: sem nada guardado, usa Corpo, 15 s e som ligado', () => {
      expect(CONFIG_PADRAO).toEqual({ modo: 'corpo', tempoCardS: 15, som: true });
      expect(lerConfiguracoes(memoria())).toEqual(CONFIG_PADRAO);
      expect(lerConfiguracoes(null)).toEqual(CONFIG_PADRAO);
    });
    it('AC-9.5: guarda e lê as três configurações', () => {
      const a = memoria();
      salvarConfiguracoes(a, { modo: 'cabeca', tempoCardS: 25, som: false });
      expect(lerConfiguracoes(a)).toEqual({ modo: 'cabeca', tempoCardS: 25, som: false });
    });
    it('mantém o modo guardado pela v1.1.0 (mesma chave)', () => {
      expect(lerConfiguracoes(memoria({ 'match-do-saber:modo': 'mao' }))).toEqual({ ...CONFIG_PADRAO, modo: 'mao' });
    });
    it('valor inválido vale o padrão só daquele item; armazenamento bloqueado não quebra', () => {
      const a = memoria({ 'match-do-saber:modo': 'pe', 'match-do-saber:tempoCard': '12', 'match-do-saber:som': 'desligado' });
      expect(lerConfiguracoes(a)).toEqual({ modo: 'corpo', tempoCardS: 15, som: false });
      expect(lerConfiguracoes(quebrado)).toEqual(CONFIG_PADRAO);
      expect(() => salvarConfiguracoes(quebrado, CONFIG_PADRAO)).not.toThrow();
    });
    it('FR-9: guarda só as três chaves', () => {
      const a = memoria();
      salvarConfiguracoes(a, { modo: 'mao', tempoCardS: 20, som: true });
      expect(a.dados).toEqual({ 'match-do-saber:modo': 'mao', 'match-do-saber:tempoCard': '20', 'match-do-saber:som': 'ligado' });
    });
    it('AC-9.17: ←/→ mudam o valor sem passar dos limites', () => {
      const c = { ...CONFIG_PADRAO, tempoCardS: 10 };
      expect(mudarValor(c, 'tempoCardS', -1).tempoCardS).toBe(10);
      expect(mudarValor(c, 'tempoCardS', 1).tempoCardS).toBe(15);
      expect(mudarValor({ ...c, tempoCardS: 30 }, 'tempoCardS', 1).tempoCardS).toBe(30);
      expect(mudarValor(CONFIG_PADRAO, 'modo', 1).modo).toBe('mao');
      expect(mudarValor(CONFIG_PADRAO, 'modo', -1).modo).toBe('corpo');
      expect(mudarValor(CONFIG_PADRAO, 'som', 1).som).toBe(false);
    });
    it('AC-9.2: rótulos e resumo', () => {
      expect(rotuloValor('tempoCardS', 20)).toBe('20 s');
      expect(rotuloValor('som', true)).toBe('Ligado');
      expect(rotuloValor('modo', 'cabeca')).toBe('Cabeça');
      expect(resumoConfiguracoes({ modo: 'mao', tempoCardS: 20, som: false })).toBe('Modo: Mão · Tempo por card: 20 s · Som: desligado');
    });
    it('AC-9.14: dicas de cada modo continuam iguais', () => {
      expect(DICA_GESTOS.mao).toBe('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais');
      expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais');
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/modos.test.ts`. Esperado: FAIL, porque as exportações novas ainda não existem.
- [ ] Substituir `src/core/modos.ts`:
  ```ts
  export type ModoJogo = 'corpo' | 'mao' | 'cabeca';

  export const MODOS: readonly ModoJogo[] = ['corpo', 'mao', 'cabeca'];
  export const MODO_PADRAO: ModoJogo = 'corpo';

  export const MODO_ROTULO: Record<ModoJogo, string> = { corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' };

  export const DICA_GESTOS: Record<ModoJogo, string> = {
    corpo: 'Direita: é verdade · Esquerda: é falsa · Duas mãos para cima: saiba mais',
    mao: 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais',
    cabeca: 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais',
  };

  export const DICA_SAIBA_MAIS: Record<ModoJogo, string> = {
    corpo: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
    mao: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
    cabeca: 'Saiba mais: levante o queixo (ou ↑)',
  };

  export const TEMPOS_CARD_S: readonly number[] = [10, 15, 20, 25, 30];

  export interface Configuracoes { modo: ModoJogo; tempoCardS: number; som: boolean }
  export const CONFIG_PADRAO: Configuracoes = { modo: MODO_PADRAO, tempoCardS: 15, som: true };

  export type ItemConfig = keyof Configuracoes;
  export const ITENS_CONFIG: readonly ItemConfig[] = ['modo', 'tempoCardS', 'som'];
  export const ROTULO_ITEM: Record<ItemConfig, string> = { modo: 'Modo de jogo', tempoCardS: 'Tempo por card', som: 'Som' };
  export const OPCOES: { [K in ItemConfig]: readonly Configuracoes[K][] } = {
    modo: MODOS,
    tempoCardS: TEMPOS_CARD_S,
    som: [true, false],
  };

  export interface Armazenamento {
    getItem(chave: string): string | null;
    setItem(chave: string, valor: string): void;
  }

  const CHAVES: Record<ItemConfig, string> = {
    modo: 'match-do-saber:modo',
    tempoCardS: 'match-do-saber:tempoCard',
    som: 'match-do-saber:som',
  };

  function ler(a: Armazenamento | null, chave: string): string | null {
    try {
      return a?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  }

  export function lerConfiguracoes(a: Armazenamento | null): Configuracoes {
    const modo = ler(a, CHAVES.modo);
    const tempo = Number(ler(a, CHAVES.tempoCardS));
    const som = ler(a, CHAVES.som);
    return {
      modo: MODOS.includes(modo as ModoJogo) ? (modo as ModoJogo) : CONFIG_PADRAO.modo,
      tempoCardS: TEMPOS_CARD_S.includes(tempo) ? tempo : CONFIG_PADRAO.tempoCardS,
      som: som === 'ligado' ? true : som === 'desligado' ? false : CONFIG_PADRAO.som,
    };
  }

  export function salvarConfiguracoes(a: Armazenamento | null, c: Configuracoes): void {
    try {
      a?.setItem(CHAVES.modo, c.modo);
      a?.setItem(CHAVES.tempoCardS, String(c.tempoCardS));
      a?.setItem(CHAVES.som, c.som ? 'ligado' : 'desligado');
    } catch {
      // Armazenamento bloqueado: as escolhas valem até o jogo ser fechado.
    }
  }

  export function mudarValor(c: Configuracoes, item: ItemConfig, passo: -1 | 1): Configuracoes {
    const lista = OPCOES[item] as readonly unknown[];
    const i = lista.indexOf(c[item]);
    const j = Math.max(0, Math.min(lista.length - 1, i + passo));
    return { ...c, [item]: lista[j] } as Configuracoes;
  }

  export function rotuloValor(item: ItemConfig, valor: Configuracoes[ItemConfig]): string {
    if (item === 'modo') return MODO_ROTULO[valor as ModoJogo];
    if (item === 'tempoCardS') return `${valor} s`;
    return valor ? 'Ligado' : 'Desligado';
  }

  export function resumoConfiguracoes(c: Configuracoes): string {
    return `Modo: ${MODO_ROTULO[c.modo]} · Tempo por card: ${c.tempoCardS} s · Som: ${c.som ? 'ligado' : 'desligado'}`;
  }

  /** @deprecated v2.0.0: mantido só até a Fase 10.4 remover `useModoJogo`. */
  export function lerModo(a: Armazenamento | null): ModoJogo {
    return lerConfiguracoes(a).modo;
  }

  /** @deprecated v2.0.0: mantido só até a Fase 10.4 remover `useModoJogo`. */
  export function salvarModo(a: Armazenamento | null, modo: ModoJogo): void {
    try {
      a?.setItem(CHAVES.modo, modo);
    } catch {
      // Armazenamento bloqueado.
    }
  }
  ```
- [ ] Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: PASS e sem erros: `lerModo`/`salvarModo` continuam existindo, só para o app atual compilar até a 10.4.
- [ ] Commit: `feat(config): settings model for mode, card time and sound (Phase 10.1: Configurações)`

### 10.2 Partida: tempo por card configurável e Sair

- [ ] Em `src/core/partida.test.ts`:
  - Trocar o helper `ctx` para incluir o tempo padrão. A intenção dos testes existentes não muda:
    ```ts
    const ctx = (over: Partial<Contexto> = {}): Contexto => ({
      noticias, rng: () => 0.5, cameraAtiva: true, tempoCardMs: TEMPOS.cardMs, ...over,
    });
    ```
  - Acrescentar o bloco:
    ```ts
    describe('v2.0.0: tempo por card e sair', () => {
      it('AC-9.17/AC-1.2/AC-4.4: o tempo configurado vale para todos os cards', () => {
        const c = ctx({ tempoCardMs: 20000 });
        const s0 = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }], c);
        expect(s0).toMatchObject({ tela: 'card', restanteMs: 20000 });
        const s1 = rodar(s0, [{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)], c);
        expect(s1).toMatchObject({ tela: 'card', indice: 1, restanteMs: 20000 });
        expect(rodar(s1, [tick(10000), tick(9999)], c).tela).toBe('card');
        expect(rodar(s1, [tick(10000), tick(10000)], c).tela).toBe('feedback');
      });
      it.each(['calibracao', 'card', 'saibaMais', 'feedback', 'resumo'] as const)('AC-10.3: sair em %s volta à espera', (onde) => {
        const c = ctx();
        let s: Estado;
        if (onde === 'calibracao') s = reduzir(ESTADO_INICIAL, tick(16, lado), c);
        else if (onde === 'card') s = emCard(c);
        else if (onde === 'saibaMais') s = reduzir(emCard(c), { tipo: 'saibaMais' }, c);
        else if (onde === 'feedback') s = reduzir(emCard(c), { tipo: 'escolha', resposta: 'falsa' }, c);
        else {
          s = emCard(c);
          for (let i = 0; i < 3; i++) s = rodar(s, [{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)], c);
        }
        expect(s.tela).toBe(onde === 'saibaMais' ? 'card' : onde);
        expect(reduzir(s, { tipo: 'sair' }, c)).toEqual(ESTADO_INICIAL);
      });
      it('AC-10.4: sair na espera não muda nada', () => {
        expect(reduzir(ESTADO_INICIAL, { tipo: 'sair' }, ctx())).toBe(ESTADO_INICIAL);
      });
    });
    ```
    (`Estado` entra no import de tipos de `./partida`. `tick`, `lado`, `rodar` e `emCard` são os helpers que já existem no arquivo.)
- [ ] Rodar `npx vitest run src/core/partida.test.ts`. Esperado: FAIL (`tempoCardMs` ignorado; `sair` não existe).
- [ ] Alterar `src/core/partida.ts`:
  ```ts
  export type Evento =
    | { tipo: 'tick'; dtMs: number; presenca: Presenca | null }
    | { tipo: 'escolha'; resposta: Veredito }
    | { tipo: 'saibaMais' }
    | { tipo: 'enter' }
    | { tipo: 'sair' };

  /** `tempoCardMs`: tempo por card configurado (FR-9); sem valor, vale `TEMPOS.cardMs`. */
  export interface Contexto { noticias: Noticia[]; rng: () => number; cameraAtiva: boolean; tempoCardMs?: number }

  function card(partida: Partida, indice: number, tempoCardMs = TEMPOS.cardMs): EstadoCard {
    return { tela: 'card', partida, indice, restanteMs: tempoCardMs, saibaMais: false, saibaMaisOciosoMs: 0, ausenteMs: null };
  }

  function iniciarPartida(ctx: Contexto, entrada: Entrada): Estado {
    const cards = sortear(ctx.noticias, ctx.rng);
    return cards.length === 0 ? ESTADO_INICIAL : card({ cards, resultados: [], entrada }, 0, ctx.tempoCardMs);
  }
  ```
  No início de `reduzir`, antes do `switch`:
  ```ts
  // "✕ Sair" / Esc (FR-10): encerra na hora, sem resumo; na espera não faz nada.
  if (evento.tipo === 'sair') return estado.tela === 'espera' ? estado : ESTADO_INICIAL;
  ```
  No `case 'feedback'`, trocar `card(estado.partida, proximo)` por `card(estado.partida, proximo, ctx.tempoCardMs)`.
- [ ] Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: PASS e sem erros, porque `tempoCardMs` é opcional e o app atual continua compilando.
- [ ] Commit: `feat(partida): configurable card time and quit event (Phase 10.2: Partida)`

### 10.3 Sons

- [ ] Escrever `src/core/sons.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { ESTADO_INICIAL, TEMPOS, reduzir, type Contexto, type Estado, type Evento } from './partida';
  import { sonsDaTransicao, type Som } from './sons';
  import type { Noticia } from './types';

  const noticia: Noticia = {
    id: 'v1', veredito: 'verdadeira', tecnica: 'fonte', titulo: '', descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '',
  };
  const ctx: Contexto = { noticias: [noticia], rng: () => 0.5, cameraAtiva: false, tempoCardMs: TEMPOS.cardMs };
  const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });

  /** Aplica os eventos um a um e junta os sons de cada transição. */
  function sons(eventos: Evento[], inicio: Estado = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx)): Som[] {
    let s = inicio;
    const out: Som[] = [];
    for (const e of eventos) {
      const n = reduzir(s, e, ctx);
      out.push(...sonsDaTransicao(s, n));
      s = n;
    }
    return out;
  }

  describe('sonsDaTransicao', () => {
    it('AC-11.1/AC-11.2: escolha certa = deslizar e, depois da saída do card, acerto', () => {
      expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }])).toEqual(['deslizar']);
      expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100)])).toEqual(['deslizar']);
      expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100), tick(100)])).toEqual(['deslizar', 'acerto']);
    });
    it('AC-11.3: escolha errada = deslizar e erro', () => {
      expect(sons([{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs)])).toEqual(['deslizar', 'erro']);
    });
    it('AC-11.3: tempo esgotado = erro, sem deslizar', () => {
      expect(sons([tick(10000), tick(5000)])).toEqual(['erro']);
    });
    it('nada toca no resto do feedback nem fora dele', () => {
      expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), tick(1000), tick(1000)])).toEqual(['deslizar', 'acerto']);
      expect(sons([tick(1000), { tipo: 'saibaMais' }, tick(1000)])).toEqual([]);
      const s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx);
      expect(sonsDaTransicao(s, s)).toEqual([]);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/sons.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] Implementar `src/core/sons.ts`:
  ```ts
  import { TEMPOS, type Estado } from './partida';

  export type Som = 'deslizar' | 'acerto' | 'erro';

  /** Sons a tocar na passagem de `antes` para `depois` (FR-11). */
  export function sonsDaTransicao(antes: Estado, depois: Estado): Som[] {
    if (depois.tela !== 'feedback') return [];
    const resultado: Som = depois.partida.resultados[depois.indice] === 'acerto' ? 'acerto' : 'erro';
    if (antes.tela === 'card') return depois.resposta === null ? [resultado] : ['deslizar'];
    // Depois da saída do card (TEMPOS.saidaMs), o resultado aparece: toca uma vez.
    const terminouSaida =
      antes.tela === 'feedback' &&
      antes.indice === depois.indice &&
      depois.resposta !== null &&
      antes.restanteMs > TEMPOS.feedbackMs &&
      depois.restanteMs <= TEMPOS.feedbackMs;
    return terminouSaida ? [resultado] : [];
  }
  ```
- [ ] Rodar `npx vitest run src/core/sons.test.ts`. Esperado: PASS.
- [ ] Criar `src/app/audio.ts` (gerador de som, verificado em E2E com um `AudioContext` falso e na Fase 11):
  ```ts
  import type { Som } from '../core/sons';

  interface Nota { freq: number; ate?: number; duracao: number; tipo: OscillatorType; volume: number; atraso?: number }

  const SONS: Record<Som, Nota[]> = {
    deslizar: [{ freq: 900, ate: 300, duracao: 0.18, tipo: 'sine', volume: 0.15 }],
    acerto: [
      { freq: 660, duracao: 0.12, tipo: 'triangle', volume: 0.2 },
      { freq: 990, duracao: 0.2, tipo: 'triangle', volume: 0.2, atraso: 0.1 },
    ],
    erro: [{ freq: 220, ate: 140, duracao: 0.35, tipo: 'sawtooth', volume: 0.12 }],
  };

  export interface Tocador { tocar(som: Som): void; desbloquear(): void }

  export function criarTocador(): Tocador {
    let ctx: AudioContext | null = null;
    const obter = (): AudioContext | null => {
      if (ctx) return ctx;
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      try {
        ctx = new C();
      } catch {
        return null;
      }
      return ctx;
    };
    return {
      // O navegador só libera o áudio depois de uma interação (clique ou tecla).
      desbloquear() {
        const c = obter();
        if (c?.state === 'suspended') c.resume().catch(() => {});
      },
      tocar(som) {
        const c = obter();
        if (!c) return;
        for (const n of SONS[som]) {
          const inicio = c.currentTime + (n.atraso ?? 0);
          const osc = c.createOscillator();
          const ganho = c.createGain();
          osc.type = n.tipo;
          osc.frequency.setValueAtTime(n.freq, inicio);
          if (n.ate) osc.frequency.exponentialRampToValueAtTime(n.ate, inicio + n.duracao);
          ganho.gain.setValueAtTime(n.volume, inicio);
          ganho.gain.exponentialRampToValueAtTime(0.001, inicio + n.duracao);
          osc.connect(ganho);
          ganho.connect(c.destination);
          osc.start(inicio);
          osc.stop(inicio + n.duracao);
        }
      },
    };
  }
  ```
- [ ] Criar `src/app/useSons.ts`:
  ```ts
  import { useEffect, useMemo, useRef } from 'react';
  import type { Estado } from '../core/partida';
  import { sonsDaTransicao } from '../core/sons';
  import { criarTocador } from './audio';

  /** Toca os sons de FR-11 a cada transição de estado, se `ligado`. */
  export function useSons(estado: Estado, ligado: boolean) {
    const tocador = useMemo(criarTocador, []);
    const anterior = useRef(estado);

    useEffect(() => {
      const desbloquear = () => tocador.desbloquear();
      window.addEventListener('pointerdown', desbloquear, { capture: true });
      window.addEventListener('keydown', desbloquear, { capture: true });
      return () => {
        window.removeEventListener('pointerdown', desbloquear, { capture: true });
        window.removeEventListener('keydown', desbloquear, { capture: true });
      };
    }, [tocador]);

    useEffect(() => {
      const sons = sonsDaTransicao(anterior.current, estado);
      anterior.current = estado;
      if (ligado) for (const som of sons) tocador.tocar(som);
    }, [estado, ligado, tocador]);
  }
  ```
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS.
- [ ] Commit: `feat(sons): choice and result sounds synthesized in the browser (Phase 10.3: Sons)`

### 10.4 Menu Configurações, Iniciar/Sair e card centralizado

- [ ] Em `src/app/Telas.test.tsx`, remover os testes invalidados do bloco "modos de jogo (v1.1.0)": "AC-9.1/AC-9.2: espera mostra o modo ativo…" e "AC-9.1: menu lista os três modos…". Manter os de AC-9.14. Acrescentar:
  ```tsx
  describe('v2.0.0: configurações, iniciar e sair', () => {
    it('AC-9.2/AC-10.1: espera mostra o resumo, Iniciar e Configurações', () => {
      const iniciar = vi.fn();
      const abrir = vi.fn();
      render(<TelaEspera semNoticias={false} camera="ativa" config={{ modo: 'mao', tempoCardS: 20, som: false }} onAbrirMenu={abrir} onIniciar={iniciar} />);
      expect(screen.getByText('Modo: Mão · Tempo por card: 20 s · Som: desligado')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar' }));
      fireEvent.click(screen.getByRole('button', { name: '⚙ Configurações' }));
      expect(iniciar).toHaveBeenCalledOnce();
      expect(abrir).toHaveBeenCalledOnce();
    });
    it('AC-10.2: sem notícias, Iniciar fica desativado', () => {
      render(<TelaEspera semNoticias camera="ativa" />);
      expect(screen.getByRole('button', { name: '▶ Iniciar' })).toBeDisabled();
    });
    it('AC-9.1: menu mostra os três itens com os valores atuais marcados', () => {
      const definir = vi.fn();
      render(<MenuConfiguracoes config={{ modo: 'corpo', tempoCardS: 15, som: true }} itemDestacado={0} onDefinir={definir} onFechar={() => {}} />);
      expect(screen.getByRole('dialog', { name: 'Configurações' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Modo de jogo' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Tempo por card' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Som' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '◉ Corpo' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: '◉ 15 s' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: '◉ Ligado' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: '○ 25 s' }));
      expect(definir).toHaveBeenCalledWith({ modo: 'corpo', tempoCardS: 25, som: true });
    });
    it('AC-10.5: botão Sair tem nome acessível "Sair da partida"', () => {
      const sair = vi.fn();
      render(<BotaoSair onSair={sair} />);
      fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
      expect(sair).toHaveBeenCalledOnce();
    });
  });
  ```
  (`MenuConfiguracoes` e `BotaoSair` entram no import de `./Telas`; `MenuModo` sai.)
- [ ] Remover `tests/e2e/modos.spec.ts` e escrever `tests/e2e/configuracoes.spec.ts`:
  ```ts
  import { expect, test, type Page } from '@playwright/test';

  const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
  const DICA_MAO = 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais';

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
    await expect(card.getByText('10', { exact: true })).toBeVisible();                       // AC-9.17
    const dica = page.getByText(DICA_MAO);
    await expect(dica).toBeVisible();                                                       // AC-9.14
    const [a, b] = [(await dica.boundingBox())!, (await card.boundingBox())!];
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true); // FR-4
    await page.keyboard.press('m');
    await expect(menu).toHaveCount(0);                                                      // AC-9.6
  });

  test('menu pelo mouse (AC-9.2) e setas no modo Cabeça (AC-9.16)', async ({ page }) => {
    await abrirSemCamera(page);
    await page.getByRole('button', { name: '⚙ Configurações' }).click();
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
  ```
- [ ] Escrever `tests/e2e/partida-v2.spec.ts`:
  ```ts
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
      expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThanOrEqual(8);
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
    await expect(page.getByText('Modo: Corpo · Tempo por card: 15 s · Som: desligado', { exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await sonsTocados(page)).toBe(0);
  });
  ```
- [ ] Rodar `npm run fixture && npx vite build && npx playwright test tests/e2e/configuracoes.spec.ts tests/e2e/partida-v2.spec.ts`. Esperado: FAIL. Se `vite build` falhar pelos tipos, é esperado: o Vite não checa tipos, mas confirme que o FAIL vem das asserções e não do build.
- [ ] Criar `src/app/useConfiguracoes.ts`, remover `src/app/useModoJogo.ts` e remover de `src/core/modos.ts` as funções `lerModo`/`salvarModo` marcadas como `@deprecated`:
  ```ts
  import { useCallback, useEffect, useMemo, useState } from 'react';
  import {
    ITENS_CONFIG, lerConfiguracoes, mudarValor, salvarConfiguracoes, type Armazenamento, type Configuracoes,
  } from '../core/modos';

  function armazenamentoDoNavegador(): Armazenamento | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  /** Configurações do estande (FR-9). `podeAbrir` diz se o jogo está na tela de espera. */
  export function useConfiguracoes(podeAbrir: () => boolean) {
    const armazenamento = useMemo(armazenamentoDoNavegador, []);
    const [config, setConfig] = useState<Configuracoes>(() => lerConfiguracoes(armazenamento));
    const [menu, setMenu] = useState({ aberto: false, item: 0 });

    const fechar = useCallback(() => setMenu({ aberto: false, item: 0 }), []);
    const abrir = useCallback(() => {
      if (podeAbrir()) setMenu({ aberto: true, item: 0 });
    }, [podeAbrir]);
    const definir = useCallback((c: Configuracoes) => {
      setConfig(c);
      salvarConfiguracoes(armazenamento, c);
    }, [armazenamento]);

    // Captura no window: com o menu aberto, nenhuma tecla chega ao jogo (Enter não inicia, Esc não "sai").
    useEffect(() => {
      const tecla = (e: KeyboardEvent) => {
        const m = e.key === 'm' || e.key === 'M';
        if (!menu.aberto) {
          if (m && podeAbrir()) { e.preventDefault(); abrir(); }
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        const n = ITENS_CONFIG.length;
        const item = ITENS_CONFIG[menu.item]!;
        if (m || e.key === 'Escape' || e.key === 'Enter') fechar();
        else if (e.key === 'ArrowDown') setMenu((s) => ({ ...s, item: (s.item + 1) % n }));
        else if (e.key === 'ArrowUp') setMenu((s) => ({ ...s, item: (s.item + n - 1) % n }));
        else if (e.key === 'ArrowLeft') definir(mudarValor(config, item, -1));
        else if (e.key === 'ArrowRight') definir(mudarValor(config, item, 1));
      };
      window.addEventListener('keydown', tecla, { capture: true });
      return () => window.removeEventListener('keydown', tecla, { capture: true });
    }, [menu, config, podeAbrir, abrir, fechar, definir]);

    return { config, menuAberto: menu.aberto, itemDestacado: menu.item, abrir, fechar, definir };
  }
  ```
- [ ] Alterar `src/app/useJogo.ts`:
  1. Assinatura, contexto e interpretador:
     ```ts
     import { CONFIG_PADRAO, type Configuracoes } from '../core/modos';
     // ...
     export function useJogo(noticias: Noticia[], config: Configuracoes = CONFIG_PADRAO, pausado = false) {
       const [camera, setCamera] = useState<StatusCamera>('carregando');
       const ctx = useRef<Contexto>({ noticias, rng: Math.random, cameraAtiva: false, tempoCardMs: config.tempoCardS * 1000 });
       ctx.current = { noticias, rng: Math.random, cameraAtiva: camera === 'ativa', tempoCardMs: config.tempoCardS * 1000 };
       // ...
       const interp = useRef(criarInterpretador(config.modo));
       // ...
       useEffect(() => {
         interp.current = criarInterpretador(config.modo);
       }, [config.modo]);
     ```
     (Sai o parâmetro `modo` e o `import type { ModoJogo }`.)
  2. Em `EVENTO_DA_TECLA`, acrescentar `Escape: { tipo: 'sair' }` (FR-10).
- [ ] Alterar `src/app/Telas.tsx`:
  - Imports de `../core/modos`: `CONFIG_PADRAO`, `DICA_GESTOS`, `DICA_SAIBA_MAIS`, `ITENS_CONFIG`, `OPCOES`, `ROTULO_ITEM`, `resumoConfiguracoes`, `rotuloValor`, `type Configuracoes`, `type ModoJogo`. Saem `MODO_ROTULO` e `MODOS`.
  - Substituir `TelaEspera` e `MenuModo`, e acrescentar `BotaoSair`:
  ```tsx
  export function TelaEspera({ semNoticias, camera, config = CONFIG_PADRAO, onAbrirMenu = () => {}, onIniciar = () => {} }: {
    semNoticias: boolean;
    camera: StatusCamera;
    config?: Configuracoes;
    onAbrirMenu?: () => void;
    onIniciar?: () => void;
  }) {
    return (
      <main className={s.centro}>
        <h1 className={s.logo}>Match do Saber</h1>
        {semNoticias ? (
          <p className={s.aviso}>Nenhuma notícia publicada</p>
        ) : camera === 'negada' || camera === 'indisponivel' ? (
          <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
        ) : (
          <p className={s.chamada}>Chegue mais perto e fique de frente para a câmera para jogar</p>
        )}
        <div className={s.botoes}>
          {/* Os botões perdem o foco no clique: um Enter depois não deve reativá-los. */}
          <button type="button" className={s.botaoIniciar} disabled={semNoticias} onClick={(e) => { e.currentTarget.blur(); onIniciar(); }}>
            ▶ Iniciar
          </button>
          <button type="button" className={s.botaoModo} onClick={(e) => { e.currentTarget.blur(); onAbrirMenu(); }}>
            ⚙ Configurações
          </button>
        </div>
        <p className={s.dica}>{resumoConfiguracoes(config)}</p>
      </main>
    );
  }

  export function MenuConfiguracoes({ config, itemDestacado, onDefinir, onFechar }: {
    config: Configuracoes;
    itemDestacado: number;
    onDefinir: (c: Configuracoes) => void;
    onFechar: () => void;
  }) {
    return (
      <div className={s.sobreposicao} role="dialog" aria-modal="true" aria-label="Configurações">
        <div className={s.menu}>
          <h2>Configurações</h2>
          <ul>
            {ITENS_CONFIG.map((item, i) => (
              <li key={item} className={i === itemDestacado ? s.destacado : undefined}>
                <p className={s.rotuloItem} id={`cfg-${item}`}>{ROTULO_ITEM[item]}</p>
                <div className={s.opcoes} role="group" aria-labelledby={`cfg-${item}`}>
                  {(OPCOES[item] as readonly Configuracoes[typeof item][]).map((valor) => {
                    const ativo = config[item] === valor;
                    return (
                      <button
                        key={String(valor)}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => onDefinir({ ...config, [item]: valor } as Configuracoes)}
                      >
                        {`${ativo ? '◉' : '○'} ${rotuloValor(item, valor)}`}
                      </button>
                    );
                  })}
                </div>
                {item === 'modo' && <p className={s.dica}>{DICA_GESTOS[config.modo]}</p>}
              </li>
            ))}
          </ul>
          <p className={s.dica}>↑/↓ escolhem o item · ←/→ mudam o valor · Esc ou Enter fecham</p>
          <button type="button" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    );
  }

  export function BotaoSair({ onSair }: { onSair: () => void }) {
    return (
      <button type="button" className={s.sair} aria-label="Sair da partida" onClick={(e) => { e.currentTarget.blur(); onSair(); }}>
        ✕ Sair
      </button>
    );
  }
  ```
- [ ] Alterar `src/app/App.tsx`, função `Jogo`:
  ```tsx
  import { useConfiguracoes } from './useConfiguracoes';
  import { useSons } from './useSons';
  import { BotaoSair, MenuConfiguracoes, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';
  // ...
  function Jogo({ noticias }: { noticias: Noticia[] }) {
    const telaRef = useRef<Estado['tela']>('espera');
    const podeAbrirMenu = useCallback(() => telaRef.current === 'espera', []);
    const cfg = useConfiguracoes(podeAbrirMenu);
    const { estado, despachar, camera, videoRef, inclinacaoRef, poseRef } = useJogo(noticias, cfg.config, cfg.menuAberto);
    telaRef.current = estado.tela;
    useSons(estado, cfg.config.som);
    // ...(cardRef, cardSaindoRef e laço de inclinação inalterados)...
  ```
  - Nas telas: `TelaEspera` recebe `config={cfg.config} onAbrirMenu={cfg.abrir} onIniciar={() => despachar({ tipo: 'enter' })}`. `TelaCalibracao` e os dois `TelaCard` recebem `modo={cfg.config.modo}`.
  - No retorno, trocar o bloco do `MenuModo` por:
  ```tsx
  {estado.tela !== 'espera' && <BotaoSair onSair={() => despachar({ tipo: 'sair' })} />}
  {cfg.menuAberto && (
    <MenuConfiguracoes config={cfg.config} itemDestacado={cfg.itemDestacado} onDefinir={cfg.definir} onFechar={cfg.fechar} />
  )}
  ```
- [ ] Alterar `src/app/App.module.css`:
  - Primeira linha. Provável causa do card não centralizado: o `:global(...)` com vírgulas não aplica `height: 100%` ao `#root`, e então `.app`/`.mesa` ficam com a altura do conteúdo. Confirmar com o teste AC-4.5 (`sdd-superpowers:systematic-debugging` se a causa for outra) e trocar por:
    ```css
    :global(html), :global(body), :global(#root) { margin: 0; height: 100%; }
    ```
  - `.botaoModo`: trocar `margin-top: 1.5rem` por `margin-top: 0`.
  - Trocar a regra `.menu .destacado { border-color: #7cff6b; }` por:
    ```css
    .menu li { padding: 0.5rem 0.75rem; border: 2px solid transparent; border-radius: 0.75rem; }
    .menu li.destacado { border-color: #7cff6b; }
    .rotuloItem { margin: 0 0 0.4rem; font-weight: 700; }
    .opcoes { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .botoes { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .botaoIniciar { font-size: 1.5rem; padding: 0.75rem 2rem; border-radius: 2rem; border: none; background: #7cff6b; color: #1b1035; font-weight: 800; cursor: pointer; }
    .botaoIniciar:disabled { opacity: 0.4; cursor: not-allowed; }
    .sair { position: absolute; top: 1rem; left: 1rem; z-index: 2; font-size: 1.1rem; padding: 0.5rem 1rem; border-radius: 2rem; border: 2px solid #fff; background: rgb(27 16 53 / 0.7); color: #fff; cursor: pointer; }
    ```
- [ ] Em `docs/operacao.md`, seção "No dia do evento (operador)", acrescentar:
  ```markdown
  5. Clique uma vez na tela do jogo depois de abri-lo: o navegador só libera o som depois de uma interação.
  6. Configurações (tecla M ou botão "⚙ Configurações", só na tela de espera): modo de jogo (Corpo, Mão, Cabeça), tempo por card (10–30 s) e som. Ficam guardadas no notebook.
  7. "▶ Iniciar" começa uma partida pelas setas; "✕ Sair" (ou Esc) encerra a partida na hora.
  ```
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 12 antigos + 2 de `configuracoes` + 7 de `partida-v2` = 21).
- [ ] Commit: `feat(app): settings menu, start/quit buttons, sounds and centered card (Phase 10.4: Configurações e telas)`

---

## Phase 11 (added v2.0.0): Verificação de configurações, sons e layout no hardware

**Implements:** FR-9, FR-10, FR-11, FR-4 | **Satisfies:** AC-4.5, AC-11.1–AC-11.5 (hardware)

- [ ] No notebook do estande, ligado à TV:
  - Conferir que o card fica centralizado na vertical em 1366×768 e na resolução da TV.
  - Conferir que "✕ Sair" é fácil de achar e não cobre a faixa "Câmera indisponível".
- [ ] Sons:
  - Abrir o jogo, clicar uma vez e jogar com o corpo. Confirmar o som de deslizar na escolha, o som positivo no acerto e o som de erro.
  - Avaliar o volume no barulho do evento; se preciso, ajustar `volume` em `src/app/audio.ts`.
  - Desligar o som no menu e confirmar o silêncio.
- [ ] Sem nenhum clique ao abrir (só gestos), registrar se o navegador bloqueia o som. Esperado: bloqueia até a primeira interação, como na linha da tabela de erros.
- [ ] Jogar uma partida com 30 s por card e outra com 10 s. Conferir se o tempo é adequado para leitores mais lentos e para fila cheia.
- [ ] Com a faixa "Câmera indisponível" na tela, conferir se o botão "✕ Sair" (no canto superior esquerdo) atrapalha a leitura da faixa; se atrapalhar, dar `padding-inline` à `.faixa` (revisão v2.0.0).
- [ ] Apertar "✕ Sair" com o jogador ainda na frente da câmera: o jogo volta à espera e, como a pessoa continua no quadro, entra logo na calibração (AC-1.1). Conferir com o operador se isso é aceitável no estande.

---

## Phase 12 (added v3.0.0): Início só manual

**Implements:** FR-1 (reescrito), FR-10 | **Satisfies:** AC-1.1, AC-1.4, AC-1.6, AC-1.7, AC-1.8, AC-5.5, AC-10.1, AC-10.3
**Files:** `src/core/partida.ts`, `src/core/partida.test.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `tests/e2e/inicio-manual.spec.ts, `docs/operacao.md`
**Interfaces:** Consumes: `reduzir`, `ESTADO_INICIAL`, `Contexto.cameraAtiva`, o evento `{ tipo: 'enter' }` e o estado `calibracao` (`src/core/partida.ts`, Fases 3 e 10); `TelaEspera` (`src/app/Telas.tsx`, Fase 10). Produces: nenhum nome novo. O comportamento de `reduzir` muda e `TelaEspera` muda o texto de chamada.

Causa raiz (investigação do bug "o jogo começa e recomeça sozinho"): no `case 'espera'` de `reduzir`, qualquer tick com `presenca.presente` leva à `CALIBRACAO`, e a calibração inicia a partida depois de 2 s no centro. Depois de uma partida acabar por ausência, de "✕ Sair" ou de a calibração ficar vazia, o estado volta à espera e, se a pessoa continua no quadro, o ciclo recomeça sozinho. A spec v1.x/v2.0.0 mandava isso (AC-1.1); a v3.0.0 reescreve. Reproduzido com eventos simulados (`presente`/`centralizado`) em 10 passos: espera → calibração → card → espera → calibração → card → Sair → espera → calibração → card.

Itens invalidados pela v3.0.0:
- o teste `AC-1.1: pessoa no quadro leva à calibração`
- os testes que chegam à calibração por `tick(16)` em vez de Enter: AC-1.2, AC-1.3, AC-1.4, "Enter durante a calibração", `emCardCalibrado` e o caso `calibracao` de AC-10.3
- o helper `emCard`, que assumia que Enter na espera inicia a partida mesmo com câmera ativa
- o texto "Chegue mais perto e fique de frente para a câmera para jogar" da espera

- [ ] Em `src/core/partida.test.ts`, trocar os dois helpers (Enter na espera abre a calibração com câmera ativa, e Enter na calibração a pula; sem câmera, o primeiro Enter já inicia e o segundo é ignorado no card, então o helper serve nos dois casos):
  ```ts
  /** Partida pelo teclado: Enter na espera abre a calibração (câmera ativa, AC-1.7) e Enter na calibração a pula (AC-1.8). */
  const emCard = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, { tipo: 'enter' }], c);
  /** Partida pelo corpo: Enter abre a calibração e 2 s no centro iniciam a partida (AC-1.2, AC-1.7). */
  const emCardCalibrado = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16), tick(1000), tick(1000)], c);
  ```
- [ ] Em `src/core/partida.test.ts`, substituir o bloco `describe('espera e calibração', …)` inteiro por:
  ```ts
  describe('espera e calibração (v3.0.0: início só manual)', () => {
    it('AC-1.1: a câmera nunca inicia nada: presença na espera não faz o jogo sair dela', () => {
      let s: Estado = ESTADO_INICIAL;
      for (const p of [lado, centro, ninguem, centro]) {
        for (let i = 0; i < 300; i++) s = reduzir(s, tick(100, p), ctx());
        expect(s).toBe(ESTADO_INICIAL);
      }
    });
    it('AC-1.6: sem câmera, Enter inicia na hora, sem calibração', () => {
      const c = ctx({ cameraAtiva: false });
      const s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, c);
      expect(s).toMatchObject({ tela: 'card', indice: 0 });
      if (s.tela !== 'card') throw new Error();
      expect(s.partida.entrada).toBe('alternativa');
    });
    it('AC-1.7: com câmera ativa, Enter abre a calibração e a partida ainda não começa', () => {
      expect(reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx()).tela).toBe('calibracao');
    });
    it('AC-1.2: depois do Enter, 2 s contínuos no centro iniciam a partida com 15 s (entrada "corpo")', () => {
      const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(1000), tick(1000)]);
      expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: TEMPOS.cardMs });
      if (s.tela !== 'card') throw new Error();
      expect(s.partida.entrada).toBe('corpo');
    });
    it('AC-1.3: sair do centro reinicia a contagem', () => {
      const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(1500), tick(16, lado), tick(1500)]);
      expect(s).toMatchObject({ tela: 'calibracao', centradoMs: 1500 });
    });
    it('AC-1.4: 10 s sem ninguém na calibração voltam à espera, e ela permanece mesmo com alguém no quadro depois', () => {
      const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(5000, ninguem), tick(5000, ninguem)]);
      expect(s.tela).toBe('espera');
      expect(rodar(s, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
    });
    it('AC-1.8: Enter na calibração a pula e inicia pela entrada alternativa', () => {
      const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16, lado), { tipo: 'enter' }]);
      expect(s).toMatchObject({ tela: 'card', indice: 0 });
      if (s.tela !== 'card') throw new Error();
      expect(s.partida.entrada).toBe('alternativa');
    });
    it('AC-6.4: sem notícias, nem o Enter inicia', () => {
      const c = ctx({ noticias: [] });
      expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16)], c).tela).toBe('espera');
    });
    it('AC-5.5/AC-10.3: depois de sair do quadro ou de Sair, com alguém no quadro, o jogo fica na espera', () => {
      const perdida = rodar(emCardCalibrado(), [tick(6000, ninguem), tick(4000, ninguem)]);
      expect(perdida.tela).toBe('espera');
      expect(rodar(perdida, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
      const depoisDeSair = reduzir(emCard(), { tipo: 'sair' }, ctx());
      expect(rodar(depoisDeSair, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
    });
  });
  ```
- [ ] Em `src/core/partida.test.ts`, ajustar os dois testes de "Enter" restantes:
  - Em `AC-1.6: partida iniciada por Enter com câmera ativa ignora ausência`, a primeira linha já usa `emCard(ctx({ cameraAtiva: true }))`; nada a mudar (o helper novo faz Enter duas vezes).
  - Substituir `it('AC-1.6: Enter durante a calibração também inicia em modo alternativo', …)` por nada: o caso agora é o `AC-1.8` acima.
  - No `it.each(['calibracao', …])('AC-10.3 …')`, trocar a linha do caso `calibracao` por: `if (onde === 'calibracao') s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, c);`.
- [ ] Rodar `npx vitest run src/core/partida.test.ts`. Esperado: FAIL no AC-1.1 (a espera ainda vai para a calibração), no AC-1.7 (Enter com câmera ainda inicia direto) e no teste de AC-5.5/AC-10.3.
- [ ] Alterar `src/core/partida.ts`, `case 'espera'`:
  ```ts
  case 'espera': {
    if (ctx.noticias.length === 0) return estado;
    // v3.0.0: só o operador inicia (Enter ou "▶ Iniciar"); a presença na câmera nunca tira o jogo da espera (AC-1.1).
    // Com câmera ativa, Enter abre a calibração (AC-1.7); sem câmera, a partida começa direto (AC-1.6).
    if (evento.tipo === 'enter') return ctx.cameraAtiva ? CALIBRACAO : iniciarPartida(ctx, 'alternativa');
    return estado;
  }
  ```
  O `case 'calibracao'` não muda: Enter ali já pula a calibração (AC-1.8), e 10 s sem ninguém voltam à espera (AC-1.4).
- [ ] Rodar `npx vitest run`. Esperado: PASS. `src/core/sons.test.ts` não muda: o contexto dele não tem câmera ativa.
- [ ] Em `src/app/Telas.test.tsx`, acrescentar ao bloco `describe('v2.0.0: configurações, iniciar e sair', …)`:
  ```tsx
  it('v3.0.0: com câmera ativa, a espera manda apertar Iniciar e não promete início sozinho', () => {
    render(<TelaEspera semNoticias={false} camera="ativa" />);
    expect(screen.getByText('Aperte ▶ Iniciar (ou Enter) e fique de frente para a câmera')).toBeInTheDocument();
    expect(screen.queryByText(/Chegue mais perto/)).not.toBeInTheDocument();
  });
  ```
- [ ] Rodar `npx vitest run src/app/Telas.test.tsx`. Esperado: FAIL (texto antigo).
- [ ] Em `src/app/Telas.tsx`, `TelaEspera`, trocar a chamada:
  ```tsx
  <p className={s.chamada}>Aperte ▶ Iniciar (ou Enter) e fique de frente para a câmera</p>
  ```
- [ ] Rodar `npx vitest run src/app`. Esperado: PASS.
- [ ] Escrever `tests/e2e/inicio-manual.spec.ts` (sem câmera, como os outros E2E: o início só por ação do operador, e Sair não recomeça):
  ```ts
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
  ```
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 21 + 1 = 22).
- [ ] Em `docs/operacao.md`, trocar o passo 7 de "No dia do evento" por:
  ```markdown
  7. O jogo nunca começa sozinho: o operador aperta "▶ Iniciar" (ou Enter). Com a câmera ativa, abre a calibração ("Fique no centro", 2 s) e a partida começa; Enter na calibração a pula e joga pelas setas. Sem câmera, começa direto. "✕ Sair" (ou Esc) encerra a partida na hora e o jogo fica na espera.
  ```
- [ ] Commit: `fix(partida): start only by operator action, camera never starts the game (Phase 12: Início só manual)`

---

## Phase 13 (added v3.0.0): Verificação do início manual no hardware

**Implements:** FR-1 | **Satisfies:** AC-1.1, AC-1.7, AC-1.8 (hardware)

- [ ] Com a câmera ligada, ficar em frente ao notebook na tela de espera por 30 s: o jogo não pode começar nem abrir a calibração (AC-1.1).
- [ ] Apertar "▶ Iniciar": abre "Fique no centro"; 2 s no centro iniciam a partida (AC-1.7, AC-1.2).
- [ ] Sair da frente da câmera por 10 s durante a partida e voltar depois: o jogo fica na espera e não recomeça (AC-5.5).
- [ ] Apertar "✕ Sair" com o jogador ainda no quadro: o jogo fica na espera.
- [ ] Com iluminação ruim (ou a câmera tapada), apertar Enter duas vezes: a calibração é pulada e a partida roda pelas setas (AC-1.8).
- [ ] Apertar "▶ Iniciar" nos primeiros segundos, enquanto a câmera ainda carrega: a partida começa direto, como sem câmera (AC-1.6). Conferir se isso é aceitável no estande.

---

## Phase 14 (added v4.0.0): Card parado e barra de tempo

**Implements:** FR-2, FR-4, FR-9 (trechos reescritos) | **Satisfies:** AC-2.3, AC-9.13, AC-4.5, AC-4.6, AC-4.7, AC-9.17
**Files:** `src/app/App.tsx`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.module.css`, `tests/e2e/configuracoes.spec.ts`, `tests/e2e/partida-v2.spec.ts`, `tests/e2e/barra-tempo.spec.ts`
**Interfaces:** Consumes: `TelaCard`, `cardRef` e o laço de inclinação de `App.tsx` (Fases 5 e 10); `cfg.config.tempoCardS` (`useConfiguracoes`, Fase 10); `estado.restanteMs`, `estado.saibaMais` e `estado.ausenteMs` do card (`src/core/partida.ts`). Produces: `BarraTempo({ restanteMs, totalMs, alerta })` e a prop `totalMs?: number` de `TelaCard` (padrão 15000), ambas em `src/app/Telas.tsx`.

O card deixa de acompanhar o movimento: sai o laço que aplicava `inclinacaoRef` ao estilo do card, e com ele o tremor da captura. O rastreio não muda: `useJogo` continua calculando `inclinacao` e os gestos. O círculo do cronômetro sobre o card dá lugar a uma barra grossa na base da tela, e nos últimos 5 s a barra fica vermelha e o card pulsa.

Itens invalidados pela v4.0.0:
- o laço de inclinação em `App.tsx` (`el.style.transform = translateX(…) rotate(…)`) e a `transition: transform` do `.card`
- o `.cronometro` sobre o card
- a asserção de E2E que procura o número de segundos dentro do `article` (AC-9.17)
- o cálculo de centro do AC-4.5 contra a altura da janela inteira

Decisões técnicas (inline):
- **Barra posicionada em relação ao `.app`:** a barra (`role="timer"`, `aria-label="Tempo restante"`) fica `position: absolute` na base, com altura de 4rem.
- **Área de jogo sem a barra:** a área de jogo (`.mesa`) passa a ter `height: calc(100% - 4rem)`. Placar, dica do modo e prévia da câmera sobem 4rem.
- **Pulso só em CSS:** usa `box-shadow`, `border` e `transform: scale`. A classe `pulsando` só entra com o card parado (sem `saida`) e o cronômetro correndo (sem "saiba mais" e sem ausência).

- [ ] Em `src/app/Telas.test.tsx`:
  - Trocar, no teste "FR-4: card mostra imagem, título, descrição, cronômetro e dica do saiba mais", a linha `expect(screen.getByText('15')).toBeInTheDocument();` por:
    ```tsx
    expect(screen.getByRole('timer', { name: 'Tempo restante' })).toHaveTextContent('15 s');
    expect(container.querySelector('article')).not.toHaveTextContent(/^\d+$/m);
    ```
  - Acrescentar o bloco:
    ```tsx
    describe('v4.0.0: barra de tempo e pulso', () => {
      const props = { noticia, saibaMais: false, ausente: false, pontos: 0, totalMs: 15000, cardRef: { current: null }, onArrastar: () => {} };
      it('AC-4.6: barra mostra os segundos e a fração restante', () => {
        render(<BarraTempo restanteMs={7500} totalMs={15000} alerta={false} />);
        const barra = screen.getByRole('timer', { name: 'Tempo restante' });
        expect(barra).toHaveTextContent('8 s');
        expect(barra.firstElementChild).toHaveStyle({ width: '50%' });
      });
      it('AC-4.7: com 5 s ou menos e cronômetro correndo, o card pulsa e a barra fica em alerta', () => {
        const { container } = render(<TelaCard {...props} restanteMs={5000} />);
        expect(container.querySelector('article')!.className).toMatch(/pulsando/);
        expect(screen.getByRole('timer').className).toMatch(/barraAlerta/);
      });
      it('AC-4.7: acima de 5 s não pulsa', () => {
        const { container } = render(<TelaCard {...props} restanteMs={5001} />);
        expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
        expect(screen.getByRole('timer').className).not.toMatch(/barraAlerta/);
      });
      it.each([['saiba mais', { saibaMais: true }], ['Volte para o centro', { ausente: true }]] as const)(
        'AC-4.7: pausado (%s) não pulsa',
        (_nome, pausa) => {
          const { container } = render(<TelaCard {...props} {...pausa} restanteMs={3000} />);
          expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
        },
      );
      it('card saindo não mostra a barra nem pulsa', () => {
        const { container } = render(<TelaCard {...props} restanteMs={3000} saida="direita" />);
        expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
        expect(screen.queryByRole('timer')).not.toBeInTheDocument();
      });
    });
    ```
    (`BarraTempo` entra no import de `./Telas`. Com CSS Modules no Vitest, os nomes de classe podem vir vazios; se `className` não trouxer o nome local, configurar `test.css.modules.classNameStrategy: 'non-scoped'` em `vitest.config.ts` e informar.)
- [ ] Em `tests/e2e/configuracoes.spec.ts`, trocar `await expect(card.getByText('10', { exact: true })).toBeVisible();` por:
  ```ts
  await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText('10 s');   // AC-9.17
  ```
- [ ] Em `tests/e2e/partida-v2.spec.ts`, trocar o corpo do teste AC-4.5 (depois de `page.keyboard.press('Enter')`) por:
  ```ts
  const box = (await page.locator('article').boundingBox())!;
  const barra = (await page.getByRole('timer', { name: 'Tempo restante' }).boundingBox())!;
  expect(barra.y + barra.height).toBeCloseTo(vp.height, 0);          // colada na base
  expect(box.y + box.height).toBeLessThanOrEqual(barra.y);            // card não fica atrás da barra
  expect(Math.abs(box.y + box.height / 2 - barra.y / 2)).toBeLessThanOrEqual(8); // centro da área de jogo
  ```
- [ ] Escrever `tests/e2e/barra-tempo.spec.ts`:
  ```ts
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
  ```
- [ ] Rodar `npx vitest run src/app` e `npm run fixture && npx vite build && npx playwright test tests/e2e/barra-tempo.spec.ts tests/e2e/partida-v2.spec.ts tests/e2e/configuracoes.spec.ts`. Esperado: FAIL.
- [ ] Em `src/app/Telas.tsx`:
  - Acrescentar `BarraTempo`:
    ```tsx
    /** Tempo restante do card (AC-4.6); vermelha nos últimos 5 s (AC-4.7). */
    export function BarraTempo({ restanteMs, totalMs, alerta }: { restanteMs: number; totalMs: number; alerta: boolean }) {
      const fracao = Math.max(0, Math.min(1, restanteMs / totalMs));
      return (
        <div className={alerta ? `${s.barraTempo} ${s.barraAlerta}` : s.barraTempo} role="timer" aria-label="Tempo restante">
          <div className={s.barraPreenchida} style={{ width: `${fracao * 100}%` }} />
          <span className={s.barraSegundos}>{`${Math.ceil(restanteMs / 1000)} s`}</span>
        </div>
      );
    }
    ```
  - Em `TelaCard`:
    - Acrescentar a prop `totalMs = 15000` (`totalMs?: number` no tipo).
    - Remover a linha `{!saida && <div className={s.cronometro}>…</div>}`.
    - Calcular `const alerta = !saida && restanteMs <= 5000;` e `const pulsando = alerta && !saibaMais && !ausente;`.
    - Montar a classe do `article` como `[s.card, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando].filter(Boolean).join(' ')`.
    - Logo depois de `<Placar pontos={pontos} />`, acrescentar `{!saida && <BarraTempo restanteMs={restanteMs} totalMs={totalMs} alerta={alerta} />}`.
- [ ] Em `src/app/App.tsx`:
  - Remover o `useEffect` do laço de inclinação (o que escreve `el.style.transform`) e o `inclinacaoRef` da desestruturação de `useJogo`. `useJogo` continua devolvendo `inclinacaoRef`; o rastreio não muda.
  - Trocar o comentário de `cardSaindoRef` para `// card que está saindo (AC-2.1/AC-2.2)`.
  - Nos dois `TelaCard`, passar `totalMs={cfg.config.tempoCardS * 1000}`.
- [ ] Em `src/app/App.module.css`:
  - Remover a regra `.cronometro`.
  - No `.card`, remover `transition: transform 0.08s linear;` e trocar `max-height: 92vh` por `max-height: calc(92vh - 4rem)`.
  - Trocar `.mesa { height: 100%; …}` por `.mesa { height: calc(100% - 4rem); …}`.
  - Em `.pontos`, trocar `bottom: 1rem` por `bottom: 5rem`; em `.dicaModo`, `bottom: 4.5rem` por `bottom: 8.5rem`; em `.preview`, `bottom: 1rem` por `bottom: 5rem`.
  - Acrescentar:
    ```css
    .barraTempo { position: absolute; left: 0; right: 0; bottom: 0; height: 4rem; background: #2a1850; overflow: hidden; }
    .barraPreenchida { position: absolute; top: 0; bottom: 0; left: 0; background: #7cff6b; transition: width 0.1s linear; }
    .barraAlerta .barraPreenchida { background: #ff3b3b; }
    .barraSegundos { position: relative; display: grid; place-items: center; height: 100%; font-size: 2rem; font-weight: 800; color: #fff; text-shadow: 0 1px 4px rgb(0 0 0 / 0.8); }
    .pulsando { border: 4px solid #ff3b3b; animation: pulsar 1s ease-in-out infinite; }
    @keyframes pulsar {
      0%, 100% { box-shadow: 0 0 0 0 rgb(255 59 59 / 0.6); transform: scale(1); }
      50% { box-shadow: 0 0 36px 12px rgb(255 59 59 / 0.85); transform: scale(1.03); }
    }
    ```
  - Se o teste de FR-4 (texto no limite em 1366×768) falhar com a área menor, ajustar só o CSS do card (por exemplo `.card img { aspect-ratio: 16 / 9; }` ou gaps menores), nunca o teste, e registrar a mudança.
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 22 + 3 = 25).
- [ ] Commit: `feat(app): static card, bottom time bar and red pulse in the last 5 s (Phase 14: Card parado e barra de tempo)`

---

## Phase 15 (added v4.0.0): Verificação do card parado e da barra no hardware

**Implements:** FR-2, FR-4 | **Satisfies:** AC-2.3, AC-4.6, AC-4.7 (hardware)

- [ ] Com a câmera real, jogar uma partida em cada modo: o card não pode tremer nem inclinar antes da escolha; os gestos continuam funcionando como antes.
- [ ] A ~2 m da TV, conferir se a barra e os segundos são legíveis, e se o pulso vermelho dos últimos 5 s chama a atenção sem esconder o texto.
- [ ] Conferir que placar, dica do modo e prévia da câmera não ficam atrás da barra.
- [ ] Com a equipe de conteúdo, olhar algumas notícias reais de técnica "imagem": a imagem do card agora é cortada em 16:9 (antes 4:3, mudado para o texto caber acima da barra). Conferir que a parte importante da foto continua visível.

---

## Phase 16 (added v5.0.0): Tempo corre com o "saiba mais" aberto

**Implements:** FR-1 (reescrito), FR-4 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-4.3, AC-4.6, AC-4.7, AC-5.3
**Files:** `src/core/partida.ts`, `src/core/partida.test.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `tests/e2e/barra-tempo.spec.ts`
**Interfaces:** Consumes: `reduzir`, `EstadoCard`, `TEMPOS` (`src/core/partida.ts`); `TelaCard`, `BarraTempo` (`src/app/Telas.tsx`, Fases 10 e 14). Produces: nenhum nome novo. `EstadoCard` perde o campo `saibaMaisOciosoMs` e `TEMPOS` perde `saibaMaisOciosoMs`; o cronômetro do card só pausa por ausência.

Causa raiz (investigação do bug "a barrinha trava com o saiba mais"): no `case 'card'` de `reduzir`, o ramo `if (base.saibaMais)` só incrementava `saibaMaisOciosoMs` e retornava antes de descontar `restanteMs`. Com `restanteMs` constante, a barra de tempo e a sua animação (largura com `transition`) ficavam paradas; depois de 5 s sem gesto, o "saiba mais" fechava sozinho e o tempo voltava. Isso era o que a spec v1.x–v4.0.0 mandava (AC-3.1, AC-3.2, AC-3.5, FR-1); a v5.0.0 reescreve. Reproduzido em 6 passos: com o "saiba mais" aberto o `restanteMs` ficou em 11,0 s por 4,9 s.

Itens invalidados pela v5.0.0:
- o teste `AC-3.1/AC-3.2: saiba mais pausa e retoma o cronômetro`
- o teste `AC-3.5: saiba mais fecha sozinho após 5 s`
- o teste de E2E `AC-4.7 … com "saiba mais" aberto, não` (agora o card pulsa)
- o caso `saiba mais` do `it.each` de AC-4.7 em `Telas.test.tsx`
- o campo `saibaMaisOciosoMs` e a constante `TEMPOS.saibaMaisOciosoMs`

- [ ] Em `src/core/partida.test.ts`, substituir os dois testes invalidados por:
  ```ts
  it('AC-3.1/AC-3.2 (v5.0.0): o cronômetro continua correndo com o saiba mais aberto', () => {
    const s = rodar(emCard(), [tick(1000), { tipo: 'saibaMais' }, tick(3000)]);
    expect(s).toMatchObject({ saibaMais: true, restanteMs: 11000 });
    expect(rodar(s, [{ tipo: 'saibaMais' }, tick(1000)])).toMatchObject({ saibaMais: false, restanteMs: 10000 });
  });
  it('v5.0.0: o saiba mais não fecha sozinho; o tempo esgotando leva ao feedback "tempo" (AC-4.3)', () => {
    const s = rodar(emCard(), [{ tipo: 'saibaMais' }, tick(10000)]);
    expect(s).toMatchObject({ tela: 'card', saibaMais: true, restanteMs: 5000 });
    const fim = rodar(s, [tick(5000)]);
    if (fim.tela !== 'feedback') throw new Error(fim.tela);
    expect(fim.partida.resultados).toEqual(['tempo']);
  });
  it('AC-5.3 (v5.0.0): "Volte para o centro" ainda pausa o cronômetro, mesmo com o saiba mais aberto', () => {
    const s = rodar(emCardCalibrado(), [{ tipo: 'saibaMais' }, tick(1000), tick(4000, ninguem)]);
    expect(s).toMatchObject({ saibaMais: true, ausenteMs: 4000, restanteMs: 14000 });
  });
  ```
- [ ] Em `src/app/Telas.test.tsx`, substituir o `it.each([['saiba mais', …], ['Volte para o centro', …]])` de AC-4.7 por:
  ```tsx
  it('AC-4.7 (v5.0.0): pausado por "Volte para o centro" não pulsa', () => {
    const { container } = render(<TelaCard {...props} ausente restanteMs={3000} />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
  });
  it('AC-4.7 (v5.0.0): com o saiba mais aberto o cronômetro corre, então o card pulsa nos últimos 5 s', () => {
    const { container } = render(<TelaCard {...props} saibaMais restanteMs={3000} />);
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    expect(screen.getByRole('timer').className).toMatch(/barraAlerta/);
  });
  ```
- [ ] Em `tests/e2e/barra-tempo.spec.ts`, substituir o teste `AC-4.7 … com "saiba mais" aberto, não` por:
  ```ts
  test('AC-3.1/AC-4.7 (v5.0.0): com o "saiba mais" aberto a barra continua diminuindo, ele não fecha sozinho e o card pulsa nos últimos 5 s', async ({ page }) => {
    test.setTimeout(30_000);
    const card = page.locator('article');
    const barra = page.getByRole('timer', { name: 'Tempo restante' });
    const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
    await page.keyboard.press('ArrowUp');
    await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
    const antes = await largura();
    await page.waitForTimeout(2000);
    expect(await largura()).toBeLessThan(antes);                       // não trava
    await page.waitForTimeout(4500);                                    // passa dos 5 s do antigo fechamento automático
    await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
    await expect(barra).toHaveText(/^[0-9] s$/, { timeout: 10_000 });   // chegou nos últimos segundos
    await expect(page.locator('article')).toHaveClass(/pulsando/);
  });
  ```
- [ ] Rodar `npx vitest run src/core/partida.test.ts src/app/Telas.test.tsx` e `npm run fixture && npx vite build && npx playwright test tests/e2e/barra-tempo.spec.ts`. Esperado: FAIL nos testes novos (o tempo ainda pausa).
- [ ] Em `src/core/partida.ts`:
  - Apagar `saibaMaisOciosoMs: 5000,` de `TEMPOS` e `saibaMaisOciosoMs: number;` de `EstadoCard`.
  - Em `card()`, trocar o retorno por `{ tela: 'card', partida, indice, restanteMs: tempoCardMs, saibaMais: false, ausenteMs: null }`.
  - Trocar a linha do evento por `if (evento.tipo === 'saibaMais') return { ...estado, saibaMais: !estado.saibaMais };`.
  - Apagar o bloco `if (base.saibaMais) { … }` inteiro. As duas últimas linhas do ramo passam a valer sempre (o "saiba mais" aberto não impede de descontar o tempo):
    ```ts
    const base: EstadoCard = { ...estado, ausenteMs: null };
    const restanteMs = base.restanteMs - evento.dtMs;
    return restanteMs <= 0 ? registrar(base, 'tempo', null) : { ...base, restanteMs };
    ```
- [ ] Em `src/app/Telas.tsx`, trocar a linha do pulso por:
  ```tsx
  const pulsando = alerta && !ausente; // AC-4.7: só "Volte para o centro" pausa o cronômetro (v5.0.0)
  ```
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 25 mantidos, com o teste de AC-4.7 reescrito). Se `tsc` apontar algum outro uso de `saibaMaisOciosoMs`, remover o uso e informar.
- [ ] Commit: `fix(partida): timer keeps running with saiba mais open, no auto-close (Phase 16: Tempo corre no saiba mais)`

---

## Phase 17 (added v5.0.0): Verificação do "saiba mais" no hardware

**Implements:** FR-1 | **Satisfies:** AC-3.1, AC-3.2 (hardware)

- [ ] Com a câmera real, abrir o "saiba mais" pelo gesto de cada modo: a barra continua diminuindo e o texto continua na tela até repetir o gesto, escolher ou o tempo acabar.
- [ ] Conferir se o tempo configurado (15 s) basta para ler o "saiba mais" e decidir; se não, aumentar o tempo por card nas Configurações (até 30 s).

---

## Phase 18 (added v5.1.0): Configurações no canto superior direito

**Implements:** FR-9 (apresentação) | **Satisfies:** AC-9.1, AC-9.3, AC-9.18
**Files:** `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.module.css`, `tests/e2e/configuracoes.spec.ts`
**Interfaces:** Consumes: `TelaEspera`, `MenuConfiguracoes` (`src/app/Telas.tsx`, Fase 10) e `useConfiguracoes` (sem mudança). Produces: nenhum nome novo; o botão passa a ter nome acessível "Configurações" e o "✕" do painel, "Fechar".

Só muda a apresentação: o botão "⚙ Configurações" sai do centro da espera e vira um ícone "⚙" fixo no canto superior direito; o diálogo centralizado vira um painel encostado à direita. Itens, teclas (M, ↑↓←→, Esc/M/Enter), regras de abertura (só na espera) e gravação não mudam.

- [ ] Em `src/app/Telas.test.tsx`, no teste `AC-9.2/AC-10.1: espera mostra o resumo, Iniciar e Configurações`, trocar `screen.getByRole('button', { name: '⚙ Configurações' })` por `screen.getByRole('button', { name: 'Configurações' })` e acrescentar, logo depois do render:
  ```tsx
  expect(screen.getByRole('button', { name: 'Configurações' })).toHaveTextContent('⚙');
  ```
- [ ] Em `src/app/Telas.test.tsx`, no teste `AC-9.1: menu mostra os três itens…`, acrescentar no fim:
  ```tsx
  // AC-9.3/AC-9.18: o "✕" no topo do painel fecha
  const fechar = screen.getByRole('button', { name: 'Fechar' });
  expect(fechar).toHaveTextContent('✕');
  ```
- [ ] Em `tests/e2e/configuracoes.spec.ts`, trocar `page.getByRole('button', { name: '⚙ Configurações' })` por `page.getByRole('button', { name: 'Configurações' })`, e acrescentar o teste:
  ```ts
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
  ```
- [ ] Rodar `npx vitest run src/app` e `npm run fixture && npx vite build && npx playwright test tests/e2e/configuracoes.spec.ts`. Esperado: FAIL.
- [ ] Em `src/app/Telas.tsx`, `TelaEspera`: tirar o botão "⚙ Configurações" de dentro de `.botoes` (fica só o "▶ Iniciar") e acrescentar, como último filho do `<main>`:
  ```tsx
  <button
    type="button"
    className={s.botaoConfig}
    aria-label="Configurações"
    title="Configurações (M)"
    onClick={(e) => { e.currentTarget.blur(); onAbrirMenu(); }}
  >
    ⚙
  </button>
  ```
- [ ] Em `src/app/Telas.tsx`, `MenuConfiguracoes`: trocar a classe do contêiner `s.sobreposicao` por `s.painel`; trocar `<h2>Configurações</h2>` por
  ```tsx
  <div className={s.cabecalhoMenu}>
    <h2>Configurações</h2>
    <button type="button" aria-label="Fechar" onClick={onFechar}>✕</button>
  </div>
  ```
  e remover o `<button type="button" onClick={onFechar}>Fechar</button>` do fim.
- [ ] Em `src/app/App.module.css`: remover `.botaoModo`; em `.menu`, trocar `border-radius: 1.5rem;` por `border-radius: 0;`; acrescentar:
  ```css
  .botaoConfig { position: absolute; top: 1rem; right: 1rem; z-index: 2; width: 3.25rem; height: 3.25rem; border-radius: 50%; border: 2px solid #fff; background: rgb(27 16 53 / 0.7); color: #fff; font-size: 1.6rem; line-height: 1; cursor: pointer; }
  .painel { position: absolute; inset: 0; z-index: 3; display: flex; justify-content: flex-end; background: rgb(27 16 53 / 0.6); }
  .painel > .menu { height: 100%; width: min(26rem, 100vw); max-width: none; box-sizing: border-box; overflow-y: auto; animation: entraPainel 0.2s ease-out; }
  .cabecalhoMenu { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .cabecalhoMenu h2 { margin: 0; }
  @keyframes entraPainel { from { transform: translateX(100%); } }
  ```
  (o `.menu` já é a classe do filho direto do diálogo.)
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 25 + 1 = 26).
- [ ] Manual (junto com a Fase 15): na TV do estande, conferir que o "⚙" é fácil de achar e que o painel é legível.
- [ ] Commit: `feat(app): settings button in the top-right corner with a right-side panel (Phase 18: Configurações no canto)`

---

## Phase 19 (added v5.2.0): Modo de diagnóstico

**Implements:** FR-12, Story 12 | **Satisfies:** AC-12.1–AC-12.6
**Files:** `src/core/gestos.ts`, `src/core/gestos-medidas.test.ts`, `src/core/diagnostico.ts`, `src/core/diagnostico.test.ts`, `src/app/useJogo.ts`, `src/app/PainelDiagnostico.tsx`, `src/app/PainelDiagnostico.test.tsx`, `src/app/baixar.ts`, `src/app/App.tsx`, `src/app/App.module.css`, `tests/e2e/diagnostico.spec.ts`, `docs/operacao.md`
**Interfaces:** Consumes: `Pose`, `Gesto`, `CONFIG_GESTOS`, `escolherJogador`, `criarInterpretador` (`src/core/gestos.ts`); `ModoJogo`, `MODO_ROTULO` (`src/core/modos.ts`); `useJogo` (`src/app/useJogo.ts`). Produces:
- de `src/core/gestos.ts`: `ConfigGestos`, `MedidaMaos`, `medirMaos(pose, cfg?)`, `MedidaCabeca`, `medirCabeca(pose)`. Os interpretadores Mão e Cabeça passam a usá-las, sem mudar o comportamento.
- de `src/core/diagnostico.ts`: `PONTOS_DIAGNOSTICO`, `NomePonto`, `PontoMedido`, `Amostra`, `extrairPontos(pose)`, `Resumo`, `Registro`, `criarRegistro(janelaMs?, agoraIso?)`.
- `PainelDiagnostico({ registro, onBaixar })`.
- `baixarJson(dados, nome?)`.
- `useJogo(noticias, config, pausado, registro?)`.

Objetivo: medir no notebook real o custo da detecção de pose e o que ela enxerga das mãos e da cabeça, para ajustar `CONFIG_GESTOS` com dados (ver a lição `docs/lessons/2026-10-28-relogio-preso-aos-quadros.md`). O rastreio, os limites e o jogo não mudam.

Decisões técnicas (inline):
- **Ativação:** `new URLSearchParams(location.search).has('diagnostico')`, lido uma vez na montagem. Sem o parâmetro, `useJogo` recebe `registro` indefinido e não grava nada (AC-12.1).
- **Fórmulas sem duplicação:** as fórmulas das mãos (punho acima do ombro com `margemMaoOmbro`) e da cabeça (inclinação pelas orelhas, queixo pelo nariz) saem dos interpretadores para `medirMaos`/`medirCabeca`. O jogo e o diagnóstico usam o mesmo código (FR-12).
- **Memória limitada:** o registro guarda só os últimos 60 s, cerca de 1800 amostras a 30 fps.
- **Download local:** `Blob` + `<a download>`; nada vai para a rede nem para o `localStorage` (AC-12.5).

### 19.1 Medidas compartilhadas (gestos)

- [ ] Escrever `src/core/gestos-medidas.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { CONFIG_GESTOS, medirCabeca, medirMaos, type Pose } from './gestos';

  function base(): Pose {
    const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
    p[0] = { x: 0.5, y: 0.33, visibility: 1 };
    p[7] = { x: 0.55, y: 0.3, visibility: 1 };
    p[8] = { x: 0.45, y: 0.3, visibility: 1 };
    p[11] = { x: 0.6, y: 0.45, visibility: 1 };
    p[12] = { x: 0.4, y: 0.45, visibility: 1 };
    p[15] = { x: 0.65, y: 0.7, visibility: 1 };
    p[16] = { x: 0.35, y: 0.7, visibility: 1 };
    return p;
  }

  describe('medidas compartilhadas', () => {
    it('medirMaos: punho acima do ombro menos a margem', () => {
      const p = base();
      expect(medirMaos(p)).toEqual({ direita: false, esquerda: false });
      p[16] = { ...p[16]!, y: 0.45 - CONFIG_GESTOS.margemMaoOmbro - 0.01 };
      expect(medirMaos(p)).toEqual({ direita: true, esquerda: false });
      p[15] = { ...p[15]!, y: 0.45 - CONFIG_GESTOS.margemMaoOmbro + 0.01 };   // dentro da margem: não conta
      expect(medirMaos(p).esquerda).toBe(false);
    });
    it('medirCabeca: inclinação em graus pelas orelhas e queixo pelo nariz', () => {
      const p = base();
      expect(medirCabeca(p).rollGraus).toBeCloseTo(0, 5);
      expect(medirCabeca(p).queixo).toBeCloseTo(-0.3, 5);
      p[7] = { ...p[7]!, y: 0.3 - Math.tan((20 * Math.PI) / 180) * 0.05 };
      p[8] = { ...p[8]!, y: 0.3 + Math.tan((20 * Math.PI) / 180) * 0.05 };
      expect(medirCabeca(p).rollGraus).toBeCloseTo(20, 3);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/gestos-medidas.test.ts`. Esperado: FAIL (as funções não existem).
- [ ] Em `src/core/gestos.ts`:
  - trocar `type Config = typeof CONFIG_GESTOS;` por `export type ConfigGestos = typeof CONFIG_GESTOS;\ntype Config = ConfigGestos;`
  - acrescentar, logo depois de `function presenca(...)`:
    ```ts
    export interface MedidaMaos { direita: boolean; esquerda: boolean }

    /** Mão acima do ombro pela regra do modo Mão (AC-9.7). Lados anatômicos do jogador. */
    export function medirMaos(pose: Pose, cfg: Config = CONFIG_GESTOS): MedidaMaos {
      const acima = (punho: number, ombro: number) => pose[punho]!.y < pose[ombro]!.y - cfg.margemMaoOmbro;
      return { direita: acima(PUNHO_D, OMBRO_D), esquerda: acima(PUNHO_E, OMBRO_E) };
    }

    export interface MedidaCabeca { rollGraus: number; queixo: number }

    /** Inclinação (graus; + = própria direita) e queixo (+ = olhando para cima) do modo Cabeça (AC-9.10, AC-9.11). */
    export function medirCabeca(pose: Pose): MedidaCabeca {
      const oe = pose[ORELHA_E]!, od = pose[ORELHA_D]!, nariz = pose[NARIZ]!;
      const dist = Math.max(Math.abs(oe.x - od.x), 1e-6);
      // Orelha direita mais baixa que a esquerda = cabeça inclinada para a própria direita.
      const rollGraus = (Math.atan2(od.y - oe.y, dist) * 180) / Math.PI;
      // Nariz subindo em relação às orelhas = queixo para cima.
      const queixo = ((oe.y + od.y) / 2 - nariz.y) / dist;
      return { rollGraus, queixo };
    }
    ```
  - em `interpretadorMao`, trocar as três linhas `const acima = …`, `const dir = …` e `const esq = …` por `const { direita: dir, esquerda: esq } = medirMaos(pose, cfg);`
  - em `interpretadorCabeca`, trocar o bloco que calcula `oe`, `od`, `nariz`, `dist`, `roll` e `q` (com os dois comentários) por `const { rollGraus: roll, queixo: q } = medirCabeca(pose);`
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS, com todos os testes antigos de gestos (`gestos.test.ts`, `gestos-modos.test.ts`) inalterados e passando.
- [ ] Commit: `refactor(gestos): share hand and head measurements (Phase 19.1: Medidas compartilhadas)`

### 19.2 Registro de diagnóstico (núcleo)

- [ ] Escrever `src/core/diagnostico.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { criarRegistro, extrairPontos, type Amostra } from './diagnostico';
  import type { Pose } from './gestos';

  const amostra = (t: number, over: Partial<Amostra> = {}): Amostra => ({
    t, dtMs: 33, deteccaoMs: 20, pessoas: 1, tela: 'card', modo: 'mao', pontos: {}, medidas: {}, gestos: [], ...over,
  });

  describe('extrairPontos', () => {
    it('pega nariz, orelhas, ombros e punhos com x, y e confiança (3 casas)', () => {
      const pose: Pose = Array.from({ length: 33 }, (_, i) => ({ x: i / 100, y: 0.123456, visibility: 0.98765 }));
      const p = extrairPontos(pose);
      expect(Object.keys(p).sort()).toEqual(['nariz', 'ombroD', 'ombroE', 'orelhaD', 'orelhaE', 'punhoD', 'punhoE']);
      expect(p.punhoD).toEqual({ x: 0.16, y: 0.123, conf: 0.988 });
      expect(extrairPontos(null)).toEqual({});
    });
    it('confiança ausente vira 0', () => {
      const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
      expect(extrairPontos(pose).nariz!.conf).toBe(0);
    });
  });

  describe('criarRegistro', () => {
    it('AC-12.4: guarda só a janela de 60 s', () => {
      const r = criarRegistro();
      for (let t = 0; t <= 70_000; t += 1000) r.adicionar(amostra(t));
      const exp = r.exportar();
      expect(exp.amostras[0]!.t).toBe(10_000);
      expect(exp.amostras.at(-1)!.t).toBe(70_000);
    });
    it('AC-12.3: resumo do último segundo (quadros, detecção média e máxima, gestos dos últimos 5 s)', () => {
      const r = criarRegistro();
      r.adicionar(amostra(500, { gestos: ['direita'] }));
      r.adicionar(amostra(5600, { deteccaoMs: 100 }));
      r.adicionar(amostra(5800, { deteccaoMs: 140 }));
      r.adicionar(amostra(6000, { deteccaoMs: null, gestos: ['maosParaCima'] }));
      const res = r.resumo(6000);
      expect(res.fps).toBe(3);
      expect(res.deteccaoMediaMs).toBe(120);
      expect(res.deteccaoMaxMs).toBe(140);
      expect(res.gestosRecentes).toEqual(['maosParaCima']);
      expect(r.ultima()!.t).toBe(6000);
    });
    it('sem amostras com detecção, as médias são null', () => {
      const r = criarRegistro();
      r.adicionar(amostra(100, { deteccaoMs: null }));
      expect(r.resumo(100)).toMatchObject({ fps: 1, deteccaoMediaMs: null, deteccaoMaxMs: null });
    });
    it('AC-12.4: exportar devolve versão, data e cópia das amostras', () => {
      const r = criarRegistro(60_000, () => '2026-10-28T12:00:00.000Z');
      r.adicionar(amostra(1));
      const exp = r.exportar();
      expect(exp).toMatchObject({ versao: 1, geradoEm: '2026-10-28T12:00:00.000Z' });
      exp.amostras.pop();
      expect(r.exportar().amostras).toHaveLength(1);
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/diagnostico.test.ts`. Esperado: FAIL.
- [ ] Criar `src/core/diagnostico.ts`:
  ```ts
  import type { Gesto, MedidaCabeca, MedidaMaos, Pose } from './gestos';
  import type { ModoJogo } from './modos';

  /** Pontos do MediaPipe Pose guardados no diagnóstico (lados anatômicos do jogador). */
  export const PONTOS_DIAGNOSTICO = { nariz: 0, orelhaE: 7, orelhaD: 8, ombroE: 11, ombroD: 12, punhoE: 15, punhoD: 16 } as const;
  export type NomePonto = keyof typeof PONTOS_DIAGNOSTICO;
  export interface PontoMedido { x: number; y: number; conf: number }

  export interface Amostra {
    t: number;
    dtMs: number;
    /** null quando não houve detecção (sem câmera ou menu aberto sem rastreador). */
    deteccaoMs: number | null;
    pessoas: number;
    tela: string;
    modo: ModoJogo;
    pontos: Partial<Record<NomePonto, PontoMedido>>;
    medidas: { maos?: MedidaMaos; cabeca?: MedidaCabeca };
    gestos: Gesto[];
  }

  const arred = (v: number) => Math.round(v * 1000) / 1000;

  export function extrairPontos(pose: Pose | null): Amostra['pontos'] {
    if (!pose) return {};
    const out: Amostra['pontos'] = {};
    for (const [nome, i] of Object.entries(PONTOS_DIAGNOSTICO) as [NomePonto, number][]) {
      const p = pose[i];
      if (p) out[nome] = { x: arred(p.x), y: arred(p.y), conf: arred(p.visibility ?? 0) };
    }
    return out;
  }

  export interface Resumo {
    fps: number;
    deteccaoMediaMs: number | null;
    deteccaoMaxMs: number | null;
    gestosRecentes: Gesto[];
  }

  export interface Registro {
    adicionar(a: Amostra): void;
    resumo(agora: number): Resumo;
    ultima(): Amostra | null;
    exportar(): { versao: 1; geradoEm: string; amostras: Amostra[] };
  }

  export function criarRegistro(janelaMs = 60_000, agoraIso: () => string = () => new Date().toISOString()): Registro {
    let amostras: Amostra[] = [];
    return {
      adicionar(a) {
        amostras.push(a);
        const limite = a.t - janelaMs;
        if (amostras[0]!.t < limite) amostras = amostras.filter((x) => x.t >= limite);
      },
      resumo(agora) {
        const ultimoSegundo = amostras.filter((a) => a.t > agora - 1000);
        const det = ultimoSegundo.map((a) => a.deteccaoMs).filter((d): d is number => d !== null);
        return {
          fps: ultimoSegundo.length,
          deteccaoMediaMs: det.length ? Math.round(det.reduce((s, d) => s + d, 0) / det.length) : null,
          deteccaoMaxMs: det.length ? Math.round(Math.max(...det)) : null,
          gestosRecentes: amostras.filter((a) => a.t > agora - 5000).flatMap((a) => a.gestos),
        };
      },
      ultima() {
        return amostras.at(-1) ?? null;
      },
      exportar() {
        return { versao: 1, geradoEm: agoraIso(), amostras: [...amostras] };
      },
    };
  }
  ```
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS.
- [ ] Commit: `feat(diagnostico): 60 s in-memory measurement log (Phase 19.2: Registro)`

### 19.3 Painel, gravação no laço e download

- [ ] Escrever `src/app/PainelDiagnostico.test.tsx`:
  ```tsx
  // @vitest-environment jsdom
  import { fireEvent, render, screen } from '@testing-library/react';
  import { describe, expect, it, vi } from 'vitest';
  import { criarRegistro } from '../core/diagnostico';
  import { PainelDiagnostico } from './PainelDiagnostico';

  describe('PainelDiagnostico', () => {
    it('AC-12.3: mostra quadros, detecção, pessoas, pontos, mãos, cabeça e gestos', () => {
      const r = criarRegistro();
      const agora = performance.now();
      r.adicionar({
        t: agora, dtMs: 140, deteccaoMs: 138, pessoas: 1, tela: 'card', modo: 'mao',
        pontos: { punhoD: { x: 0.3, y: 0.31, conf: 0.92 }, punhoE: { x: 0.7, y: 0.71, conf: 0.4 }, ombroD: { x: 0.4, y: 0.45, conf: 0.99 }, ombroE: { x: 0.6, y: 0.46, conf: 0.98 } },
        medidas: { maos: { direita: true, esquerda: false }, cabeca: { rollGraus: 3.2, queixo: -0.28 } },
        gestos: ['direita'],
      });
      render(<PainelDiagnostico registro={r} onBaixar={() => {}} />);
      const painel = screen.getByRole('complementary', { name: 'Diagnóstico' });
      expect(painel).toHaveTextContent('quadros/s: 1');
      expect(painel).toHaveTextContent('detecção: 138 ms (máx 138 ms)');
      expect(painel).toHaveTextContent('pessoas: 1 · modo: Mão · tela: card');
      expect(painel).toHaveTextContent('punho D: y=0.31 conf 0.92 · acima do ombro');
      expect(painel).toHaveTextContent('punho E: y=0.71 conf 0.40');
      expect(painel).toHaveTextContent('ombros: y=0.45 / 0.46');
      expect(painel).toHaveTextContent('cabeça: 3.2° · queixo -0.28');
      expect(painel).toHaveTextContent('gestos (5 s): direita');
    });
    it('sem câmera, a detecção mostra "sem câmera"', () => {
      const r = criarRegistro();
      r.adicionar({ t: performance.now(), dtMs: 16, deteccaoMs: null, pessoas: 0, tela: 'espera', modo: 'corpo', pontos: {}, medidas: {}, gestos: [] });
      render(<PainelDiagnostico registro={r} onBaixar={() => {}} />);
      expect(screen.getByRole('complementary', { name: 'Diagnóstico' })).toHaveTextContent('detecção: sem câmera');
    });
    it('AC-12.4: o botão chama onBaixar', () => {
      const baixar = vi.fn();
      render(<PainelDiagnostico registro={criarRegistro()} onBaixar={baixar} />);
      fireEvent.click(screen.getByRole('button', { name: 'Baixar registro (60 s)' }));
      expect(baixar).toHaveBeenCalledOnce();
    });
  });
  ```
- [ ] Escrever `tests/e2e/diagnostico.spec.ts`:
  ```ts
  import { readFile } from 'node:fs/promises';
  import { expect, test, type Page } from '@playwright/test';

  const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

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

    await page.keyboard.press('Enter');
    const card = page.locator('article');
    await expect(card).toBeVisible();
    const [a, b] = [(await painel.boundingBox())!, (await card.boundingBox())!];
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Baixar registro (60 s)' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^match-do-saber-diagnostico-.*\.json$/);
    const dados = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(dados.versao).toBe(1);
    expect(dados.amostras.length).toBeGreaterThan(10);
    expect(dados.amostras.at(-1)).toMatchObject({ tela: 'card', deteccaoMs: null, pessoas: 0 });
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('match-do-saber:')))).toEqual([]);
    expect(externas).toEqual([]);
  });

  test.describe('com câmera falsa', () => {
    test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }, permissions: ['camera'] });
    test('AC-12.3: com a câmera ativa, o painel mostra o tempo de detecção em ms', async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto('/?diagnostico');
      await page.waitForSelector('video', { state: 'visible', timeout: 30_000 });
      await expect(page.getByRole('complementary', { name: 'Diagnóstico' })).toContainText(/detecção: \d+ ms \(máx \d+ ms\)/, { timeout: 30_000 });
    });
  });
  ```
- [ ] Rodar `npx vitest run src/app` e `npm run fixture && npx vite build && npx playwright test tests/e2e/diagnostico.spec.ts`. Esperado: FAIL (exceto AC-12.1, que já passa: não há painel algum).
- [ ] Criar `src/app/baixar.ts`:
  ```ts
  /** Salva `dados` como arquivo JSON no computador (download local; nada vai para a rede). */
  export function baixarJson(dados: unknown, nome = `match-do-saber-diagnostico-${new Date().toISOString().replace(/[:.]/g, '-')}.json`): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  ```
- [ ] Criar `src/app/PainelDiagnostico.tsx`:
  ```tsx
  import { useEffect, useState } from 'react';
  import type { PontoMedido, Registro } from '../core/diagnostico';
  import { MODO_ROTULO } from '../core/modos';
  import s from './App.module.css';

  const n2 = (v: number) => v.toFixed(2);
  const linhaPunho = (rotulo: string, p: PontoMedido | undefined, acima: boolean | undefined) =>
    p ? `${rotulo}: y=${n2(p.y)} conf ${n2(p.conf)}${acima ? ' · acima do ombro' : ''}` : `${rotulo}: —`;

  /** Painel do modo de diagnóstico (FR-12, AC-12.3); atualiza a cada 500 ms. */
  export function PainelDiagnostico({ registro, onBaixar }: { registro: Registro; onBaixar: () => void }) {
    const [agora, setAgora] = useState(() => performance.now());
    useEffect(() => {
      const id = setInterval(() => setAgora(performance.now()), 500);
      return () => clearInterval(id);
    }, []);
    const r = registro.resumo(agora);
    const a = registro.ultima();
    const det = r.deteccaoMediaMs === null ? 'sem câmera' : `${r.deteccaoMediaMs} ms (máx ${r.deteccaoMaxMs} ms)`;
    const od = a?.pontos.ombroD, oe = a?.pontos.ombroE;
    const cab = a?.medidas.cabeca;
    return (
      <aside className={s.diagnostico} aria-label="Diagnóstico">
        <p>{`quadros/s: ${r.fps}`}</p>
        <p>{`detecção: ${det}`}</p>
        <p>{`pessoas: ${a?.pessoas ?? 0} · modo: ${a ? MODO_ROTULO[a.modo] : '—'} · tela: ${a?.tela ?? '—'}`}</p>
        <p>{linhaPunho('punho D', a?.pontos.punhoD, a?.medidas.maos?.direita)}</p>
        <p>{linhaPunho('punho E', a?.pontos.punhoE, a?.medidas.maos?.esquerda)}</p>
        <p>{od && oe ? `ombros: y=${n2(od.y)} / ${n2(oe.y)}` : 'ombros: —'}</p>
        <p>{cab ? `cabeça: ${cab.rollGraus.toFixed(1)}° · queixo ${n2(cab.queixo)}` : 'cabeça: —'}</p>
        <p>{`gestos (5 s): ${r.gestosRecentes.join(', ') || '—'}`}</p>
        <button type="button" onClick={(e) => { e.currentTarget.blur(); onBaixar(); }}>Baixar registro (60 s)</button>
      </aside>
    );
  }
  ```
- [ ] Alterar `src/app/useJogo.ts`:
  - imports: `import { extrairPontos, type Registro } from '../core/diagnostico';` e acrescentar `medirCabeca, medirMaos` ao import de `../core/gestos`.
  - assinatura: `export function useJogo(noticias: Noticia[], config: Configuracoes = CONFIG_PADRAO, pausado = false, registro?: Registro) {`
  - logo depois de `pausadoRef.current = pausado;`:
    ```ts
    // Só para o modo de diagnóstico (FR-12): o laço lê a tela e o modo atuais sem recriar o efeito.
    const diagRef = useRef({ registro, tela: estado.tela as string, modo: config.modo });
    diagRef.current = { registro, tela: estado.tela, modo: config.modo };
    ```
    (`estado` já existe nesse ponto do hook: se a declaração de `estado` vier depois, mover estas duas linhas para logo depois dela.)
  - no laço, trocar o ramo com rastreador por:
    ```ts
    if (r && video && video.readyState >= 2) {
      const antesDeteccao = performance.now();
      const poses = r.detectar(video, agora);
      const deteccaoMs = performance.now() - antesDeteccao;
      const pose = escolherJogador(poses);
      poseRef.current = pose;
      const leitura = interp.current.ler(pose, agora);
      // Com o menu "Configurações" aberto, a câmera não gera presença nem gestos.
      inclinacaoRef.current = pausadoRef.current ? 0 : leitura.inclinacao;
      despachar({ tipo: 'tick', dtMs, presenca: pausadoRef.current ? null : leitura.presenca });
      if (!pausadoRef.current) for (const g of leitura.gestos) despachar(EVENTO_DO_GESTO[g]);
      const d = diagRef.current;
      d.registro?.adicionar({
        t: agora, dtMs, deteccaoMs, pessoas: poses.length, tela: d.tela, modo: d.modo,
        pontos: extrairPontos(pose),
        medidas: pose ? { maos: medirMaos(pose), cabeca: medirCabeca(pose) } : {},
        gestos: pausadoRef.current ? [] : leitura.gestos,
      });
    } else {
    ```
    e, no fim do ramo `else` (depois do `despachar({ tipo: 'tick', … presenca: null })`):
    ```ts
      const d = diagRef.current;
      d.registro?.adicionar({ t: agora, dtMs, deteccaoMs: null, pessoas: 0, tela: d.tela, modo: d.modo, pontos: {}, medidas: {}, gestos: [] });
    ```
- [ ] Alterar `src/app/App.tsx`, função `Jogo`:
  ```tsx
  import { criarRegistro } from '../core/diagnostico';
  import { baixarJson } from './baixar';
  import { PainelDiagnostico } from './PainelDiagnostico';
  // ...
  // Modo de diagnóstico (FR-12): só com ?diagnostico no endereço.
  const diagnostico = useMemo(() => (new URLSearchParams(window.location.search).has('diagnostico') ? criarRegistro() : undefined), []);
  const { estado, despachar, camera, videoRef, poseRef } = useJogo(noticias, cfg.config, cfg.menuAberto, diagnostico);
  ```
  e, no retorno, logo antes do `<CameraPreview …/>`:
  ```tsx
  {diagnostico && <PainelDiagnostico registro={diagnostico} onBaixar={() => baixarJson(diagnostico.exportar())} />}
  ```
  (`useMemo` entra no import de `react`.)
- [ ] Acrescentar a `src/app/App.module.css`:
  ```css
  /* Modo de diagnóstico (FR-12): canto superior esquerdo, abaixo do "✕ Sair", fora da coluna do card. */
  .diagnostico { position: absolute; top: 4.5rem; left: 1rem; z-index: 4; max-width: 19rem; box-sizing: border-box; padding: 0.6rem 0.8rem; border-radius: 0.5rem; background: rgb(0 0 0 / 0.78); color: #7cff6b; font: 0.85rem/1.35 ui-monospace, Menlo, monospace; }
  .diagnostico p { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .diagnostico button { margin-top: 0.5rem; font: inherit; padding: 0.3rem 0.6rem; border-radius: 0.4rem; border: 1px solid #7cff6b; background: transparent; color: #7cff6b; cursor: pointer; }
  ```
- [ ] Em `docs/operacao.md`, acrescentar ao fim:
  ```markdown
  ## Diagnóstico do rastreio (equipe técnica)
  Para medir o rastreio no notebook do estande antes de ajustar os gestos:
  1. Abrir o jogo com `?diagnostico` no fim do endereço (por exemplo `…/match-do-saber/?diagnostico`). O operador do evento usa o endereço normal.
  2. Com a câmera ligada, ficar a ~1,5–2 m (ou sentado, nos modos Mão e Cabeça) e jogar uma partida em cada modo, levantando cada mão e as duas, inclinando a cabeça e levantando o queixo.
  3. Logo depois de cada tentativa, clicar em "Baixar registro (60 s)" e enviar o arquivo `.json` para a equipe técnica, dizendo o modo e o que tentou fazer.
  O painel mostra quadros por segundo e tempo de detecção (meta: ≥ 15 quadros/s), e o registro não contém imagens da câmera.
  ```
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 27 + 3 = 30).
- [ ] Commit: `feat(app): diagnostic panel and downloadable log behind ?diagnostico (Phase 19.3: Painel e registro)`

---

## Phase 20 (added v6.0.0): Gestos novos do modo Mão e ausência só no modo Corpo

**Implements:** FR-9 (modo Mão; ausência por modo), FR-1, FR-12 (medidas) | **Satisfies:** AC-9.19, AC-9.20, AC-9.21, AC-9.22, AC-5.3–5.5 (só Corpo), AC-12.3
**Files:** `src/core/gestos.ts`, `src/core/gestos-mao-v6.test.ts`, `src/core/gestos-medidas.test.ts`, `src/core/partida.ts`, `src/core/partida.test.ts`, `src/app/useJogo.ts`, `src/app/PainelDiagnostico.tsx`, `src/app/PainelDiagnostico.test.tsx`
**Interfaces:** Consumes: `medirMaos`, `MedidaMaos`, `CONFIG_GESTOS`, `criarInterpretador('mao')` (`src/core/gestos.ts`, Fases 8.2 e 19.1); `reduzir`, `Contexto` (`src/core/partida.ts`); `useJogo` (Fase 19.3). Produces:
- `MedidaMaos` ganha `deslocD` e `deslocE`: deslocamento lateral de cada punho a partir do meio do corpo, em larguras de ombro, do ponto de vista do jogador; positivo é a própria direita.
- `CONFIG_GESTOS` ganha `duasMaosLadoL: 0.5`, `centroArrasteL: 0.5`, `arrasteMinL: 1` e `arrasteMaxMs: 800`.
- `Contexto` ganha `ignorarAusencia?: boolean`.

Causa (investigação do bug "no modo Mão a barra não diminui"):
- Com Enter duas vezes (entrada alternativa, que ignora a presença), a barra andou normalmente no notebook da usuária. Com Iniciar e calibração, ela parava.
- A simulação com poses sintéticas mostrou o mecanismo. Com a pessoa detectada, a barra anda direito, inclusive com as mãos levantadas. Ela só para quando a detecção perde a pessoa, e então a pausa por ausência (AC-5.3) segura o tempo: perdendo 70% dos quadros, a barra contou 1,8 s em 6 s reais.
- A v6.0.0 resolve pela regra: nos modos Mão e Cabeça, a ausência não pausa mais.
- Os gestos novos atendem ao pedido de escolher também com as duas mãos para um lado ou arrastando.

Decisões técnicas (inline):
- **Distâncias em larguras de ombro (L):** `L = |x(ombro E) − x(ombro D)|`. O deslocamento de um punho é `(xJogador(punho) − centroTronco) / L`, com `xJogador = 1 − x` (imagem espelhada). Assim as regras valem com o jogador perto ou longe da câmera.
- **Uma postura com tempo de permanência:** "levantar uma mão" e "duas mãos para um lado" viram uma só *postura de lado*, com o mesmo `permanenciaLadoMs` (~300 ms). O arraste é instantâneo: dispara quando a condição se cumpre dentro da janela de 0,8 s.
- **Liberação depois de uma escolha (AC-9.22):** a escolha só é liberada quando nenhuma mão está levantada e não há postura "duas mãos para um lado". O arraste guarda, por punho, o último instante em que o punho esteve no centro; esse registro é consumido ao disparar, e por isso um novo arraste precisa voltar ao centro.
- **Ausência por modo (AC-9.21):** `useJogo` passa `ignorarAusencia: config.modo !== 'corpo'` no `Contexto`. O reducer trata a presença como `null` no card quando a entrada é alternativa ou quando `ignorarAusencia` está ligado. A calibração não muda.

### 20.1 Ausência ignorada nos modos Mão e Cabeça (partida)

- [ ] Em `src/core/partida.test.ts`, acrescentar no fim:
  ```ts
  describe('v6.0.0: ausência só pausa no modo Corpo', () => {
    it('AC-9.21: com ignorarAusencia (Mão/Cabeça), partida calibrada não pausa nem encerra sem ninguém', () => {
      const c = ctx({ ignorarAusencia: true });
      const s0 = emCardCalibrado(c);
      expect(s0.tela).toBe('card');
      const s = rodar(s0, [tick(6000, ninguem), tick(6000, ninguem)], c);
      expect(s).toMatchObject({ tela: 'card', ausenteMs: null, restanteMs: TEMPOS.cardMs - 12000 });
    });
    it('AC-5.3 (modo Corpo): sem ignorarAusencia, a partida calibrada ainda pausa', () => {
      const s = rodar(emCardCalibrado(), [tick(4000, ninguem)]);
      expect(s).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: TEMPOS.cardMs });
    });
    it('a calibração continua exigindo a pessoa no centro, mesmo com ignorarAusencia', () => {
      const c = ctx({ ignorarAusencia: true });
      expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(5000, ninguem), tick(5000, ninguem)], c).tela).toBe('espera');
    });
  });
  ```
- [ ] Rodar `npx vitest run src/core/partida.test.ts`. Esperado: FAIL no primeiro teste.
- [ ] Em `src/core/partida.ts`:
  - no `Contexto`, acrescentar o campo (com o comentário):
    ```ts
    /** v6.0.0 (AC-9.21): nos modos Mão e Cabeça a ausência não pausa nem encerra a partida. */
    ignorarAusencia?: boolean;
    ```
  - no `case 'card'`, trocar
    `const p = estado.partida.entrada === 'alternativa' ? null : evento.presenca;`
    por
    `const p = estado.partida.entrada === 'alternativa' || ctx.ignorarAusencia ? null : evento.presenca;`
    (o comentário acima passa a ser `// Partida pelo teclado/mouse (AC-1.6) ou nos modos Mão/Cabeça (AC-9.21) não depende de presença.`)
- [ ] Em `src/app/useJogo.ts`, nas duas linhas que montam o `Contexto` (`useRef<Contexto>({ … })` e `ctx.current = { … }`), acrescentar `ignorarAusencia: config.modo !== 'corpo'`.
- [ ] Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: PASS e sem erros.
- [ ] Commit: `fix(partida): absence never pauses in Mão and Cabeça modes (Phase 20.1: Ausência por modo)`

### 20.2 Gestos novos do modo Mão

- [ ] Em `src/core/gestos-medidas.test.ts`, trocar os dois `expect(medirMaos(p)).toEqual({ … })` por `toMatchObject` com os mesmos objetos, porque `MedidaMaos` ganha campos. Acrescentar:
  ```ts
  it('v6.0.0: deslocamento lateral dos punhos em larguras de ombro, do ponto de vista do jogador', () => {
    const p = base();                       // ombros em x 0,6 (E) e 0,4 (D): L = 0,2, centro do jogador 0,5
    const m = medirMaos(p);
    expect(m.deslocD).toBeCloseTo(0.75, 5); // punho D cru em x 0,35 → x do jogador 0,65 → +0,15/0,2
    expect(m.deslocE).toBeCloseTo(-0.75, 5);
  });
  ```
- [ ] Escrever `src/core/gestos-mao-v6.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { criarInterpretador, type Pose } from './gestos';

  /**
   * Pose sintética do modo Mão em coordenadas cruas da câmera, com ombros fixos
   * (L = 0,2; centro do jogador 0,5). `d`/`e` = deslocamento lateral de cada punho em L
   * (+ = própria direita do jogador); `dAlto`/`eAlto` = punho acima do ombro.
   */
  function pose(o: { d?: number; e?: number; dAlto?: boolean; eAlto?: boolean } = {}): Pose {
    const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
    p[0] = { x: 0.5, y: 0.33, visibility: 1 };
    p[7] = { x: 0.55, y: 0.3, visibility: 1 };
    p[8] = { x: 0.45, y: 0.3, visibility: 1 };
    p[11] = { x: 0.6, y: 0.45, visibility: 1 };
    p[12] = { x: 0.4, y: 0.45, visibility: 1 };
    const cruX = (desloc: number) => 1 - (0.5 + desloc * 0.2);
    p[16] = { x: cruX(o.d ?? 0.75), y: o.dAlto ? 0.3 : 0.6, visibility: 1 };
    p[15] = { x: cruX(o.e ?? -0.75), y: o.eAlto ? 0.3 : 0.6, visibility: 1 };
    return p;
  }
  const seq = (i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);

  describe('modo Mão v6.0.0: duas mãos para um lado (AC-9.19)', () => {
    it('as duas mãos além da linha do ombro direito por ~300 ms = "direita"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 0], [pose({ d: 1.0, e: 0.6 }), 200]])).toEqual([]);
      expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 300]])).toEqual(['direita']);
    });
    it('para o lado esquerdo = "esquerda"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: -0.6, e: -1.0 }), 0], [pose({ d: -0.6, e: -1.0 }), 300]])).toEqual(['esquerda']);
    });
    it('uma mão só além do ombro (braços abertos, mãos baixas) não escolhe', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 1.0, e: -1.0 }), 0], [pose({ d: 1.0, e: -1.0 }), 1000]])).toEqual([]);
      expect(seq(i, [[pose({ d: 1.0, e: 0.2 }), 1100], [pose({ d: 1.0, e: 0.2 }), 2000]])).toEqual([]);
    });
  });

  describe('modo Mão v6.0.0: arrastar do centro para o lado (AC-9.20)', () => {
    it('mão direita do centro para a direita (≥ 1 L em até 0,8 s) = "direita"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 0.1 }), 0], [pose({ d: 0.6 }), 200], [pose({ d: 1.15 }), 400]])).toEqual(['direita']);
    });
    it('qualquer mão: a esquerda arrastando para a esquerda = "esquerda"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ e: -0.1 }), 0], [pose({ e: -1.2 }), 500]])).toEqual(['esquerda']);
    });
    it('arraste lento demais (> 0,8 s) ou curto demais (< 1 L) não escolhe', () => {
      const lento = criarInterpretador('mao');
      expect(seq(lento, [[pose({ d: 0.1 }), 0], [pose({ d: 0.6 }), 500], [pose({ d: 1.2 }), 1000]])).toEqual([]);
      const curto = criarInterpretador('mao');
      expect(seq(curto, [[pose({ d: 0.2 }), 0], [pose({ d: 0.9 }), 300]])).toEqual([]);
    });
    it('baixar o braço para o lado do corpo (mão já fora do centro) não escolhe', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 0.6 }), 0], [pose({ d: 1.2 }), 300], [pose({ d: 0.75 }), 600]])).toEqual([]);
    });
  });

  describe('modo Mão v6.0.0: liberação entre escolhas (AC-9.22) e gestos antigos', () => {
    it('depois de um arraste, outro arraste só vale partindo de novo do centro', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 0.1 }), 0], [pose({ d: 1.2 }), 300]])).toEqual(['direita']);
      expect(seq(i, [[pose({ d: 1.3 }), 500], [pose({ d: 1.4 }), 900]])).toEqual([]);
      expect(seq(i, [[pose({ d: 0.1 }), 1000], [pose({ d: 1.2 }), 1300]])).toEqual(['direita']);
    });
    it('depois de "duas mãos para um lado", só escolhe de novo após desfazer a postura', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 0], [pose({ d: 1.0, e: 0.6 }), 300]])).toEqual(['direita']);
      expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 400], [pose({ d: 1.0, e: 0.6 }), 1500]])).toEqual([]);
      expect(seq(i, [[pose(), 1600], [pose({ d: 1.0, e: 0.6 }), 1700], [pose({ d: 1.0, e: 0.6 }), 2000]])).toEqual(['direita']);
    });
    it('AC-9.7 continua: mão direita levantada por ~300 ms = "direita"; duas levantadas = "maosParaCima"', () => {
      const i = criarInterpretador('mao');
      expect(seq(i, [[pose({ dAlto: true }), 0], [pose({ dAlto: true }), 300]])).toEqual(['direita']);
      const j = criarInterpretador('mao');
      expect(seq(j, [[pose({ dAlto: true, eAlto: true }), 0], [pose({ dAlto: true, eAlto: true }), 500]])).toEqual(['maosParaCima']);
    });
  });
  ```
  (A pose padrão deixa os punhos a ±0,75 L, abaixo dos ombros, como os braços soltos ao lado do corpo: não é centro e não é postura de lado.)
- [ ] Rodar `npx vitest run src/core/gestos-mao-v6.test.ts src/core/gestos-medidas.test.ts`. Esperado: FAIL.
- [ ] Em `src/core/gestos.ts`:
  - acrescentar em `CONFIG_GESTOS`:
    ```ts
    /** v6.0.0, modo Mão: distâncias em larguras de ombro (L) a partir do meio do corpo. */
    duasMaosLadoL: 0.5,
    centroArrasteL: 0.5,
    arrasteMinL: 1,
    arrasteMaxMs: 800,
    ```
  - trocar `MedidaMaos` e `medirMaos` por:
    ```ts
    export interface MedidaMaos {
      direita: boolean;
      esquerda: boolean;
      /** Deslocamento lateral do punho a partir do meio do corpo, em larguras de ombro; + = própria direita do jogador. */
      deslocD: number;
      deslocE: number;
    }

    /** Medidas das mãos do modo Mão (AC-9.7, AC-9.19, AC-9.20). Lados anatômicos do jogador. */
    export function medirMaos(pose: Pose, cfg: Config = CONFIG_GESTOS): MedidaMaos {
      const acima = (punho: number, ombro: number) => pose[punho]!.y < pose[ombro]!.y - cfg.margemMaoOmbro;
      const { cx, largura } = medir(pose);
      const desloc = (punho: number) => (1 - pose[punho]!.x - cx) / Math.max(largura, 1e-6);
      return { direita: acima(PUNHO_D, OMBRO_D), esquerda: acima(PUNHO_E, OMBRO_E), deslocD: desloc(PUNHO_D), deslocE: desloc(PUNHO_E) };
    }
    ```
  - acrescentar antes de `interpretadorMao`:
    ```ts
    type Lado = 'direita' | 'esquerda';

    /** Postura que escolhe um lado: uma mão levantada (AC-9.7) ou as duas mãos baixas além da linha de um ombro (AC-9.19). */
    function posturaLado(m: MedidaMaos, cfg: Config): Lado | null {
      if (m.direita !== m.esquerda) return m.direita ? 'direita' : 'esquerda';
      if (m.direita) return null; // as duas levantadas: "saiba mais"
      if (m.deslocD > cfg.duasMaosLadoL && m.deslocE > cfg.duasMaosLadoL) return 'direita';
      if (m.deslocD < -cfg.duasMaosLadoL && m.deslocE < -cfg.duasMaosLadoL) return 'esquerda';
      return null;
    }

    /** Arraste de uma mão do centro do peito para um lado (AC-9.20). Guarda, por punho, o último instante no centro. */
    function criarArraste(cfg: Config) {
      const centro: Record<'d' | 'e', { t: number; desloc: number } | null> = { d: null, e: null };
      return {
        zerar() { centro.d = null; centro.e = null; },
        ler(m: MedidaMaos, tMs: number): Lado | null {
          let saida: Lado | null = null;
          for (const [k, desloc] of [['d', m.deslocD], ['e', m.deslocE]] as const) {
            if (Math.abs(desloc) < cfg.centroArrasteL) { centro[k] = { t: tMs, desloc }; continue; }
            const c = centro[k];
            const andou = desloc - (c?.desloc ?? 0);
            if (c && tMs - c.t <= cfg.arrasteMaxMs && Math.abs(andou) >= cfg.arrasteMinL && Math.sign(andou) === Math.sign(desloc)) {
              saida = desloc > 0 ? 'direita' : 'esquerda';
              centro[k] = null; // um novo arraste precisa voltar ao centro (AC-9.22)
            }
          }
          return saida;
        },
      };
    }
    ```
  - substituir `interpretadorMao` por:
    ```ts
    function interpretadorMao(cfg: Config): Interpretador {
      let lado: { gesto: Lado; desde: number } | null = null;
      let travadoLado = false;
      const ambas = criarGatilho(cfg.permanenciaMaosMs);
      const arraste = criarArraste(cfg);
      return {
        calibrar() {},
        ler(pose, tMs) {
          if (!pose) { lado = null; ambas.zerar(); arraste.zerar(); return AUSENTE; }
          const gestos: Gesto[] = [];
          const { cx } = medir(pose);
          const m = medirMaos(pose, cfg);

          if (ambas.ler(m.direita && m.esquerda, tMs)) {
            gestos.push('maosParaCima');
            travadoLado = true; // baixar uma mão por vez depois do "saiba mais" não escolhe
          }
          const postura = posturaLado(m, cfg);
          const arrastou = arraste.ler(m, tMs);

          if (travadoLado) {
            // Libera só quando as mãos estão baixas e não há "duas mãos para um lado" (AC-9.22).
            if (!m.direita && !m.esquerda && !postura) travadoLado = false;
            lado = null;
          } else if (arrastou) {
            gestos.push(arrastou);
            travadoLado = true;
            lado = null;
          } else if (!postura) {
            lado = null;
          } else if (lado?.gesto !== postura) {
            lado = { gesto: postura, desde: tMs };
          } else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
            gestos.push(postura);
            travadoLado = true;
            lado = null;
          }
          return { presenca: presenca(cx, cfg), inclinacao: 0, gestos };
        },
      };
    }
    ```
- [ ] Rodar `npx vitest run src/core`. Esperado: PASS, com todos os testes antigos de gestos inalterados (`gestos.test.ts`, `gestos-modos.test.ts`). Se algum teste antigo do modo Mão falhar por causa de um quadro a mais na liberação, fazer a liberação ocorrer no mesmo quadro (verificar a liberação antes de avaliar a postura) em vez de mudar o teste.
- [ ] Em `src/app/PainelDiagnostico.tsx`, logo depois da linha do punho E, acrescentar:
  ```tsx
  <p>{a?.medidas.maos ? `mãos (L): D ${a.medidas.maos.deslocD.toFixed(2)} · E ${a.medidas.maos.deslocE.toFixed(2)}` : 'mãos (L): —'}</p>
  ```
  e, em `src/app/PainelDiagnostico.test.tsx`, trocar `maos: { direita: true, esquerda: false }` por `maos: { direita: true, esquerda: false, deslocD: 0.62, deslocE: -0.58 }` e acrescentar a asserção `expect(painel).toHaveTextContent('mãos (L): D 0.62 · E -0.58');`.
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS (E2E: 30).
- [ ] Commit: `feat(gestos): two-hands-to-a-side and drag gestures in Mão mode (Phase 20.2: Gestos novos do modo Mão)`

---

## Phase 21 (added v6.0.0): Verificação dos gestos novos no hardware

**Implements:** FR-9 | **Satisfies:** AC-9.19–AC-9.22 (hardware)

- [ ] Com `?diagnostico`, no modo Mão, sentado e em pé:
  - fazer cada gesto 5 vezes para cada lado: levantar a mão, as duas mãos para um lado e arrastar do centro;
  - anotar quantas escolhas certas, quantas falsas e quantas não registradas;
  - baixar o registro depois de cada série.
- [ ] Conferir que a barra de tempo corre o card inteiro mesmo quando a câmera perde a pessoa, nos modos Mão e Cabeça (AC-9.21).
- [ ] Levantar as duas mãos do peito para cima em "V": deve abrir só o "saiba mais", sem registrar escolha (AC-9.8; revisão v6.0.0).
- [ ] Abrir os dois braços baixos e largos a partir do peito (sem levantar): conferir se registra escolha por engano; se registrar, ajustar `arrasteMinL` ou `centroArrasteL` com o registro do diagnóstico (revisão v6.0.0).
- [ ] Se necessário, ajustar `duasMaosLadoL`, `centroArrasteL`, `arrasteMinL` e `arrasteMaxMs` com base nos valores "mãos (L)" do registro.

---

## Phase 22 (added v6.1.0): Dica de gestos do modo Mão

**Implements:** FR-9 | **Satisfies:** AC-9.14 (texto do modo Mão), FR-4 (dica não cobre o card), AC-12.3 (painel não cobre a dica)
**Files:** `src/core/modos.ts`, `src/core/modos.test.ts`, `src/app/Telas.test.tsx`, `tests/e2e/configuracoes.spec.ts`, `tests/e2e/diagnostico.spec.ts`
**Interfaces:** Consumes: `DICA_GESTOS` (Fase 8). Produces: `DICA_GESTOS.mao` com o texto novo; nenhuma assinatura muda.

Troca só o texto da dica do modo Mão. Ele aparece na calibração, na pílula `.dicaModo` ao lado do card e no menu Configurações. A dica do Mão passa a ser a mais longa, então o E2E do diagnóstico, que mede a dica mais longa contra o painel, passa a usar o modo Mão.

- [ ] Nos testes, trocar o texto antigo `"Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais"` pelo novo `"É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais"`:
  - `src/core/modos.test.ts` (asserção AC-9.14 de `DICA_GESTOS.mao`);
  - `src/app/Telas.test.tsx` (linha `mao` do `it.each` AC-9.14);
  - `tests/e2e/configuracoes.spec.ts` (`const DICA_MAO`).
- [ ] Em `tests/e2e/diagnostico.spec.ts`, trocar `DICA_CABECA` por `DICA_MAO` com o texto novo; tirar um dos dois `ArrowRight` do menu (modo → Mão), com o comentário `// modo → Mão (dica mais longa)`; trocar a linha injetada `2: 'pessoas: 1 · modo: Cabeça · tela: calibracao'` por `'pessoas: 1 · modo: Mão · tela: calibracao'`.
- [ ] Rodar `npx vitest run src/core/modos.test.ts src/app/Telas.test.tsx`. Esperado: FAIL (o código ainda tem o texto antigo).
- [ ] Em `src/core/modos.ts`, trocar `DICA_GESTOS.mao` pelo texto novo.
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS, incluindo a checagem de sobreposição da dica com o card (`configuracoes.spec.ts`) e do painel com a dica (`diagnostico.spec.ts`). Se a pílula cobrir o card ou o painel, ajustar só o CSS de `.dicaModo` em `src/app/App.module.css` (por exemplo `font-size` ou `bottom`), nunca o texto.
- [ ] Commit: `feat(modos): Mão hint lists the three ways to choose (Phase 22: Dica de gestos do modo Mão)`

---

## Phase 23 (added v6.1.0): Verificação da dica no hardware

**Implements:** FR-9 | **Satisfies:** AC-9.14 (leitura a 1,5–2 m)

- [ ] No notebook do estande, no modo Mão, conferir a 1,5–2 m que a dica ao lado do card é legível e não cobre o card nem a barra de tempo; repetir com `?diagnostico`.

---

## Phase 24 (added v7.0.0): Foto polaroid no resumo

**Implements:** FR-13, FR-9 (item "Foto no resumo"), FR-2 (Must not reescrito) | **Satisfies:** AC-13.1–AC-13.5, AC-9.1, AC-9.2, AC-9.4, AC-9.5 (quatro itens)
**Files:** `src/core/modos.ts`, `src/core/modos.test.ts`, `src/core/foto.ts`, `src/core/foto.test.ts`, `src/app/foto.ts`, `src/app/foto.test.ts`, `src/app/useFotoPartida.ts`, `src/app/useFotoPartida.test.tsx`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `tests/e2e/configuracoes.spec.ts`, `tests/e2e/partida-v2.spec.ts`, `tests/e2e/diagnostico.spec.ts`, `tests/e2e/foto.spec.ts`
**Interfaces:** Consumes: `Configuracoes`, `ITENS_CONFIG`, `OPCOES`, `rotuloValor`, `resumoConfiguracoes` (Fase 10); `Estado` (Fase 3); `videoRef`, `camera` de `useJogo` (Fase 5); `TelaResumo` (Fase 5). Produces: `Configuracoes.foto: boolean`; `indiceFoto(total: number): number` (`src/core/foto.ts`); `capturarQuadro(video: HTMLVideoElement, largura?: number): string | null` (`src/app/foto.ts`); `useFotoPartida(estado: Estado, ligada: boolean, capturar: () => string | null): string | null` (`src/app/useFotoPartida.ts`); `TelaResumo` com a prop opcional `foto?: string | null`.

A foto é um data URL (`image/jpeg`) guardado só em estado React. Ela é apagada ao voltar para a espera ou a calibração e ao começar o card 0 de uma nova partida; nunca vai para `localStorage`, para a rede nem para o registro do diagnóstico.

### 24.1 Item "Foto no resumo" nas Configurações

- [ ] Testes primeiro, em `src/core/modos.test.ts`:
  - `ITENS_CONFIG` passa a ser `['modo', 'tempoCardS', 'som', 'foto']`.
  - AC-9.4: `CONFIG_PADRAO` é `{ modo: 'corpo', tempoCardS: 15, som: true, foto: true }`.
  - AC-9.5: salvar e ler `{ modo: 'cabeca', tempoCardS: 25, som: false, foto: false }` devolve o mesmo objeto; a chave é `match-do-saber:foto` com `'ligada'`/`'desligada'`; valor inválido (`'talvez'`) cai no padrão `true`.
  - `mudarValor(CONFIG_PADRAO, 'foto', 1).foto` é `false`.
  - AC-9.2: `rotuloValor('foto', true)` é `'Ligada'`, `rotuloValor('foto', false)` é `'Desligada'`; `rotuloValor('som', true)` continua `'Ligado'`; `resumoConfiguracoes({ modo: 'mao', tempoCardS: 20, som: false, foto: false })` é `'Modo: Mão · Tempo por card: 20 s · Som: desligado · Foto: desligada'`.
  - Atualizar todos os literais de `Configuracoes` nos testes (o `tsc` aponta os que faltarem) com `foto: true` ou `foto: false`.
- [ ] Em `src/app/Telas.test.tsx`: o teste do menu passa a se chamar "AC-9.1: menu mostra os quatro itens…", espera também `group` "Foto no resumo" e o botão `'◉ Ligada'` com `aria-pressed="true"`; o `definir` esperado inclui `foto: true`; o resumo da espera passa a ser `'Modo: Mão · Tempo por card: 20 s · Som: desligado · Foto: desligada'` (com `foto: false` no `config`).
- [ ] Rodar `npx vitest run src/core/modos.test.ts src/app/Telas.test.tsx`. Esperado: FAIL.
- [ ] Em `src/core/modos.ts`:
  ```ts
  export interface Configuracoes { modo: ModoJogo; tempoCardS: number; som: boolean; foto: boolean }
  export const CONFIG_PADRAO: Configuracoes = { modo: MODO_PADRAO, tempoCardS: 15, som: true, foto: true };
  export const ITENS_CONFIG: readonly ItemConfig[] = ['modo', 'tempoCardS', 'som', 'foto'];
  export const ROTULO_ITEM: Record<ItemConfig, string> = { modo: 'Modo de jogo', tempoCardS: 'Tempo por card', som: 'Som', foto: 'Foto no resumo' };
  // OPCOES: foto: [true, false]
  // CHAVES: foto: 'match-do-saber:foto'
  // lerConfiguracoes: foto: f === 'ligada' ? true : f === 'desligada' ? false : CONFIG_PADRAO.foto
  // salvarConfiguracoes: a?.setItem(CHAVES.foto, c.foto ? 'ligada' : 'desligada');
  // rotuloValor: if (item === 'foto') return valor ? 'Ligada' : 'Desligada';
  // resumoConfiguracoes: … · Som: … · Foto: ${c.foto ? 'ligada' : 'desligada'}
  ```
- [ ] Nos E2E, acrescentar `' · Foto: ligada'` a cada resumo da espera em `tests/e2e/configuracoes.spec.ts` (4 linhas) e em `tests/e2e/partida-v2.spec.ts` (1 linha).
- [ ] Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: PASS.
- [ ] Commit: `feat(modos): add "Foto no resumo" setting (Phase 24.1: Item Foto no resumo)`

### 24.2 Captura no meio da partida e polaroid no resumo

- [ ] Escrever `src/core/foto.test.ts`: `indiceFoto(10)` é 4 (5º card), `indiceFoto(9)` é 4, `indiceFoto(6)` é 2, `indiceFoto(1)` é 0 (AC-13.1: card ⌈M/2⌉, base 0).
- [ ] Escrever `src/app/foto.test.ts` (`// @vitest-environment jsdom`):
  - vídeo sem dimensões (`videoWidth` 0) devolve `null`;
  - com `videoWidth` 1280 e `videoHeight` 720 e `HTMLCanvasElement.prototype.getContext` / `toDataURL` simulados por `vi.spyOn`: devolve o data URL simulado, o canvas tem 480×270, o contexto recebe `translate(480, 0)` e `scale(-1, 1)` antes de `drawImage` (espelhada, AC-13.2);
  - `drawImage` que lança erro devolve `null` (AC-13.3).
- [ ] Escrever `src/app/useFotoPartida.test.tsx` (`// @vitest-environment jsdom`, `renderHook` + `rerender` com estados montados à mão, partida de 10 cards e `capturar = vi.fn(() => 'data:image/jpeg;base64,AAA')`):
  - AC-13.1: `capturar` é chamado uma vez quando o estado vira `feedback` com `indice` 4; não é chamado nos feedbacks 0–3 nem 5–9; a foto persiste até o `resumo`.
  - AC-13.3: com `ligada = false`, `capturar` nunca é chamado e a foto é `null`; com `capturar` devolvendo `null`, a foto é `null`.
  - AC-13.4: depois do resumo com foto, `espera` (Sair/Esc ou ausência), `calibracao` (Enter com câmera) e `card` com `indice` 0 (Enter sem câmera) zeram a foto.
- [ ] Em `src/app/Telas.test.tsx`, acrescentar:
  - AC-13.2: `render(<TelaResumo pontos={7} total={10} tecnicas={['fonte']} foto="data:image/jpeg;base64,AAA" />)` mostra `img` com `alt` "Sua foto na partida" e `src` igual ao data URL, e o texto `'Match do Saber · 7 de 10'`; `'7 de 10'` e "Checar a fonte" continuam na tela.
  - AC-13.3: sem `foto` (e com `foto={null}`), não há `figure` nem `img` no resumo.
- [ ] Rodar `npx vitest run src/core/foto.test.ts src/app`. Esperado: FAIL.
- [ ] Implementar `src/core/foto.ts`:
  ```ts
  /** Card do meio da partida (⌈M/2⌉, base 0): a foto do resumo é tirada na escolha dele (AC-13.1). */
  export function indiceFoto(total: number): number {
    return Math.ceil(total / 2) - 1;
  }
  ```
- [ ] Implementar `src/app/foto.ts`:
  ```ts
  /** Um quadro da câmera, espelhado como a prévia (AC-13.2). Fica só na memória (FR-13). */
  export function capturarQuadro(video: HTMLVideoElement, largura = 480): string | null {
    try {
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) return null;
      const c = document.createElement('canvas');
      c.width = largura;
      c.height = Math.round((largura * h) / w);
      const g = c.getContext('2d');
      if (!g) return null;
      g.translate(c.width, 0);
      g.scale(-1, 1);
      g.drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }
  ```
- [ ] Implementar `src/app/useFotoPartida.ts`:
  ```ts
  import { useEffect, useRef, useState } from 'react';
  import { indiceFoto } from '../core/foto';
  import type { Estado } from '../core/partida';

  export function useFotoPartida(estado: Estado, ligada: boolean, capturar: () => string | null): string | null {
    const [foto, setFoto] = useState<string | null>(null);
    const capturarRef = useRef(capturar);
    capturarRef.current = capturar;
    const indice = 'indice' in estado ? estado.indice : -1;
    useEffect(() => {
      if (estado.tela === 'espera' || estado.tela === 'calibracao' || (estado.tela === 'card' && estado.indice === 0)) setFoto(null);
      else if (estado.tela === 'feedback' && ligada && estado.indice === indiceFoto(estado.partida.cards.length)) setFoto(capturarRef.current());
    }, [estado.tela, indice]); // eslint-disable-line react-hooks/exhaustive-deps -- reage só à troca de tela/card
    return foto;
  }
  ```
- [ ] Em `src/app/Telas.tsx`, `TelaResumo` ganha `foto?: string | null`. Sem foto, renderiza exatamente como hoje. Com foto:
  ```tsx
  <main className={s.centro}>
    <div className={s.resumoFoto}>
      <figure className={s.polaroid}>
        <img src={foto} alt="Sua foto na partida" />
        <figcaption>{`Match do Saber · ${pontos} de ${total}`}</figcaption>
      </figure>
      <div className={s.resumoTexto}>{/* h1, placar, h2 e lista de técnicas de hoje */}</div>
    </div>
    <p className={s.dica}>Operador: Enter para a próxima partida</p>
  </main>
  ```
- [ ] Em `src/app/App.module.css`:
  ```css
  .resumoFoto { display: flex; align-items: center; justify-content: center; gap: 3rem; max-width: 100%; }
  .resumoTexto { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .polaroid { margin: 0; width: min(20rem, 28vw); background: #fff; color: #1b1035; padding: 0.9rem 0.9rem 0; border-radius: 0.25rem; box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.45); transform: rotate(-3deg); }
  .polaroid img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
  .polaroid figcaption { padding: 0.9rem 0 1.2rem; font-size: 1.25rem; font-weight: 700; text-align: center; }
  ```
- [ ] Em `src/app/App.tsx`, no `Jogo`:
  ```tsx
  const foto = useFotoPartida(estado, cfg.config.foto, () =>
    camera === 'ativa' && videoRef.current ? capturarQuadro(videoRef.current) : null);
  // …
  case 'resumo':
    tela = <TelaResumo … foto={foto} />;
  ```
- [ ] Escrever `tests/e2e/foto.spec.ts`:
  - AC-13.3 (sem câmera): partida inteira pelas setas; o resumo não tem `figure` nem `img`.
  - AC-13.1/AC-13.2/AC-13.4/AC-13.5 (câmera simulada): `addInitScript` troca `getUserMedia` por um `canvas.captureStream(30)` de um canvas 1280×720 pintado de uma cor; Enter, Enter (pula a calibração, AC-1.8) e 10 escolhas pelas setas; no resumo, a `img` "Sua foto na partida" tem `src` começando com `data:image/jpeg` e `naturalWidth > 0`, a faixa "Match do Saber · N de 10" aparece, e o polaroid, o placar e a lista de técnicas cabem em 1366×768 sem se sobrepor; nenhuma requisição levou `data:image` e nenhum valor do `localStorage` contém `data:image`; Enter leva à calibração e Esc à espera, e na partida seguinte jogada sem o card do meio (Esc antes dele) não há foto.
  - Se o MediaPipe não iniciar no Chromium sem interface (a câmera fica "indisponível" e não há foto), não criar caminho de código só para teste: marcar esse teste com `test.fixme` e um comentário com o motivo, reportar DONE_WITH_CONCERNS e deixar a checagem para a Fase 25.
- [ ] Em `tests/e2e/diagnostico.spec.ts`, no teste que baixa o registro, acrescentar `expect(conteudo).not.toContain('data:image')` (AC-13.5).
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS.
- [ ] Commit: `feat(resumo): polaroid photo from the middle of the match (Phase 24.2: Captura e polaroid)`

---

## Phase 25 (added v7.0.0): Verificação da foto no hardware

**Implements:** FR-13 | **Satisfies:** AC-13.1–AC-13.5 (hardware)

- [ ] No notebook do estande, nos três modos, jogar uma partida de 10 cards: a foto do resumo é do 5º card, espelhada, sem esqueleto, nítida e com a pessoa enquadrada no recorte quadrado.
- [ ] Na TV, conferir que o polaroid, os pontos e as técnicas cabem sem cortes e são legíveis a ~2 m.
- [ ] Enter, Sair e Esc apagam a foto; com "Foto no resumo: Desligada", o resumo aparece sem polaroid.
- [ ] Com `?diagnostico`, baixar o registro e conferir que não há imagem nele.
- [ ] Nenhuma pausa ou travada perceptível no instante da foto.

---

## Phase 26 (added v7.1.0): Mensagem do resumo por faixa de acertos

**Implements:** FR-5 (faixas), FR-4 | **Satisfies:** AC-5.7, AC-13.2 (layout com a mensagem)
**Files:** `src/core/partida.ts`, `src/core/partida.test.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.module.css`, `tests/e2e/partida.spec.ts`, `tests/e2e/foto.spec.ts`
**Interfaces:** Consumes: `TelaResumo` (Fases 5 e 24). Produces: `mensagemResumo(pontos: number, total: number): string` (`src/core/partida.ts`).

A regra fica no núcleo, como função pura, e a tela só mostra o texto. A faixa sai da proporção `pontos / total`, então partidas com menos de 10 cards usam as mesmas faixas.

- [ ] Em `src/core/partida.test.ts`, acrescentar (`it.each`):
  - AC-5.7, partida de 10: 0, 1, 4 → "Cuidado! Você precisa verificar melhor as manchetes."; 5, 7 → "Você consegue se proteger, mas ainda pode melhorar."; 8, 9 → "Parabéns! Você checa muito bem as notícias."; 10 → "Imune a fake news!".
  - Proporção: 3 de 6 → "Você consegue se proteger, mas ainda pode melhorar."; 5 de 6 → "Parabéns! Você checa muito bem as notícias."; 6 de 6 → "Imune a fake news!"; 2 de 6 → "Cuidado! Você precisa verificar melhor as manchetes."; 4 de 5 → "Parabéns! Você checa muito bem as notícias."
- [ ] Em `src/app/Telas.test.tsx`:
  - o teste AC-5.1 (7 de 10) passa a esperar também "Você consegue se proteger, mas ainda pode melhorar.";
  - novo teste AC-5.7 com foto: `TelaResumo pontos={10} total={10} … foto="data:image/jpeg;base64,AAA"` mostra "Imune a fake news!".
- [ ] Rodar `npx vitest run src/core/partida.test.ts src/app/Telas.test.tsx`. Esperado: FAIL.
- [ ] Implementar em `src/core/partida.ts`:
  ```ts
  /** Mensagem do resumo pela proporção de acertos (AC-5.7). */
  export function mensagemResumo(pontos: number, total: number): string {
    const p = total > 0 ? pontos / total : 0;
    if (p >= 1) return 'Imune a fake news!';
    if (p >= 0.8) return 'Parabéns! Você checa muito bem as notícias.';
    if (p >= 0.5) return 'Você consegue se proteger, mas ainda pode melhorar.';
    return 'Cuidado! Você precisa verificar melhor as manchetes.';
  }
  ```
- [ ] Em `src/app/Telas.tsx`, em `TelaResumo`, logo depois do `<p className={s.placar}>`, acrescentar `<p className={s.mensagemResumo}>{mensagemResumo(pontos, total)}</p>`; em `src/app/App.module.css`, `.mensagemResumo { margin: 0; font-size: clamp(1.25rem, 2.5vw, 2rem); font-weight: 700; max-width: 40rem; }`.
- [ ] Em `tests/e2e/partida.spec.ts`, no teste da partida completa, depois de `/^\d+ de 10$/`, esperar uma das quatro mensagens (`/^(Cuidado!|Você consegue|Parabéns!|Imune a fake news!)/`).
- [ ] Em `tests/e2e/foto.spec.ts`, acrescentar a mensagem às caixas medidas (dentro de 1366×768, sem sobrepor o polaroid, o placar, as técnicas nem a prévia da câmera).
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS. Se, com a foto, as técnicas ou a mensagem encostarem na prévia da câmera, ajustar só o CSS do resumo com foto (por exemplo o `gap` de `.resumoTexto` ou o tamanho de `.placar` dentro dele), nunca os textos nem os testes.
- [ ] Commit: `feat(resumo): message by score band (Phase 26: Mensagem do resumo)`

---

## Phase 27 (added v7.1.0): Verificação da mensagem no hardware

**Implements:** FR-5 | **Satisfies:** AC-5.7 (hardware)

- [ ] Na TV do estande, com e sem foto, conferir que a mensagem é legível a ~2 m e não cobre nada do resumo.

---

## Phase 28 (added v8.0.0): Resumo sem a lista de técnicas

**Implements:** FR-13, FR-4 | **Satisfies:** AC-5.1 (reescrito v8.0.0), AC-13.2 (reescrito v8.0.0)
**Files:** `src/core/partida.ts`, `src/core/partida.test.ts`, `src/app/Telas.tsx`, `src/app/Telas.test.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `tests/e2e/foto.spec.ts`
**Interfaces:** Consumes: `TelaResumo` (Fases 5, 24, 26). Produces: `TelaResumo({ pontos, total, foto })`, sem a prop `tecnicas`; `tecnicasDaPartida` é removida.

Tira do resumo o título "Técnicas que você praticou" e a lista. A técnica continua no feedback de cada card (`TelaFeedback`, sem mudança).

- [ ] Em `src/app/Telas.test.tsx`:
  - o teste AC-5.1 passa a renderizar `<TelaResumo pontos={7} total={10} />` e espera "7 de 10" e "Você consegue se proteger, mas ainda pode melhorar."; espera também que "Técnicas que você praticou", "Checar a fonte" e qualquer `ul` não existam;
  - nos testes com foto (AC-5.7, AC-13.2, AC-13.3), tirar a prop `tecnicas` e a asserção "Checar a fonte"; no AC-13.2, esperar que "Técnicas que você praticou" não exista.
- [ ] Em `src/core/partida.test.ts`, no teste AC-5.1 do resumo, tirar a asserção de `tecnicasDaPartida` e o import (o teste continua conferindo os pontos).
- [ ] Rodar `npx vitest run src/app/Telas.test.tsx`. Esperado: FAIL (o título e a lista ainda aparecem).
- [ ] Em `src/app/Telas.tsx`, `TelaResumo` perde a prop `tecnicas` e as linhas `<h2>Técnicas que você praticou</h2>` e `<ul className={s.tecnicas}>…</ul>`; tirar o import de `Tecnica` e de `TECNICA_ROTULO` se ficarem sem uso.
- [ ] Em `src/app/App.tsx`, chamar `<TelaResumo pontos={…} total={…} foto={foto} />` e tirar `tecnicasDaPartida` do import.
- [ ] Em `src/core/partida.ts`, remover `tecnicasDaPartida` (e o import de `Tecnica`, se ficar sem uso).
- [ ] Em `src/app/App.module.css`, remover `.tecnicas` e a regra `.resumoTexto .placar` da Fase 26 (sem a lista sobra altura; o placar volta ao tamanho normal ao lado da foto) com o comentário dela.
- [ ] Em `tests/e2e/foto.spec.ts`, tirar `tecnicas` das caixas medidas e esperar que "Técnicas que você praticou" não apareça no resumo; manter a checagem de polaroid, placar e mensagem dentro de 1366×768, sem sobreposição entre si nem com a prévia da câmera.
- [ ] Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run e2e`. Esperado: tudo PASS. Se, com o placar no tamanho normal, algo encostar na prévia da câmera, manter a regra `.resumoTexto .placar` em vez de removê-la.
- [ ] Commit: `feat(resumo): drop the techniques list from the summary (Phase 28: Resumo sem técnicas)`

---

## Phase 29 (added v8.1.0): Braço para o lado no modo Corpo

**Implements:** FR-2 (gesto do braço, retorno ao centro) | **Satisfies:** AC-2.4 (ampliado v8.1.0), AC-2.7, AC-2.8, AC-2.9
**Files:** `src/core/gestos.ts`, `src/core/gestos-corpo-braco.test.ts` (novo), `src/core/gestos.test.ts`, `src/core/modos.ts`, `src/core/modos.test.ts`
**Interfaces:** Consumes: `medirMaos`, `MedidaMaos`, `CONFIG_GESTOS`, `criarInterpretador('corpo')` (`src/core/gestos.ts`, Fases 4 e 20); `DICA_GESTOS` (`src/core/modos.ts`, Fase 8). Produces:
- `CONFIG_GESTOS` ganha `bracoLadoL: 1.2` e `retornoBracoL: 0.9` (larguras de ombro, as mesmas unidades de `medirMaos`).
- `DICA_GESTOS.corpo` passa a ser `'Corpo ou braço para a direita: é verdade · Para a esquerda: é falsa · Duas mãos para cima: saiba mais'`.
- O interpretador do modo Corpo continua com a mesma interface (`Interpretador`); só o que ele aceita como escolha muda.

Causa (investigação do bug "não está lendo nenhum movimento", vídeo da responsável de 2026-11-03):
- A câmera estava ativa e o esqueleto acompanhava a pessoa; a barra de tempo descia normalmente.
- No modo Corpo, a pessoa escolhia estendendo os braços para os lados, e o centro dos ombros ficava parado em ~51% da imagem. A regra exige o tronco a mais de 0,12 da largura da imagem da calibração (`limiar`), então nenhum card era escolhido e todos terminavam em "Tempo esgotado".
- Medidas a olho nos quadros: braços soltos ~0,8 L; braço estendido de 1,7 a 2,6 L.

Decisões técnicas (inline):
- **Postura de lado do modo Corpo:** `tronco` = lado de `d = cx − centro` além de `limiar` (como hoje); `braco` = lado de um punho além de `bracoLadoL` (`medirMaos(...).deslocD/deslocE`), ou `null` se um punho passa para cada lado (AC-2.8). Com os dois punhos acima do nariz, `braco = null` (é "saiba mais"). A postura é `tronco ?? braco`, e `null` quando os dois existem e apontam para lados diferentes (AC-2.8).
- **Uma só permanência e uma só trava:** a postura precisa ficar igual por `permanenciaLadoMs` (~300 ms) e então dispara. Depois de disparar, trava até `|d| < zonaRetorno` **e** `|deslocD| < retornoBracoL` **e** `|deslocE| < retornoBracoL` (AC-2.4). Trocar de tronco para braço no mesmo lado não reinicia a contagem.
- **Generalizar `criarLado`:** separar "qual lado" de "está livre". Por exemplo, `criarEscolha(cfg)` com `ler(postura: Lado | null, livre: boolean, tMs)`, e `criarLado(limiar, retorno, cfg)` passa a ser um invólucro dela, para o modo Cabeça não mudar. Sem pose, `zerar()` como hoje (a trava continua, como hoje).
- **A calibração não afeta o braço:** o braço é medido a partir do meio do corpo em L, então funciona perto ou longe da câmera e sem calibração (partida pelo Enter).
- **Fixture dos testes antigos:** o `pose()` de `src/core/gestos.test.ts` põe os punhos a 1,0 L, o que agora fica entre o retorno (0,9) e o limite (1,2) e nunca libera a trava. Mudar o padrão para 0,6 L (braços soltos, como no vídeo) sem mudar o que cada teste confere.

### 29.1 Gesto do braço e dica

- [ ] Em `src/core/gestos.test.ts`, mudar o `pose()` para os punhos ficarem a `0.6 * largura` do centro (`p[15].x = cx + 0.6 * largura`, `p[16].x = cx - 0.6 * largura`). Rodar `npx vitest run src/core/gestos.test.ts`. Esperado: PASS (só a fixture mudou).
- [ ] Criar `src/core/gestos-corpo-braco.test.ts` com uma pose sintética como a do `gestos-mao-v6.test.ts` (L = 0,2; `cxJ` = centro do tronco do jogador, padrão 0,5; `d`/`e` = deslocamento de cada punho em L, padrão +0,6/−0,6; `maosAcima` põe os dois punhos acima do nariz). Casos, todos com `criarInterpretador('corpo')`, `ler(pose(), 0)` e `calibrar()` antes:
  - AC-2.7: `d: 1.5` por 0 → 200 ms dá `[]`; em 300 ms dá `['direita']`. `e: -1.5` dá `['esquerda']`. O tronco fica em 0,5 o tempo todo.
  - AC-2.7: `d: 1.1` por 1000 ms dá `[]` (abaixo do limite).
  - AC-2.7 sem calibração: `criarInterpretador('corpo')` sem `calibrar()`, `d: 1.5` por 300 ms dá `['direita']`.
  - AC-2.8: `d: 1.5, e: -1.5` por 1000 ms dá `[]`; tronco em 0,7 (direita) com `e: -1.5` por 1000 ms dá `[]`; `maosAcima` com `d: 1.5` por 600 ms dá só `['maosParaCima']`.
  - AC-2.4: depois de uma escolha com `d: 1.5`, manter `d: 1.5` por mais 1000 ms dá `[]`; baixar para `d: 1.0` (entre 0,9 e 1,2) e estender de novo dá `[]`; baixar para `d: 0.6` e estender de novo por 300 ms dá `['direita']`.
  - AC-2.4 com tronco: escolha pelo tronco (`cxJ: 0.7`), voltar o tronco ao centro mas com `d: 1.5` não libera; só libera com o tronco no centro e os punhos a menos de 0,9 L.
  - Mistura no mesmo lado: tronco em 0,7 por 150 ms e depois tronco em 0,5 com `d: 1.5` por mais 150 ms dá `['direita']` aos 300 ms.
- [ ] Em `src/core/modos.test.ts`, conferir o texto exato de `DICA_GESTOS.corpo` (AC-2.9).
- [ ] Rodar `npx vitest run src/core/gestos-corpo-braco.test.ts src/core/modos.test.ts`. Esperado: FAIL (o braço não escolhe e a dica é a antiga).
- [ ] Em `src/core/gestos.ts`: acrescentar `bracoLadoL` e `retornoBracoL` a `CONFIG_GESTOS`; generalizar `criarLado` como nas decisões técnicas; em `interpretadorCorpo`, calcular `tronco`, `braco` e a postura, e liberar a trava só com tronco e punhos de volta. Comentar as regras com as referências AC-2.7, AC-2.8 e AC-2.4.
- [ ] Em `src/core/modos.ts`, trocar `DICA_GESTOS.corpo` pelo texto novo.
- [ ] Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: tudo PASS, inclusive os testes antigos do tronco, do modo Cabeça (`criarLado`) e do modo Mão.
- [ ] Rodar `npm run e2e`. Esperado: PASS (a dica nova aparece só na calibração do modo Corpo; se algum teste E2E conferir o texto antigo, trocar pelo novo).
- [ ] Commit: `feat(gestos): an arm stretched to the side also chooses in Corpo mode (Phase 29.1: Braço para o lado)`

---

## Phase 30 (added v8.1.0): Verificação do braço para o lado no hardware

**Implements:** FR-2 | **Satisfies:** AC-2.4, AC-2.7, AC-2.8 (hardware)

- [ ] Com `?diagnostico`, no modo Corpo, em pé na distância do estande:
  - estender o braço direito para a direita 5 vezes e o esquerdo para a esquerda 5 vezes, em alturas diferentes; anotar escolhas certas, falsas e não registradas;
  - deslocar o tronco para cada lado 5 vezes (o gesto antigo continua valendo);
  - abrir os dois braços ao mesmo tempo: não deve escolher (AC-2.8);
  - levantar as duas mãos: deve abrir só o "saiba mais".
- [ ] Ficar parado com os braços soltos e conferir na linha "mãos (L)" que os dois valores ficam abaixo de 0,9; se não ficarem, a trava não libera e é preciso ajustar `retornoBracoL`.
- [ ] Se houver escolhas por engano ou não registradas, ajustar `bracoLadoL` e `retornoBracoL` com os valores "mãos (L)" do registro baixado.

---

## Quickstart Validation

```bash
npm install
npm run fixture          # 12 notícias de teste em public/content
npm run dev              # abre http://localhost:5173, permitir câmera
```
1. Aperte ▶ Iniciar (ou Enter) e fique no centro por 2 s. A partida começa. (v3.0.0: a câmera sozinha não inicia nada.)
2. Desloque o tronco para a sua direita: o card sai pela direita e aparece "Acertou!" ou "Errou", com a explicação e a técnica.
3. Levante as duas mãos: o "saiba mais" abre e a barra continua diminuindo; levante as mãos de novo (ou ↑) para fechar.
4. Termine os 10 cards. O resumo "N de 10", com a mensagem da faixa (v7.1.0), fica na tela; Enter inicia a calibração de uma nova partida.
5. `npm run build && npm run preview`, abrir http://localhost:4173, instalar pelo ícone da barra de endereço, desligar o Wi-Fi e reabrir pelo ícone instalado: o jogo abre e joga com imagens.

## Verificação contra a spec (self-review)

- **FR → fase:**

  | FR | Fases |
  |---|---|
  | FR-1 | 3, 5, 12 (reescrito v3.0.0), 13 |
  | FR-2 | 4, 5, 29 (v8.1.0), 30 |
  | FR-3 | 5 |
  | FR-4 | 1 (limites), 5, 10, 14 (reescrito v4.0.0), 15, 16 |
  | FR-5 | 3, 26 (v7.1.0) |
  | FR-6 | 0, 1, 6 |
  | FR-7 | 0, 1, 2, 6 |
  | FR-8 | 6 |
  | FR-9 (v1.1.0, reescrito v2.0.0) | 8, 9, 10, 11 |
  | FR-10 (v2.0.0) | 10, 12 |
  | FR-11 (v2.0.0) | 10, 11 |
  | FR-12 (v5.2.0) | 19 |
  | FR-13 (v7.0.0) | 24, 25 |

- **ACs:** todas as 38 (AC-1.1–1.6, 2.1–2.6, 3.1–3.5, 4.1–4.4, 5.1–5.6, 6.1–6.4, 7.1–7.5, 8.1–8.3) aparecem num `Satisfies`. AC-1.5, 2.1–2.4, 2.6, 3.1 e 7.1 têm teste automatizado da lógica e verificação manual com hardware ou planilha real na Fase 7.
- **Limitação conhecida:** o cenário de erro "jogo aberto offline antes de qualquer abertura online" só pode mostrar a mensagem da spec quando o shell do app já está em cache. Na primeiríssima abertura sem rede, o navegador mostra a própria página de erro, porque não há código do app para rodar. O app cobre o caso parcial (shell presente, catálogo ausente ou inválido).

## Plan Changelog

| Version | Phase | Change |
|---------|-------|--------|
| 1.0.0 | 0–7 | Plano inicial (implementado e mergeado em 2026-10-27, revisão SPEC-ALIGNED) |
| 1.1.0 | 8 | Adicionada: modos de jogo acessíveis (FR-9, AC-9.1–9.16) |
| 1.1.0 | 9 | Adicionada: verificação dos modos Mão e Cabeça no hardware |
| 2.0.0 | 8.3 | Parcialmente invalidada: o menu "Modo de jogo" é reescrito na Fase 10.4 |
| 2.0.0 | 10 | Adicionada: Configurações (modo, tempo por card, som), Iniciar/Sair, sons e card centralizado |
| 2.0.0 | 11 | Adicionada: verificação de configurações, sons e layout no hardware |
| 3.0.0 | 12 | Adicionada: início só manual (a câmera deixa de iniciar a partida; Enter/Iniciar abre a calibração com câmera ativa) |
| 3.0.0 | 13 | Adicionada: verificação do início manual no hardware |
| 4.0.0 | 5, 8.2, 10 | Parcialmente invalidadas: inclinação do card (laço em App.tsx) e o cronômetro sobre o card; reescritos na Fase 14 |
| 4.0.0 | 14 | Adicionada: card parado, barra de tempo e pulso vermelho |
| 4.0.0 | 15 | Adicionada: verificação no hardware |
| 5.0.0 | 3, 14 | Parcialmente invalidadas: pausa do cronômetro e fechamento automático do saiba mais; reescritos na Fase 16 |
| 5.0.0 | 16 | Adicionada: tempo corre com o saiba mais aberto |
| 5.0.0 | 17 | Adicionada: verificação no hardware |
| 5.1.0 | 18 | Adicionada: botão ⚙ no canto superior direito e menu como painel lateral |
| 5.2.0 | 19 | Adicionada: modo de diagnóstico (?diagnostico) com painel e registro baixável |
| 6.0.0 | 8.2, 3 | Parcialmente invalidadas: o modo Mão ganha gestos e a ausência deixa de pausar nos modos Mão/Cabeça; reescritos na Fase 20 |
| 6.0.0 | 20 | Adicionada: gestos novos do modo Mão e ausência só no modo Corpo |
| 6.0.0 | 21 | Adicionada: verificação no hardware |
| 6.1.0 | 22 | Adicionada: dica de gestos do modo Mão cita os três jeitos de escolher |
| 6.1.0 | 23 | Adicionada: verificação da dica no hardware |
| 7.0.0 | 10 | Parcialmente invalidada: o menu passa de três para quatro itens; reescrito na Fase 24.1 |
| 7.0.0 | 24 | Adicionada: foto polaroid no resumo e item "Foto no resumo" |
| 7.0.0 | 25 | Adicionada: verificação no hardware |
| 7.1.0 | 26 | Adicionada: mensagem do resumo por faixa de acertos |
| 7.1.0 | 27 | Adicionada: verificação no hardware |
| 8.0.0 | 5, 24, 26 | Parcialmente invalidadas: a lista de técnicas do resumo sai; reescritas na Fase 28 |
| 8.0.0 | 28 | Adicionada: resumo sem a lista de técnicas |
| 8.1.0 | 4 | Parcialmente estendida: o modo Corpo aceita também o braço para o lado; o retorno ao centro inclui os punhos (Fase 29) |
| 8.1.0 | 29 | Adicionada: braço para o lado no modo Corpo e dica nova |
| 8.1.0 | 30 | Adicionada: verificação no hardware |
