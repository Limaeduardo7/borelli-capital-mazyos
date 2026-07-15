---
name: borelli-weekly-content
description: Gerar, renderizar e agendar automaticamente a semana de conteúdo da Borelli Capital. Usar em execuções semanais, pedidos de sete carrosséis, planejamento editorial, publicação no Instagram e automações pelo Buffer.
---

# Conteúdo semanal da Borelli Capital

Executar o fluxo completo sem pedir aprovação adicional quando acionado pelo cron `Borelli - 7 carrosseis semanais`; o usuário já autorizou essa recorrência. Em uso manual, mostrar o resumo antes de agendar.

## Fluxo obrigatório

1. Trabalhar no diretório configurado do projeto e ler `_memoria/empresa.md`, `_memoria/preferencias.md`, `_memoria/estrategia.md` e `identidade/design-guide.md`.
2. Calcular a próxima segunda-feira em `America/Sao_Paulo` e usar essa data como `weekStart`.
3. Confirmar a presença de `identidade/assets/logo-borelli-capital.png` e ler a prancha `identidade/assets/paleta-referencia.jpeg`. Se algum arquivo estiver ausente, parar sem gerar conteúdo visual.
4. Criar `planejamento/semana-AAAA-MM-DD.json` com exatamente sete carrosséis, um para cada dia.
5. Variar os temas entre educação patrimonial, crédito estratégico, consórcio, liquidez, decisões de compra, objeções e convite consultivo. Não repetir hooks ou ângulos das quatro semanas anteriores.
6. Cada carrossel deve ter entre 6 e 8 slides. A capa deve ter no máximo oito palavras; o último slide deve ter CTA consultivo. Evitar promessas, rentabilidade garantida, urgência artificial e recomendação individual.
7. Escrever legenda completa, com CTA para reunião e de 5 a 10 hashtags relevantes. Não inventar telefone, endereço, resultados ou credenciais.
8. O próprio agente Hermes deve criar as imagens e composições visuais durante a execução semanal, seguindo integralmente o design guide. Não reutilizar os arquivos de exemplo como produção e não solicitar ao Codex uma geração prévia.
9. Validar com `node scripts/weekly-content.mjs validate --input planejamento/semana-AAAA-MM-DD.json`.
10. Renderizar com `node scripts/weekly-content.mjs render --input planejamento/semana-AAAA-MM-DD.json` somente depois de o conteúdo semanal ter sido criado pelo agente.
11. Conferir que cada pasta em `marketing/conteudo/semana-AAAA-MM-DD/` contém HTML, legenda e PNGs e que as imagens também existem em `public/media/semana-AAAA-MM-DD/`.
12. Agendar com `node scripts/weekly-content.mjs schedule --input planejamento/semana-AAAA-MM-DD.json`. O comando é idempotente e não deve ser substituído por chamadas manuais à API.
13. Independentemente de o Buffer concluir ou apresentar bloqueio, salvar o lote organizado no GitHub com `node scripts/weekly-content.mjs archive --input planejamento/semana-AAAA-MM-DD.json`. Esse comando versiona somente o planejamento, a pasta da semana e o registro de agendamento; nunca usar `git add -A` na rotina semanal.
14. Responder com os sete temas, datas, IDs retornados pelo Buffer, commit do GitHub e qualquer bloqueio real. Nunca afirmar agendamento sem IDs nem backup sem commit.

## Estrutura do JSON

```json
{
  "weekStart": "2026-07-20",
  "carousels": [
    {
      "slug": "credito-com-estrategia",
      "theme": "Crédito como ferramenta patrimonial",
      "category": "PLANEJAMENTO PATRIMONIAL",
      "hook": "Crédito não é falta de dinheiro",
      "caption": "Legenda completa...",
      "slides": [
        {"kicker": "PLANEJAMENTO", "title": "Crédito não é falta de dinheiro", "body": "É uma decisão de estrutura."},
        {"kicker": "CONTEXTO", "title": "Preservar liquidez também tem valor", "body": "Texto consultivo e objetivo."},
        {"kicker": "PRÓXIMO PASSO", "title": "Estratégia começa com diagnóstico", "body": "Converse com a Borelli Capital."}
      ]
    }
  ]
}
```

## Guardas

- Não salvar ou imprimir tokens.
- Não agendar se a validação ou a renderização falhar.
- Não usar URLs temporárias ou autenticadas; o Buffer precisa de HTTPS público estável.
- Não apagar semanas anteriores.
- Não usar `git push --force`, não versionar `.env` e não alterar o remote durante a execução semanal.
- Se faltar `BUFFER_ACCESS_TOKEN`, concluir geração e renderização, informar o bloqueio e não simular sucesso.
