---
date: 2026-10-27
spec: "001"
tags: [conteudo, google-sheets, offline, adr]
---

# Lesson: Planilha Google não serve como fonte em tempo de execução

## Context

Brainstorm da feature 001-jogo-estande: escolher como as notícias da Planilha Google chegam a um PWA que roda num estande com Wi-Fi instável.

## What happened

A ideia óbvia (ler o CSV publicado da planilha no navegador) esbarra em CORS segundo vários relatos, e links de imagem do Google Drive em `<img>` (`uc?export=view`) passaram a dar 403 desde 2024. Além disso, o Workbox não cacheia respostas opacas de outro domínio por padrão. Escolhemos ler a planilha e baixar as imagens no build (GitHub Actions + conta de serviço) e embutir tudo no app (ADR 001-content-pipeline).

## What to do next time

Quando o conteúdo vier de Google Sheets/Drive e o app precisar funcionar offline, gere um snapshot no build (JSON + imagens otimizadas servidas pelo próprio site) em vez de buscar em tempo de execução.

## Signals to watch for

Pedido de "conteúdo editável por não programador numa planilha" combinado com offline, imagens do Drive ou erro de CORS/403 ao buscar da planilha.
