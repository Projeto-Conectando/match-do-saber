# Data Model: Match do Saber — jogo de estande

## Entities

### LinhaPlanilha (aba `noticias` da Planilha Google)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | obrigatório, `^[a-z0-9-]+$` (case-insensitive), único na planilha | Identificador; vira o nome do arquivo de imagem |
| titulo | string | obrigatório, ≤ 100 caracteres | Título chamativo do card |
| descricao | string | obrigatório, ≤ 220 caracteres | Descrição curta do card |
| saiba_mais | string | obrigatório, ≤ 1200 caracteres | Texto expandido |
| imagem | string | obrigatório, link do Google Drive com ID de arquivo acessível pela conta de serviço | Imagem do card |
| veredito | enum | `verdadeira` \| `falsa` | Gabarito |
| explicacao | string | obrigatório | Por que é verdadeira/falsa |
| tecnica | enum | `fonte` \| `data` \| `imagem` \| `contexto` | Técnica de checagem |
| fonte_url | string | obrigatório, URL http(s) válida | Fonte verificável |
| revisado_por | string | obrigatório | Quem revisou (não é publicado no app) |
| status | enum | `rascunho` \| `aprovada` | Só `aprovada` é publicada |

**Indexes:** nenhum (planilha); a unicidade de `id` é verificada na publicação.
**Relationships:** nenhuma.
**Spec requirement:** FR-6, FR-7. Os limites de tamanho derivam de FR-4 ("não cortar título ou descrição numa tela de 1366×768").

---

### Noticia (item de `content/noticias.json`, consumido pelo app)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | PK, not null | igual ao `id` da planilha |
| titulo | string | not null | — |
| descricao | string | not null | — |
| saibaMais | string | not null | — |
| imagem | string | not null, relativo à base do site (`content/img/<id>.webp`) | imagem embutida no build |
| veredito | `'verdadeira' \| 'falsa'` | not null | — |
| explicacao | string | not null | — |
| tecnica | `'fonte' \| 'data' \| 'imagem' \| 'contexto'` | not null | — |
| fonteUrl | string | not null | — |

**Indexes:** nenhum.
**Relationships:** pertence a um `Catalogo`.
**Spec requirement:** FR-4, FR-5, FR-7.

---

### Catalogo (`content/noticias.json`)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| versao | string | ISO-8601, not null | horário da publicação |
| noticias | Noticia[] | not null (pode ser vazio) | notícias publicadas |

**Indexes:** nenhum.
**Relationships:** contém 0..N `Noticia`.
**Spec requirement:** FR-7, FR-8, AC-6.4.

Não existe entidade de jogador nem de partida persistida (FR-1 "Must not"; Non-Goals).
