# Identidade visual social — Borelli Capital

Vigente em 2026-10-15. A identidade dos próximos posts deve ser a mesma do site Borelli Capital. Esta especificação substitui as direções sociais anteriores, inclusive Montserrat, preto/vermelho e as referências de setembro.

## Fonte de verdade

Tokens em `identidade/site-tokens.json`, extraídos de `src/styles/global.css` do site oficial. Azul-marinho #0B1720, off-white #F3F0EA, champagne #B6A071 e grafite #25292C. Títulos e assinatura em Cormorant Garamond 500; corpo e metadados em Inter 400/600. Fontes locais em `identidade/assets/fonts/`; não substituir por Montserrat ou Georgia.

## Composição

Carrosséis 1080 × 1350 px, PNG sRGB 8-bit. Alternar fundos navy e off-white; champagne apenas em acentos, linhas e CTA. Margens de 68 px, respiro amplo, hierarquia editorial e títulos serifados. Assinatura BORELLI / CAPITAL tipográfica como no cabeçalho do site, sem inventar símbolo. Botões retangulares sem arredondamento, bordas finas e nenhum efeito neon, círculo decorativo ou sombra pesada.

Usar fotografias arquitetônicas, empresariais e patrimoniais coerentes com o assunto, sem texto embutido. Fotografias em `fundos/fundo-01.png` etc. são obrigatórias: o renderizador interrompe quando faltam. Preservar a identidade real de Victor quando sua imagem for utilizada. Não inventar resultados, credenciais, aprovação ou rentabilidade.

## Execução e validação

O renderizador canônico é `scripts/weekly-content.mjs`, com template em `scripts/carousel-template.mjs`. Não criar templates paralelos por semana. Gerar fotos e conteúdo antes de executar `render`. O processo verifica fontes, imagens e limites de texto e interrompe se houver overflow; ajustar a redação/composição, nunca cortar informação silenciosamente.

Prévia sem publicação: `node scripts/weekly-content.mjs preview --input planejamento/semana-AAAA-MM-DD.json`. Usa as fotos da semana e grava exclusivamente em `.runtime/brand-preview/`; não altera mídia pública ou Buffer. Prévia de semana antiga serve apenas para conferência visual, não para republicação.

Inspecionar visualmente uma folha de contato de todos os slides antes de agendar. O novo padrão vale para lotes futuros ainda não renderizados/agendados. Preservar posts existentes e seus URLs. A mudança visual não autoriza nova publicação nem reagendamento.

Tom consultivo, sóbrio e claro. CTA para conversa/reunião. Disclaimer adequado ao produto; contemplado exige análise de transferência e regras da administradora, sem prometer liberação automática.
