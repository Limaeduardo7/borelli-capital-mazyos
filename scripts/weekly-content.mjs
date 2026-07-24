#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const DEFAULT_MEDIA_BASE_URL = 'https://srv1829993.hstgr.cloud/media';

function loadEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`não foi possível ler ${file}: ${error.message}`);
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) {
      args._.push(argv[i]);
      continue;
    }
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function defaultInputPath() {
  const planning = path.join(ROOT, 'planejamento');
  if (!fs.existsSync(planning)) fail('pasta planejamento ausente.');
  const files = fs.readdirSync(planning)
    .filter((name) => /^semana-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .reverse();
  if (!files.length) fail('nenhum planejamento semanal encontrado em planejamento/semana-AAAA-MM-DD.json.');
  return path.join(planning, files[0]);
}

function validatePlan(plan) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.weekStart || '')) errors.push('weekStart deve usar AAAA-MM-DD.');
  if (!Array.isArray(plan.carousels) || plan.carousels.length !== 7) errors.push('carousels deve conter exatamente 7 itens.');
  const slugs = new Set();
  for (const [index, item] of (plan.carousels || []).entries()) {
    const label = `carrossel ${index + 1}`;
    if (!item.theme) errors.push(`${label}: theme ausente.`);
    if (!item.hook || item.hook.length > 90) errors.push(`${label}: hook ausente ou acima de 90 caracteres.`);
    if (!item.caption || item.caption.length < 120) errors.push(`${label}: caption deve ter ao menos 120 caracteres.`);
    if (!Array.isArray(item.slides) || item.slides.length < 5 || item.slides.length > 9) {
      errors.push(`${label}: slides deve conter entre 5 e 9 itens.`);
    }
    const slug = slugify(item.slug || item.theme);
    if (!slug) errors.push(`${label}: slug inválido.`);
    if (slugs.has(slug)) errors.push(`${label}: slug repetido (${slug}).`);
    slugs.add(slug);
    for (const [slideIndex, slide] of (item.slides || []).entries()) {
      if (!slide.title || slide.title.length > 120) errors.push(`${label}, slide ${slideIndex + 1}: título ausente ou longo.`);
      if (slide.body && slide.body.length > 420) errors.push(`${label}, slide ${slideIndex + 1}: corpo acima de 420 caracteres.`);
    }
  }
  if (errors.length) fail(`planejamento inválido:\n- ${errors.join('\n- ')}`);
  return plan;
}

function themeFor(index) {
  return ['dark', 'light', 'graphite'][index % 3];
}

function carouselHtml(item, backgroundDir = null) {
  const logoFile = path.join(ROOT, 'identidade', 'assets', 'logo-borelli-capital.png');
  if (!fs.existsSync(logoFile)) fail('logo oficial ausente em identidade/assets/logo-borelli-capital.png.');
  const logoUrl = pathToFileURL(logoFile).href;
  const variableFont = path.join(ROOT, 'identidade', 'assets', 'Montserrat-Variable.ttf');
  const fontFaces = fs.existsSync(variableFont)
    ? `@font-face{font-family:Montserrat;src:url('${pathToFileURL(variableFont).href}') format('truetype');font-weight:100 900;font-style:normal}`
    : '';
  const slides = item.slides.map((slide, index) => {
    const theme = themeFor(index);
    const number = String(index + 1).padStart(2, '0');
    const total = String(item.slides.length).padStart(2, '0');
    const kicker = slide.kicker || item.category || 'PLANEJAMENTO PATRIMONIAL';
    const isFinal = index === item.slides.length - 1;
    const backgroundFile = backgroundDir
      ? path.join(backgroundDir, `fundo-${number}.png`)
      : null;
    const overlay = theme === 'light'
      ? 'linear-gradient(rgba(242,242,242,.78),rgba(242,242,242,.78))'
      : 'linear-gradient(rgba(13,13,13,.48),rgba(13,13,13,.48))';
    const backgroundStyle = backgroundFile && fs.existsSync(backgroundFile)
      ? ` style="background-image:${overlay},url('${pathToFileURL(backgroundFile).href}');background-size:cover;background-position:center"`
      : '';
    return `
      <section class="slide ${theme} ${isFinal ? 'final' : ''}"${backgroundStyle}>
        <header><div class="brand"><img src="${logoUrl}" alt="Borelli Capital"></div><span class="counter">${number} / ${total}</span></header>
        <span class="display-index" aria-hidden="true">${number}</span>
        <main>
          <div class="kicker">${escapeHtml(kicker)}</div>
          <div class="rule"></div>
          <h1>${escapeHtml(slide.title)}</h1>
          ${slide.body ? `<p>${escapeHtml(slide.body)}</p>` : ''}
          ${slide.emphasis ? `<div class="emphasis">${escapeHtml(slide.emphasis)}</div>` : ''}
        </main>
        <footer><span>${escapeHtml(item.footer || 'Crédito como ferramenta. Patrimônio como estratégia.')}</span><span>borellicapital.com.br</span></footer>
      </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  ${fontFaces}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#5A5A5A;font-family:Montserrat,Arial,sans-serif}.slide{width:1080px;height:1350px;padding:62px 78px 58px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}.slide:after{content:"";position:absolute;width:620px;height:240px;border-top:2px solid currentColor;border-radius:50%;opacity:.13;right:-150px;bottom:145px;transform:rotate(-18deg)}.dark{background:#0D0D0D;color:#F2F2F2}.light{background:#F2F2F2;color:#0D0D0D}.graphite{background:#202020;color:#F2F2F2}.slide header,.slide footer{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:3}.brand{height:112px;display:flex;align-items:center}.brand img{width:145px;height:auto;display:block}.counter{font-size:16px;letter-spacing:.17em;opacity:.68}.display-index{position:absolute;right:42px;top:150px;z-index:1;font-size:270px;line-height:.82;font-weight:820;letter-spacing:-.09em;color:transparent;-webkit-text-stroke:2px rgba(242,242,242,.16);font-variation-settings:"wght" 820}.light .display-index{-webkit-text-stroke-color:rgba(13,13,13,.14)}.slide main{position:relative;z-index:2;max-width:900px}.slide:nth-child(3n+2) main{transform:translateX(52px);max-width:820px}.kicker{font-size:18px;font-weight:760;letter-spacing:.25em;text-transform:uppercase;color:#E10600;font-variation-settings:"wght" 760}.rule{width:108px;height:5px;background:#E10600;margin:28px 0 44px}.slide:nth-child(3n) .rule{width:176px}.slide h1{font-family:Montserrat,Arial,sans-serif;font-size:100px;line-height:.94;letter-spacing:-.052em;margin:0;max-width:920px;font-weight:790;font-variation-settings:"wght" 790}.slide p{font-size:32px;font-weight:360;line-height:1.38;max-width:820px;margin:34px 0 0;opacity:.94;font-variation-settings:"wght" 360}.emphasis{display:inline-block;margin-top:36px;border-left:5px solid #E10600;padding:14px 0 14px 22px;font-size:23px;letter-spacing:.02em}.slide footer{font-size:15px;font-weight:360;letter-spacing:.05em;border-top:1px solid #5A5A5A;padding-top:24px;opacity:.78}.final main{max-width:850px}.final h1{font-size:114px;line-height:.91}.final .rule{width:210px}.light .counter,.light footer{color:#5A5A5A}.light .brand img{filter:none}
</style></head><body>${slides}</body></html>`;
}

async function renderPlan(inputFile, plan) {
  const { chromium } = await import('playwright');
  const weekDirName = `semana-${plan.weekStart}`;
  const outputRoot = path.join(ROOT, 'marketing', 'conteudo', weekDirName);
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(publicRoot, { recursive: true });
  fs.copyFileSync(inputFile, path.join(outputRoot, 'planejamento.json'));

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [index, item] of plan.carousels.entries()) {
      const slug = `${String(index + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
      const postDir = path.join(outputRoot, slug);
      const imageDir = path.join(postDir, 'instagram');
      const publicPostDir = path.join(publicRoot, slug);
      fs.mkdirSync(imageDir, { recursive: true });
      fs.mkdirSync(publicPostDir, { recursive: true });
      const html = carouselHtml(item, path.join(postDir, 'fundos'));
      fs.writeFileSync(path.join(postDir, 'carrossel.html'), html, 'utf8');
      fs.writeFileSync(path.join(postDir, 'legenda.md'), `${item.caption.trim()}\n`, 'utf8');
      writeJsonAtomic(path.join(postDir, 'conteudo.json'), item);

      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.join(postDir, 'carrossel.html')).href, { waitUntil: 'load' });
      const locators = page.locator('.slide');
      for (let slideIndex = 0; slideIndex < await locators.count(); slideIndex += 1) {
        const filename = `slide-${String(slideIndex + 1).padStart(2, '0')}.png`;
        const localFile = path.join(imageDir, filename);
        await locators.nth(slideIndex).screenshot({ path: localFile });
        const normalizedFile = `${localFile}.normalized.png`;
        const normalized = spawnSync('convert', [localFile, '-depth', '8', '-colorspace', 'sRGB', normalizedFile], { encoding: 'utf8' });
        if (normalized.status !== 0) fail(`não foi possível normalizar ${localFile}: ${(normalized.stderr || '').trim()}`);
        fs.renameSync(normalizedFile, localFile);
        fs.copyFileSync(localFile, path.join(publicPostDir, filename));
      }
      await page.close();
      console.log(`renderizado: ${slug} (${item.slides.length} slides)`);
    }
  } finally {
    await browser.close();
  }
  console.log(`semana renderizada: ${outputRoot}`);
}

async function bufferRequest(query, variables = {}) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) fail(`BUFFER_ACCESS_TOKEN ausente em ${path.join(ROOT, '.env')}.`);
  const response = await fetch(process.env.BUFFER_API_URL || 'https://api.buffer.com', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) fail(`Buffer HTTP ${response.status}.`);
  if (body.errors?.length) fail(`Buffer: ${body.errors.map((error) => error.message).join('; ')}`);
  return body.data;
}

async function discoverBuffer() {
  const accountData = await bufferRequest(`query AccountOrganizations { account { organizations { id name } } }`);
  const organizations = accountData?.account?.organizations || [];
  if (!organizations.length) fail('nenhuma organização encontrada no Buffer.');
  const requestedOrg = process.env.BUFFER_ORGANIZATION_ID;
  const organization = requestedOrg
    ? organizations.find((item) => item.id === requestedOrg)
    : organizations.length === 1 ? organizations[0] : null;
  if (!organization) {
    console.log('Organizações disponíveis:');
    for (const item of organizations) console.log(`${item.id}\t${item.name}`);
    fail('defina BUFFER_ORGANIZATION_ID porque existe mais de uma organização.');
  }
  const channelData = await bufferRequest(`query InstagramChannels($organizationId: OrganizationId!) { channels(input: { organizationId: $organizationId }) { id name displayName service isQueuePaused } }`, { organizationId: organization.id });
  const instagram = (channelData?.channels || []).filter((item) => String(item.service).toLowerCase().includes('instagram'));
  const requestedChannel = process.env.BUFFER_INSTAGRAM_CHANNEL_ID;
  const channel = requestedChannel
    ? instagram.find((item) => item.id === requestedChannel)
    : instagram.length === 1 ? instagram[0] : null;
  if (!channel) {
    console.log(`Organização: ${organization.id}\t${organization.name}`);
    console.log('Canais Instagram disponíveis:');
    for (const item of instagram) console.log(`${item.id}\t${item.displayName || item.name}`);
    fail(instagram.length ? 'defina BUFFER_INSTAGRAM_CHANNEL_ID porque existe mais de um Instagram.' : 'nenhum canal Instagram conectado.');
  }
  return { organization, channel };
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dueAtFor(weekStart, dayIndex) {
  const hour = Number(process.env.POST_HOUR_BRT || '13');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) fail('POST_HOUR_BRT deve estar entre 0 e 23.');
  const utcHour = (hour + 3) % 24;
  const dayOffset = hour + 3 >= 24 ? dayIndex + 1 : dayIndex;
  return `${addDays(weekStart, dayOffset)}T${String(utcHour).padStart(2, '0')}:00:00.000Z`;
}

async function assertPublic(url) {
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (!response.ok) fail(`mídia não está pública (${response.status}): ${url}`);
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) fail(`URL não retornou imagem (${type || 'sem content-type'}): ${url}`);
}

async function schedulePlan(plan, startDate = plan.weekStart) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) fail('--start-date deve usar AAAA-MM-DD.');
  const { channel } = await discoverBuffer();
  const weekDirName = `semana-${plan.weekStart}`;
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  if (!fs.existsSync(publicRoot)) fail('semana ainda não renderizada. Execute o comando render.');
  const mediaBase = (process.env.MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');
  const ledgerFile = path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`);
  const ledger = fs.existsSync(ledgerFile) ? readJson(ledgerFile) : { weekStart: plan.weekStart, channelId: channel.id, posts: [] };

  for (const [index, item] of plan.carousels.entries()) {
    const slug = `${String(index + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
    if (ledger.posts.some((post) => post.slug === slug && post.bufferPostId)) {
      console.log(`já agendado: ${slug}`);
      continue;
    }
    const imageFiles = fs.readdirSync(path.join(publicRoot, slug)).filter((name) => /^slide-\d+\.png$/.test(name)).sort();
    if (!imageFiles.length) fail(`nenhum slide público para ${slug}.`);
    const mediaVersion = plan.weekStart.replaceAll('-', '');
    const urls = imageFiles.map((name) => `${mediaBase}/${weekDirName}/${slug}/${name}?v=${mediaVersion}`);
    for (const url of urls) await assertPublic(url);
    const dueAt = dueAtFor(startDate, index);
    const input = {
      text: item.caption,
      channelId: channel.id,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
      dueAt,
      assets: urls.map((url) => ({ image: { url } })),
    };
    const data = await bufferRequest(`mutation ScheduleCarousel($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id text dueAt assets { id mimeType } } } ... on MutationError { message } } }`, { input });
    const result = data?.createPost;
    if (!result?.post?.id) fail(result?.message || `Buffer não retornou ID para ${slug}.`);
    ledger.posts.push({ slug, bufferPostId: result.post.id, dueAt, assets: urls.length, scheduledAt: new Date().toISOString() });
    writeJsonAtomic(ledgerFile, ledger);
    console.log(`agendado: ${slug} -> ${dueAt} (${result.post.id})`);
  }
  console.log(`concluído: ${ledger.posts.length}/7 carrosséis registrados em ${ledgerFile}`);
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...options });
  if (result.status !== 0 && !options.allowFailure) {
    fail(`git ${args[0]} falhou: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result;
}

function archivePlan(inputFile, plan) {
  const weekDirName = `semana-${plan.weekStart}`;
  const outputRoot = path.join(ROOT, 'marketing', 'conteudo', weekDirName);
  if (!fs.existsSync(outputRoot)) fail('semana ainda não renderizada; nada para arquivar.');
  const paths = [
    inputFile,
    outputRoot,
    path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`),
  ].filter((entry) => fs.existsSync(entry));
  runGit(['rev-parse', '--is-inside-work-tree']);
  runGit(['add', '--', ...paths]);
  const staged = runGit(['diff', '--cached', '--quiet'], { allowFailure: true });
  if (staged.status === 0) {
    console.log(`GitHub: semana ${plan.weekStart} já está versionada.`);
    return;
  }
  runGit(['commit', '-m', `conteudo: semana ${plan.weekStart}`]);
  runGit(['push', 'origin', 'HEAD:main']);
  const sha = runGit(['rev-parse', '--short', 'HEAD']).stdout.trim();
  console.log(`GitHub: semana ${plan.weekStart} salva no commit ${sha}.`);
}

const [command = 'help', ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
if (command === 'discover') {
  const result = await discoverBuffer();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
if (!['validate', 'render', 'schedule', 'archive'].includes(command)) {
  console.log('Uso: node scripts/weekly-content.mjs <validate|render|discover|schedule|archive> [--input planejamento/semana-AAAA-MM-DD.json]');
  process.exit(command === 'help' ? 0 : 2);
}
const inputFile = path.resolve(ROOT, args.input || defaultInputPath());
const plan = validatePlan(readJson(inputFile));
if (command === 'validate') console.log(`válido: ${inputFile} (7 carrosséis)`);
if (command === 'render') await renderPlan(inputFile, plan);
if (command === 'schedule') await schedulePlan(plan, args['start-date'] || plan.weekStart);
if (command === 'archive') archivePlan(inputFile, plan);
