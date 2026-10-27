# ADR-001-content-pipeline: Pipeline de conteúdo (Planilha Google → snapshot no build)

**Status:** Accepted
**Date:** 2026-10-26
**Feature:** 001-jogo-estande

## Context

O banco de notícias precisa ficar **fora do código**, num serviço de terceiro, e ser mantido por alguém que **não é programador**. A pessoa escolheu a **Planilha Google**. O jogo roda num estande com **internet instável**. Pela foundation (princípio 1), só pode ir ao ar notícia com fonte verificável e gabarito revisado por uma pessoa.

Pesquisa feita no brainstorm:
- Buscar o CSV publicado da planilha direto do navegador costuma falhar por CORS ([relato 1](https://forum.playcanvas.com/t/solved-cannot-get-cvs-google-spreadsheet-because-cors/13867), [relato 2](https://forums.realmacsoftware.com/t/using-gsheet-getting-access-control-allow-origin-error-in-console/33969)). São relatos de usuários, sem documentação oficial.
- Links de imagem do Google Drive em `<img>` (`uc?export=view`) passaram a retornar 403 desde 2024, e as alternativas (`lh3…/d/ID`, `thumbnail`) não são documentadas como estáveis ([Google Developers blog](https://justin.poehnelt.com/posts/google-drive-embed-images-403/), [Zapier](https://community.zapier.com/show-tell-5/how-to-update-embedded-images-like-on-a-website-using-a-zap-14339?postid=130024)).
- O Workbox não guarda respostas opacas de outro domínio por padrão, o que dificulta usar imagens externas offline ([Workbox docs](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime)).

## Options Considered

### Option A: Snapshot no build (GitHub Actions lê a planilha e embute no app)

**Pros:** toda leitura acontece no servidor de build (sem CORS) com conta de serviço só leitura, inclusive o download das imagens do Drive pela API; as imagens viram arquivos do próprio app (otimizadas em webp) e são pré-cacheadas, então o jogo funciona 100% offline; a validação do princípio 1 roda antes de publicar; a planilha não precisa ser pública.
**Cons:** a atualização não é instantânea (depende de publicar e de o notebook abrir online); exige configurar segredos no GitHub (conta de serviço, token).

### Option B: Busca ao abrir o app (Apps Script `doGet` → JSON)

**Pros:** atualização imediata a cada abertura com internet.
**Cons:** imagens do Drive continuam instáveis e difíceis de cachear; offline só funciona se o app abriu online antes; a validação fica no cliente ou no script; o endpoint expõe o gabarito publicamente.

### Option C: Trocar a planilha por um CMS headless (Sanity)

**Pros:** painel de conteúdo com upload de imagem e CDN própria; API com CORS.
**Cons:** a pessoa de conteúdo precisa aprender uma ferramenta nova (contraria a escolha feita no brainstorm); a configuração consome parte importante do prazo de 2 semanas.

## Decision

**We chose Option A (snapshot no build)** porque é a única opção que funciona 100% offline no estande. Ela também evita os problemas conhecidos de CORS e de imagens do Drive, e aplica a regra "só notícia checada vai ao ar" antes da publicação.

Formato da planilha (aba `noticias`, 1 linha = 1 notícia; listas suspensas e formatação condicional destacando campo obrigatório vazio):

| Coluna | Conteúdo |
|---|---|
| `id` | identificador único |
| `titulo` | título chamativo do card |
| `descricao` | descrição curta do card |
| `saiba_mais` | texto expandido |
| `imagem` | link de compartilhamento do Google Drive |
| `veredito` | `verdadeira` / `falsa` |
| `explicacao` | por que é verdadeira/falsa |
| `tecnica` | `fonte` / `data` / `imagem` / `contexto` |
| `fonte_url` | link da fonte verificável |
| `revisado_por` | nome de quem revisou |
| `status` | `rascunho` / `aprovada` |

Publicação:
- Menu **"Publicar no jogo"** na própria planilha (Apps Script chama o `repository_dispatch` do GitHub, com o token guardado nas propriedades do script) e execução manual do workflow como alternativa.
- O build (GitHub Actions) lê a planilha pela API com conta de serviço só leitura, baixa e otimiza as imagens e gera `noticias.json` dentro do app. Descarta linhas que não tenham `status = aprovada`, `fonte_url`, `revisado_por`, imagem válida ou qualquer campo obrigatório, e lista cada linha descartada com o motivo no resumo do workflow. Em seguida publica no GitHub Pages.
- O notebook recebe a versão nova ao abrir o app com internet (atualização do service worker).

## Consequences

- O conteúdo publicado é sempre um snapshot validado e versionado junto com o app; dá para voltar a uma versão anterior reexecutando um deploy antigo.
- A pessoa de conteúdo só vê erros de validação pelo resumo do GitHub Actions, que é menos amigável. O destaque de campos vazios na planilha reduz esse atrito. Um relatório de volta na planilha fica para depois.
- Os segredos (JSON da conta de serviço no GitHub, token no Apps Script) precisam de dono e de rotação.
- `noticias.json` e as imagens ficam públicos no site publicado, incluindo os gabaritos. É aceitável para um jogo educativo sem prêmio.
- Antes de cada evento, o operador precisa abrir o app online uma vez para garantir a versão mais recente.
