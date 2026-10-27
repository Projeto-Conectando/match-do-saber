# Implementation Plan: Match do Saber — jogo de estande (MVP)

**Spec:** docs/specs/001-jogo-estande/spec.md
**Decisions:** docs/adr/001-frontend-stack.md, docs/adr/001-motion-input.md, docs/adr/001-content-pipeline.md
**Created:** 2026-10-26

## Global Constraints

- Tempos: 15 s por card, 3 s de feedback, 2 s de calibração, 10 s de tolerância sem pessoa, 5 s de inatividade para fechar o "saiba mais"; o resumo fica na tela até Enter.
- 10 cards por partida, 5 verdadeiros + 5 falsos, sem repetição; completa com o outro lado; com menos de 10 notícias, usa todas.
- Pontuação: +1 por acerto; 0 por erro ou tempo esgotado.
- Gestos: tronco para a **própria direita** = match (verdadeira); para a própria esquerda = descarte (falsa); dois punhos acima do nariz = saiba mais; ~300 ms / ~500 ms de permanência; retorno ao centro entre escolhas.
- Entrada alternativa: → match, ← descarte, ↑ saiba mais, Enter iniciar; arrastar o card com mouse/toque.
- (v1.1.0) Modos de jogo: Corpo (padrão), Mão (mão direita = match, esquerda = descarte, as duas = saiba mais) e Cabeça (inclinar para direita/esquerda; queixo para cima = saiba mais). Escolhidos pelo operador na tela de espera (tecla M), guardados no notebook até serem trocados; nunca mudam durante uma partida.
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

## Quickstart Validation

```bash
npm install
npm run fixture          # 12 notícias de teste em public/content
npm run dev              # abre http://localhost:5173, permitir câmera
```
1. Fique no centro por 2 s. A partida começa.
2. Desloque o tronco para a sua direita: o card sai pela direita e aparece "Acertou!" ou "Errou", com a explicação e a técnica.
3. Levante as duas mãos: o "saiba mais" abre; espere 5 s e ele fecha.
4. Termine os 10 cards. O resumo "N de 10" fica na tela; Enter inicia a calibração de uma nova partida.
5. `npm run build && npm run preview`, abrir http://localhost:4173, instalar pelo ícone da barra de endereço, desligar o Wi-Fi e reabrir pelo ícone instalado: o jogo abre e joga com imagens.

## Verificação contra a spec (self-review)

- **FR → fase:**

  | FR | Fases |
  |---|---|
  | FR-1 | 3, 5 |
  | FR-2 | 4, 5 |
  | FR-3 | 5 |
  | FR-4 | 1 (limites), 5 |
  | FR-5 | 3 |
  | FR-6 | 0, 1, 6 |
  | FR-7 | 0, 1, 2, 6 |
  | FR-8 | 6 |
  | FR-9 (v1.1.0) | 8, 9 |

- **ACs:** todas as 38 (AC-1.1–1.6, 2.1–2.6, 3.1–3.5, 4.1–4.4, 5.1–5.6, 6.1–6.4, 7.1–7.5, 8.1–8.3) aparecem num `Satisfies`. AC-1.5, 2.1–2.4, 2.6, 3.1 e 7.1 têm teste automatizado da lógica e verificação manual com hardware ou planilha real na Fase 7.
- **Limitação conhecida:** o cenário de erro "jogo aberto offline antes de qualquer abertura online" só pode mostrar a mensagem da spec quando o shell do app já está em cache. Na primeiríssima abertura sem rede, o navegador mostra a própria página de erro, porque não há código do app para rodar. O app cobre o caso parcial (shell presente, catálogo ausente ou inválido).

## Plan Changelog

| Version | Phase | Change |
|---------|-------|--------|
| 1.0.0 | 0–7 | Plano inicial (implementado e mergeado em 2026-10-27, revisão SPEC-ALIGNED) |
| 1.1.0 | 8 | Adicionada: modos de jogo acessíveis (FR-9, AC-9.1–9.16) |
| 1.1.0 | 9 | Adicionada: verificação dos modos Mão e Cabeça no hardware |
