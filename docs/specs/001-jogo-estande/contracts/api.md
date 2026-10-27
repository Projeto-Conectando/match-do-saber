# API Contracts: Match do Saber — jogo de estande

## GET content/noticias.json

**Purpose:** catálogo publicado que o app lê na inicialização (arquivo estático, pré-cacheado).
**Spec requirement:** FR-7, FR-8, Story 6, Story 8.

### Request

```json
{}
```

### Response (200 OK)

```json
{
  "versao": "string — ISO-8601 da publicação",
  "noticias": [
    {
      "id": "string",
      "titulo": "string",
      "descricao": "string",
      "saibaMais": "string",
      "imagem": "string — caminho relativo, ex.: content/img/vacina-chip.webp",
      "veredito": "'verdadeira' | 'falsa'",
      "explicacao": "string",
      "tecnica": "'fonte' | 'data' | 'imagem' | 'contexto'",
      "fonteUrl": "string — URL http(s)"
    }
  ]
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 404 / rede | arquivo ausente ou primeira abertura offline | app mostra "Conecte à internet uma vez para baixar o jogo" |
| 200 com formato inválido | `parseCatalogo` lança erro | app mostra "Conecte à internet uma vez para baixar o jogo" e registra o erro no console |

## POST https://api.github.com/repos/{owner}/{repo}/dispatches

**Purpose:** o menu "Publicar no jogo" (Apps Script) dispara o workflow de publicação.
**Spec requirement:** FR-6, FR-7, AC-7.2.

### Request

```json
{
  "event_type": "string — sempre 'publicar-conteudo'"
}
```

Headers: `Authorization: Bearer <token fine-grained com Contents: read/write no repositório>`, `Accept: application/vnd.github+json`.

### Response (204 No Content)

```json
{}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 401 | token inválido/expirado | alerta "Não foi possível iniciar a publicação (código 401). Avise a equipe técnica." |
| 404 | repositório errado ou token sem acesso | mesmo alerta, com o código 404 |
| 422 | payload inválido | mesmo alerta, com o código 422 |
