---
name: agendar-buffer
description: Agenda posts aprovados no Buffer usando a API oficial. Use quando o usuário pedir para agendar, colocar na fila ou publicar depois um post criado no MazyOS.
---

# /agendar-buffer — Agendamento no Buffer

## Pré-requisitos

- No sandbox Docker, executar `cd /workspace` antes de qualquer verificação ou agendamento. Nunca usar uma cópia em `/root`.
- `/workspace/.env` criado a partir de `.env.example`.
- `BUFFER_ACCESS_TOKEN` válido e rotacionado.
- `BUFFER_ORGANIZATION_ID` configurado.
- `BUFFER_INSTAGRAM_CHANNEL_ID` configurado para o Instagram autorizado.
- Para imagens, cada URL precisa ser pública e acessível pelo Buffer.

Nunca escrever tokens em arquivos versionados, mensagens, legendas ou comandos salvos no histórico.

## Descobrir canais

```bash
cd /workspace && node scripts/weekly-content.mjs discover
```

Esse comando deve retornar a organização e o canal reais. Nunca responder sobre o estado da integração apenas inspecionando variáveis do shell. Guardar os IDs apenas no `.env` ou em configuração local não versionada.

## Agendar texto ou imagem

```bash
node --env-file=.env scripts/buffer.js schedule \
  --channel <CHANNEL_ID> \
  --at 2026-07-20T15:00:00-03:00 \
  --text "Legenda aprovada" \
  --image https://dominio-publico.com/slide-01.png
```

Para carrossel, repetir `--image` na ordem correta. Em uso manual, o agendamento só deve ser executado depois de mostrar o resumo e receber confirmação explícita do usuário, incluindo canal, data/hora, legenda e imagens. Em cron recorrente já autorizado, não pedir novamente; aplicar as regras de idempotência e exigir o ID real do Buffer.

## Fluxo

1. Localizar o conteúdo aprovado em `marketing/`.
2. Conferir legenda, canais, data/hora e URLs públicas dos slides.
3. Mostrar resumo e pedir confirmação final.
4. Listar canais se o ID ainda não for conhecido.
5. Executar o comando de agendamento.
6. Registrar apenas o ID retornado e os metadados não sensíveis em `saidas/` se necessário.
7. Relatar sucesso ou erro real da API.

Não afirmar que o post foi agendado sem um ID retornado pela API.
