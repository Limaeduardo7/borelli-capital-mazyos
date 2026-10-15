import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function siteCarouselHtml(root, item, backgroundDir) {
  const t = JSON.parse(fs.readFileSync(path.join(root, 'identidade/site-tokens.json'), 'utf8'));
  const fonts = [['Cormorant Garamond',500,'cormorant-500'],['Inter',400,'inter-400'],['Inter',600,'inter-600']].map(([family,weight,file]) => {
    const p = path.join(root,'identidade/assets/fonts',`${file}.woff2`);
    if (!fs.existsSync(p)) throw new Error(`Fonte ausente: ${p}`);
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url('${pathToFileURL(p).href}') format('woff2')}`;
  }).join('\n');
  const subject = `${item.category || ''} ${item.theme || ''}`.toLowerCase();
  const disclaimer = item.disclaimer || (subject.includes('contemplad') ? 'Transferência e utilização sujeitas à análise, regras e aprovação da administradora.' : subject.includes('consórc') ? 'Contemplação por sorteio ou lance, sem garantia de data. Condições conforme contrato.' : subject.includes('crédito') ? 'Crédito sujeito à análise e à aprovação da instituição credora.' : 'Conteúdo educativo. A estratégia adequada depende de análise individual.');
  const slides = item.slides.map((s,i) => {
    const n = String(i+1).padStart(2,'0');
    const photo = path.join(backgroundDir,`fundo-${n}.png`);
    if (!fs.existsSync(photo)) throw new Error(`Fotografia obrigatória ausente: ${photo}`);
    const final = i === item.slides.length-1;
    return `<section class="slide ${i%3===0?'dark':''}">
      <header><div class="brand">BORELLI<span>CAPITAL</span></div><span class="counter">${n} / ${String(item.slides.length).padStart(2,'0')}</span></header>
      <main><div class="kicker">${esc(s.kicker || item.category || 'PLANEJAMENTO PATRIMONIAL')}</div><h1 style="font-size:${s.title.length>78?70:s.title.length>52?82:100}px">${esc(s.title)}</h1><div class="rule"></div><p style="font-size:${(s.body||'').length>240?28:34}px">${esc(s.body)}</p>${s.emphasis?`<div class="emphasis">${esc(s.emphasis)}</div>`:''}</main>
      <div class="photo"><img src="${pathToFileURL(photo).href}" alt=""><div class="photo-shade"></div></div>
      <footer><div class="footer-row"><span class="signature">Estratégia para o seu patrimônio.</span><span class="cta ${final?'solid':''}">${final?'Converse com a Borelli':'Continue a leitura'} <span>→</span></span></div><div class="disclaimer">${esc(disclaimer)}</div></footer>
    </section>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>${fonts}
  *{box-sizing:border-box}body{margin:0;font-family:Inter,sans-serif;background:${t.navy}}
  .slide{width:1080px;height:1350px;position:relative;overflow:hidden;background:${t.cream};color:${t.graphite}}
  .dark{background:${t.navy};color:${t.cream}}
  header{position:absolute;top:58px;left:68px;right:68px;display:flex;justify-content:space-between;align-items:center}
  .brand{font-family:'Cormorant Garamond';font-weight:500;font-size:48px;letter-spacing:6px;line-height:1;display:flex;flex-direction:column;align-items:center;color:${t.navy}}
  .dark .brand{color:${t.cream}}.brand span{font:400 13px Inter;letter-spacing:10px;margin:12px 0 0 9px}
  .counter{font-size:17px;letter-spacing:3px;color:${t.gold}}
  main{position:absolute;left:68px;right:68px;top:210px;height:550px}
  .kicker{font-size:18px;line-height:1.5;font-weight:600;letter-spacing:2.3px;text-transform:uppercase;color:${t.gold};margin-bottom:24px}
  h1{font-family:'Cormorant Garamond';font-weight:500;line-height:1.04;letter-spacing:-.035em;margin:0;max-width:935px;color:${t.navy}}
  .dark h1{color:${t.cream}}.rule{width:65px;height:2px;background:${t.gold};margin:30px 0 23px}
  p{margin:0;font-weight:400;line-height:1.5;max-width:880px}.emphasis{font-size:23px;line-height:1.4;margin-top:16px;color:${t.gold}}
  .photo{position:absolute;top:800px;left:68px;right:68px;height:330px;overflow:hidden}.photo img{width:100%;height:100%;object-fit:cover;object-position:center}
  .photo-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,23,32,.18),transparent)}
  footer{position:absolute;left:68px;right:68px;bottom:32px;height:150px;border-top:1px solid ${t.gold};padding-top:25px}
  .footer-row{display:flex;align-items:center;justify-content:space-between;gap:20px}.signature{font:500 27px 'Cormorant Garamond';max-width:420px}
  .cta{border:1px solid ${t.gold};padding:19px 22px;font-size:19px;font-weight:600;white-space:nowrap}.cta span{margin-left:18px;color:${t.gold}}.solid{background:${t.gold};color:${t.navy}}.solid span{color:${t.navy}}
  .disclaimer{font-size:14px;line-height:1.5;margin-top:22px;opacity:.85}
  </style><body>${slides}</body></html>`;
}
