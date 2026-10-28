---
date: 2026-10-28
spec: "001"
tags: [relogio, desempenho, mediapipe, e2e]
---

# Lesson: Relógio do jogo não pode depender da velocidade dos quadros

## Context

Bug "a barra de tempo não está diminuindo de novo" (spec v5.1.0), com o modelo de pose rodando de verdade.

## What happened

O laço `requestAnimationFrame` de `useJogo` fazia `dtMs = Math.min(agora - anterior, 100)` e rodava a detecção de pose (síncrona) no mesmo quadro. Com a detecção lenta (~154 ms/quadro, 6,6 fps medidos com câmera falsa), cada quadro contava só 100 ms e todos os tempos do reducer andavam a ~65% da velocidade real. O teto foi trocado por `dtDoQuadro` (tempo real, teto de 1 s). Depois do merge, dois testes E2E começaram a falhar às vezes: liam o valor inicial exato da barra logo após o início e só passavam porque o relógio lento, sob carga, segurava a barra parada.

## What to do next time

- Tempos de jogo usam tempo real; teto de dt só para pausas longas (aba oculta, repouso), nunca abaixo do pior quadro esperado.
- Para provar um bug de desempenho, medir com o modelo real (Playwright + `--use-fake-device-for-media-stream`) e comparar com a conta (aqui, 100/154 = 65% previsto contra 69% medido).
- Em E2E, não ler valores exatos de algo que corre em tempo real logo depois de uma ação; usar faixa pequena e deixar o valor exato para testes unitários.

## Signals to watch for

Barra, cronômetro ou animação "travados" ou lentos só com a câmera ligada; `Math.min(dt, …)` pequeno em laço de jogo; testes que passam sozinhos e falham na suíte paralela.
