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
5. Clique uma vez na tela do jogo depois de abri-lo: o navegador só libera o som depois de uma interação.
6. Configurações (tecla M ou botão "⚙" no canto superior direito da tela de espera, que abre um painel à direita, só na tela de espera): modo de jogo (Corpo, Mão, Cabeça), tempo por card (10–30 s) e som. Ficam guardadas no notebook.
7. O jogo nunca começa sozinho: o operador aperta "▶ Iniciar" (ou Enter). Com a câmera ativa, abre a calibração ("Fique no centro", 2 s) e a partida começa; Enter na calibração a pula e joga pelas setas. Sem câmera, começa direto. "✕ Sair" (ou Esc) encerra a partida na hora e o jogo fica na espera.

## Diagnóstico do rastreio (equipe técnica)
Para medir o rastreio no notebook do estande antes de ajustar os gestos:
1. Abrir o jogo com `?diagnostico` no fim do endereço (por exemplo `…/match-do-saber/?diagnostico`). O operador do evento usa o endereço normal.
2. Com a câmera ligada, ficar a ~1,5–2 m (ou sentado, nos modos Mão e Cabeça) e jogar uma partida em cada modo, levantando cada mão e as duas, inclinando a cabeça e levantando o queixo.
3. Logo depois de cada tentativa, clicar em "Baixar registro (60 s)" e enviar o arquivo `.json` para a equipe técnica, dizendo o modo e o que tentou fazer.

O painel mostra quadros por segundo e tempo de detecção (meta: ≥ 15 quadros/s), e o registro não contém imagens da câmera.

Cada amostra tem `t` em ms desde a abertura da página; o horário é `inicioPaginaMs + t` (milissegundos desde 1970).
