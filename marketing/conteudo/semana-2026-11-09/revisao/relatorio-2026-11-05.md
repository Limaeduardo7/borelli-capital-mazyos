# Retomada autorizada — 05/11/2026

## Estado anterior e escopo

Repositório e mount confirmados: /opt/borelli-mazze -> /workspace, origin Limaeduardo7/borelli-capital-mazyos. Container hermes-60bf23b4 ativo. Discover confirmou @ovictorbandrade, canal 6ad03a70778b240e2f12324b, organização 6ad03a54f71912c70034fa32 e fila não pausada.

Checkpoint de 04/11 lido. Este é o rascunho da automação semanal, não o teste isolado do usuário. Preservadas as sete fotos IA fonte-gerada.png. Nenhum teste de marketing/conteudo/testes foi utilizado ou publicado. Nenhum conteúdo antigo foi alterado; audit apenas atualiza estado do ledger 2026-11-02.

Consulta completa do canal (92 itens, uma página, hasNextPage=false) às 11:08 BRT: apenas hoje coberto, nenhum sent hoje, sem lacunas anteriores a scheduled nem duplicatas. Início elegível do novo lote: 06/11, após o último scheduled. Erro antigo de mídia de 20/10 não conta como cobertura e não foi reparado nem reagendado. Snapshot em queue-before.json. Semana editorial 09/11 não impõe início operacional na segunda-feira.

## Revisão financeira e fontes

O extrator web está indisponível no backend search-only. Planalto sofreu timeout e a FAQ BCB exige JavaScript. Não se tomou essas tentativas como verificação. Alternativa bem-sucedida: PDFs oficiais de texto atualizado da Câmara dos Deputados, baixados com HTTP 200 e extraídos integralmente com pypdf em venv temporário.

- Lei 11.795/2008: https://www2.camara.leg.br/legin/fed/lei/2008/lei-11795-8-outubro-2008-581885-normaatualizada-pl.pdf — arts. 5 §3, 20 §3 II, 22–24, 27: taxas, atualização contratual, sorteio/lance e condicionamento a recursos do grupo. Não são prometidos prazos nem custos específicos.
- Lei 9.514/1997: https://www2.camara.leg.br/legin/fed/lei/1997/lei-9514-20-novembro-1997-365383-normaatualizada-pl.pdf — art. 26 e §3: inadimplência pode resultar na consolidação e leilão do imóvel. O post não afirma perda imediata ou automática.
- Página oficial BB consultada com HTTP 200: https://www.bb.com.br/site/pra-voce/emprestimo/emprestimo-pessoal/emprestimo-com-garantia/emprestimo-com-garantia-de-imovel/ — uso de imóvel em garantia. Taxas e limites comerciais da página não foram utilizados.
- Fontes internas aprovadas: _memoria/empresa.md, _memoria/preferencias.md e _memoria/estrategia.md. Os posts de organização apresentam procedimentos de orçamento, cenários condicionais e perguntas para o contrato, sem dados estatísticos, regras universais ou promessas.

## Público, situação e mensagem de cada carrossel

1. **Contas da empresa** — empresários que usam o mesmo saldo para despesas pessoais e empresariais; separar compromissos antes de retirar dinheiro. Fonte: contexto aprovado e orientação de organização financeira; registro tributário remetido ao contador. Sem regra fiscal inventada.
2. **Casa como garantia** — proprietários pensando em dar a moradia em garantia; o risco da perda do imóvel precisa ser avaliado além da parcela. Fontes: Lei 9.514, art. 26, e BB. Custos devem ser consultados na proposta; não são universais.
3. **Reajuste do consórcio** — famílias comparando consórcio pela parcela inicial; entender custos, atualizações contratuais e espera antes de aderir. Fonte: Lei 11.795 nos artigos acima. Fundo de reserva/seguro qualificados por 'quando previstos'.
4. **Venda a prazo** — pequenos empresários com vencimentos antes dos recebimentos; distinguir venda de dinheiro disponível. Fonte: contexto aprovado; procedimento de calendário e cenários. Antecipação tratada como possibilidade sujeita a taxas e condições.
5. **Imóvel sem inquilino** — investidores que contam com aluguel imediato; testar a capacidade de manter o imóvel vazio. Fonte: contexto aprovado; cenário condicional sem taxa de vacância, previsão de aluguel ou regra tributária. Despesas qualificadas por responsabilidade do proprietário.
6. **Limite aprovado** — famílias usando a oferta máxima de crédito como meta; definir necessidade e orçamento antes do valor. Fonte: contexto aprovado; orientação de orçamento, sem alegação sobre score ou aprovação. Custos e condições remetidos à proposta.
7. **Calendário das dívidas** — profissionais com receitas após os vencimentos; distinguir insuficiência mensal de desencontro de datas. Fonte: contexto aprovado; não se promete mudança de vencimento. Renegociação pode ampliar prazo e custo.

Pontos individuais que continuam dependentes de contrato/proposta estão explicitamente apresentados ao leitor como itens a verificar. Não há afirmações técnicas pendentes que sustentem promessa de resultado. Hooks confrontados com os planejamentos recentes disponíveis (05/10 e 02/11); não há repetição literal nem reutilização do lote concluído.

## Revisão editorial e visual

Sete carrosséis de seis slides, total 42. Capas até oito palavras; corpos até 40 palavras, conferidos por script. Legendas reescritas para complementar o conteúdo e contextualizar o diagnóstico. Cada post tem somente a ação de conversar para avaliar o cenário; não há CTA de salvar, compartilhar ou responder concorrente. Conferido o texto realmente renderizado: o botão fixo 'Converse com a Borelli' repete a mesma ação do corpo e da legenda, sem oferecer aprovação ou produto antecipado. Não foi necessário alterar o template global.

Fotografias existentes abertas e inspecionadas: escritório, entrada de casa, maquete, oficina, apartamento, mesa doméstica e sala de conversa. Sem placeholders, pessoas inventadas como Victor, gráficos ou números embutidos. Geradas na rodada anterior; não se afirma nova geração nesta retomada. Derivados fundos para os seis cards de cada tema, mantendo a foto do tema consistente.

Validate e render canônicos concluídos. O render verificou fontes locais, imagem carregada, área segura e não sobreposição do rodapé. Confirmados HTML, legenda, seis PNGs 1080x1350 por pasta, e hashes iguais às 42 cópias públicas. Inspecionadas as sete pranchas de seis cards em largura equivalente a 360 px por card: títulos e corpo legíveis, contraste adequado, nenhuma quebra/corte observado, fotos visíveis e coerentes. Avisos essenciais estão no corpo (não dependem exclusivamente do disclaimer pequeno do template).

Tokens vigentes preservados. design-guide.md tem alteração local preexistente de minimalismo; a identidade verificada no HEAD é a mesma. Não se atribui ao job a sincronização de arquivos de identidade e não se inclui essa mudança no archive.

## Resultado real

Schedule canônico com --start-date 2026-11-06 e POST_HOUR_BRT=13 retornou sete IDs. Audit confirmou scheduled, seis assets e error=null em todos. Consulta completa posterior às 11:10 BRT: 99 itens, hasNextPage=false, oito dias consecutivos cobertos (05 a 12/11), sem lacunas futuras nem duplicatas. O item saudável de hoje foi preservado. Nenhum novo item foi publicado imediatamente.

| Data às 13h BRT | Tema | bufferPostId |
|---|---|---|
| 06/11/2026 | Contas da empresa | 6aec8e30d8fec5bcb2db24e7 |
| 07/11/2026 | Casa como garantia | 6aec8e320a5aa24b714bb65d |
| 08/11/2026 | Reajuste do consórcio | 6aec8e33bfdb27db17f2b5d9 |
| 09/11/2026 | Venda a prazo | 6aec8e35d8fec5bcb2db261f |
| 10/11/2026 | Imóvel sem inquilino | 6aec8e36368462a0c0e6e430 |
| 11/11/2026 | Limite aprovado | 6aec8e37d8fec5bcb2db26f7 |
| 12/11/2026 | Calendário das dívidas | 6aec8e397dcf8f3b736a0846 |

Canal de todos: 6ad03a70778b240e2f12324b. dueAt = data acima às 16:00:00.000Z. Estados vivos e datas também em revisao/queue-after.json e saidas/agendamentos/semana-2026-11-09.json. Último carrossel automático publicado: 6ae37bb13361c982e45d1e31, sentAt 2026-11-04T16:08:14.844Z, https://www.instagram.com/p/DfU2U-tFN_n/ .

Archive deve incluir este lote e o ledger auditado de 02/11. O hash efetivamente enviado é confirmado na saída do CLI e no relatório final, não presumido neste arquivo.
