---
date: 2026-10-27
spec: "001"
tags: [react, camera, strictmode]
---

# Lesson: Efeito que abre a câmera precisa de AbortController

## Context

Fase 5 da feature 001-jogo-estande: `useJogo` abre a webcam e carrega o MediaPipe num `useEffect`.

## What happened

No React StrictMode o efeito roda, é limpo e roda de novo em dev enquanto o `getUserMedia` da primeira execução ainda está pendente. Com o código do plano, o stream da primeira execução nunca era parado, uma falha tardia podia marcar a câmera como "negada" por engano e ela podia sobrescrever o `srcObject` da segunda execução.

## What to do next time

Em efeitos com permissões/dispositivos assíncronos, use um `AbortController`: passe o sinal para a função que abre o recurso, pare o stream se o sinal já foi abortado e ignore qualquer resultado (inclusive eventos como `ended`) depois do cleanup.

## Signals to watch for

Luz da câmera que não apaga em dev, status de permissão errado, `useEffect` com `await` de hardware.
