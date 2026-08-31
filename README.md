# Sistema de Evolução

Aplicativo de musculação gamificado que transforma a evolução real do usuário em uma jornada de progressão.

## Estado deste repositório

Este repositório foi criado como base versionada do sistema publicado originalmente em:

`https://sistema-evolucao.contadorluidgabriel.chatgpt.site`

A primeira versão no GitHub preserva a estrutura pública atual antes das próximas melhorias de imersão, UX e motor de treino.

## Conceitos atuais

- Status do jogador
- Rank, nível e XP
- Campanha e capítulos
- Atributos: Força, Resistência, Mobilidade e Disciplina
- Missão diária
- Exercícios com XP
- Missões secundárias de suporte
- Navegação: Missão, Plano, Progresso, Codex e Perfil

## Próximas melhorias planejadas

- Trocar “Recalcular” por “Adaptar missão” com motivo
- Check-in pré-treino: tempo, energia e limitações
- Modo treino exercício por exercício
- Registro de carga, repetições e RIR
- Progressão baseada no histórico real
- Eventos do Sistema para level/rank/atributos
- Melhor hierarquia da tela inicial
- Evolução narrativa sem poluir a interface

## Deploy

Hospedagem principal planejada: **Netlify**.

- Fonte do código: GitHub (`main`)
- Publish directory: `.`
- Build command: nenhum (site HTML/CSS/JS estático)
- Configuração: `netlify.toml`
- Deploy automático: a cada push no `main`, após o repositório ser conectado ao Netlify

O GitHub continua sendo a fonte oficial do código e histórico de versões.
