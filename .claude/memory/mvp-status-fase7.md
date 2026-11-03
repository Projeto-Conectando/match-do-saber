---
name: mvp-status-fase7
description: MVP 001-jogo-estande (spec v7.0.0, com foto polaroid no resumo, gestos novos do modo Mão e modo de diagnóstico, modos, Configurações no canto superior direito, Iniciar/Sair, sons, início só manual, card parado, barra de tempo, tempo corre no saiba mais) está na main; verificação manual das Fases 7, 9, 11, 13, 15 e 17 e setup do GitHub/Google pendentes; prazo 2026-11-09
metadata:
  type: project
---

O MVP 001-jogo-estande foi mergeado na `main` em 2026-10-27 (revisão SDD Mode B: SPEC-ALIGNED). Prazo de entrega: 2026-11-09.

Pendente (Fase 7, manual — ver `docs/specs/001-jogo-estande/plan.md`):
- Teste no notebook real com webcam a 1,5–2 m (gestos, sair do quadro, 2ª pessoa, "saiba mais"); ajustar `CONFIG_GESTOS` se preciso.
- Partida iniciada por Enter com câmera ligada; câmera negada/desconectada; instalação + offline; desempenho (≥15 fps, gesto ≤1 s); 8 h de operação; confirmar que o auto-update do SW não recarrega no meio de uma partida.
- Planilha real ponta a ponta (inclusive o separador `;` da fórmula em `apps-script/Code.gs`).
- (v1.1.0, mergeado em 2026-10-27) Fase 9: testar os modos Mão e Cabeça sentado no notebook real, de preferência com uma pessoa com baixa mobilidade; ajustar `margemMaoOmbro`, `limiarCabecaGraus`, `retornoCabecaGraus` e `limiarQueixo` em `CONFIG_GESTOS`; conferir que o menu aberto bloqueia a calibração.
- (v2.0.0, mergeado em 2026-10-27) Fase 11: ouvir os sons no barulho do evento (ajustar `volume` em `src/app/audio.ts`), layout na TV, tempos de 10 s e 30 s com o público, "✕ Sair" sobre a faixa "Câmera indisponível" e recalibração logo após Sair com o jogador ainda no quadro.
- (v3.0.0, mergeado em 2026-10-27) Fase 13: com a câmera real, confirmar que nada começa sozinho na espera, Iniciar → calibração → partida, Sair/ausência deixam na espera, Enter duas vezes com pouca luz; e Iniciar enquanto a câmera ainda carrega (começa direto).
- (v4.0.0, mergeado em 2026-10-27) Fase 15: com a câmera real, confirmar que o card não treme/inclina antes da escolha; barra e pulso vermelho legíveis a ~2 m na TV; centralização na resolução da TV; checar com a equipe de conteúdo o corte 16:9 das imagens (antes 4:3).
- (v5.0.0, mergeado em 2026-10-28) Fase 17: abrir o "saiba mais" pelo gesto de cada modo e conferir que a barra continua descendo e que ele só fecha por gesto/↑/escolha/tempo; avaliar se 15 s bastam para ler e decidir (senão, subir o tempo por card até 30 s).
- (v5.1.0, mergeado em 2026-10-28) Fase 18: na TV do estande, conferir que o botão ⚙ (canto superior direito) é fácil de achar e que o painel lateral de Configurações é legível.
- (2026-10-28) Relógio do jogo agora segue o tempo real (antes, com a detecção de pose lenta, a barra andava a ~65%). Medido aqui: a detecção deixa o jogo a ~6–7 fps (meta da spec ≥15). Pendente: medir fps e rastreio das mãos no notebook real antes de mudar limites; possível modo de diagnóstico na tela (proposto, não feito).
- (v5.2.0, mergeado em 2026-10-28) Modo de diagnóstico em `?diagnostico` (painel + "Baixar registro (60 s)").
- (v6.0.0, mergeado em 2026-10-29) Bug da barra parada no modo Mão RESOLVIDO: causa era a pausa por ausência quando a detecção perdia a pessoa ao levantar a mão (confirmado: Enter duas vezes funcionava). Agora Mão/Cabeça ignoram ausência. Modo Mão ganhou "duas mãos para um lado" e "arrastar do centro". Fase 21 pendente: testar os gestos no notebook com `?diagnostico` (inclusive "V" e braços abertos) e ajustar `duasMaosLadoL`, `centroArrasteL`, `arrasteMinL`, `arrasteMaxMs`.
- (v6.1.0, mergeado em 2026-10-29) A dica do modo Mão (AC-9.14) agora cita os três jeitos de escolher. Fase 23 pendente: conferir na TV a 1,5–2 m que a dica é legível e não cobre o card nem a barra.
- (v7.0.0, mergeado em 2026-11-03) Resumo mostra polaroid com quadro da câmera do card do meio (⌈M/2⌉), só em memória (apagado ao fechar o resumo); item "Foto no resumo" no menu (ligado por padrão). A exceção à regra "não guardar imagem da câmera" foi decidida sem emendar o Princípio 3 porque nada é salvo/enviado; baixar/QR ficou fora (exigiria emenda). Fase 25 pendente: enquadramento no recorte quadrado, legibilidade na TV, sem travada no instante da foto.
- Planilha: aba `noticias` criada pela `configurarPlanilha` (2026-10-29); faltam a conta de serviço Google (Parte 2) e o GitHub/secrets/token (Parte 3) do guia.
- O repositório não tem remoto: criar repo no GitHub, conta de serviço Google, secrets/variables e token do Apps Script conforme `docs/operacao.md`.

**Why:** o código só foi verificado sem câmera e sem contas reais; nada foi publicado.
**How to apply:** em sessões futuras, não tratar o MVP como entregue até esses itens serem confirmados; começar por eles antes de novas features.
