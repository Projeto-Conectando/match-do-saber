# ADR-001-frontend-stack: Stack do front-end e PWA

**Status:** Accepted
**Date:** 2026-10-26
**Feature:** 001-jogo-estande

## Context

O Match do Saber precisa ser uma aplicação web **instalável** que roda num notebook de estande com Wi-Fi instável, ou seja, precisa funcionar offline depois de carregada. O prazo é de 2 semanas. A interface mistura cards animados (inclinação conforme o corpo, saída lateral estilo Tinder) com textos longos ("saiba mais", explicações), que precisam ser legíveis e acessíveis. O projeto ainda não tem stack nem código.

## Options Considered

### Option A: Vite + React 18 + TypeScript + vite-plugin-pwa

**Pros:** ecossistema maior (bibliotecas de gesto/animação, exemplos de MediaPipe em React); `vite-plugin-pwa` gera manifest e service worker Workbox com precache, cobrindo instalação e uso offline; TypeScript tipa o formato das notícias geradas no build; Vitest e Playwright integram direto com Vite; é a opção mais rápida de entregar no prazo.
**Cons:** bundle maior que Svelte; o re-render a cada quadro da câmera precisa ficar fora do estado do React (refs) para não travar.

### Option B: Vite + Svelte + TypeScript

**Pros:** bundle menor; transições e animações nativas simples.
**Cons:** ecossistema e material de apoio menores para quem mantiver o código depois; menos exemplos prontos de integração com MediaPipe.

### Option C: Phaser (motor de jogo 2D)

**Pros:** canvas com física e efeitos; bom desempenho para animação.
**Cons:** textos longos, rolagem do "saiba mais" e acessibilidade (leitor de tela, foco) ficam muito mais trabalhosos dentro de canvas; PWA e offline continuam sendo configurados à parte.

## Decision

**We chose Option A (Vite + React 18 + TypeScript + vite-plugin-pwa)** porque atende diretamente aos requisitos "instalável" e "offline no estande" via precache do Workbox. Também é a opção com menor risco para o prazo de 2 semanas e mantém os textos do conteúdo em HTML acessível, alinhado ao princípio "o jogo ensina o método".

Decisões menores, inline (sem ADR): CSS Modules para estilo; ESLint + Prettier; Vitest para testes unitários e Playwright para E2E; hospedagem estática no GitHub Pages, publicada pelo mesmo workflow do GitHub Actions do pipeline de conteúdo (ver [001-content-pipeline](001-content-pipeline.md)).

## Consequences

- Todo o jogo é estático: não há servidor próprio para manter, e nenhum dado de jogador sai do notebook.
- O loop da câmera precisa rodar fora do ciclo de render do React (refs + `requestAnimationFrame`), publicando para a UI só os eventos de gesto já interpretados.
- A atualização do app e do conteúdo chega ao notebook pelo service worker: o estande precisa abrir o app com internet pelo menos uma vez depois de cada publicação.
- Trocar de framework depois exigiria reescrever toda a UI. O pipeline de conteúdo e a lógica de gestos ficam em módulos TypeScript sem dependência de React, para sobreviverem a uma troca.
