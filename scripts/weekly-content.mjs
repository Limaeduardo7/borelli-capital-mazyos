#!/usr/bin/env node
import { siteCarouselHtml } from './carousel-template.mjs';

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

function carouselHtml(item, backgroundDir) { return siteCarouselHtml(ROOT, item, backgroundDir); }

async function renderPlan(inputFile, plan, preview = false) {
  const { chromium } = await import('playwright');
  const weekDirName = `semana-${plan.weekStart}`;
  const outputRoot = preview ? path.join(ROOT, '.runtime', 'brand-preview', weekDirName) : path.join(ROOT, 'marketing', 'conteudo', weekDirName);
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  fs.mkdirSync(outputRoot, { recursive: true });
  if (!preview) fs.mkdirSync(publicRoot, { recursive: true });
  fs.copyFileSync(inputFile, path.join(outputRoot, 'planejamento.json'));

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [index, item] of plan.carousels.entries()) {
      const slug = `${String(index + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
      const postDir = path.join(outputRoot, slug);
      const imageDir = path.join(postDir, 'instagram');
      const publicPostDir = path.join(publicRoot, slug);
      fs.mkdirSync(imageDir, { recursive: true });
      if (!preview) fs.mkdirSync(publicPostDir, { recursive: true });
      const html = carouselHtml(item, preview ? path.join(ROOT, 'marketing', 'conteudo', weekDirName, slug, 'fundos') : path.join(postDir, 'fundos'));
      fs.writeFileSync(path.join(postDir, 'carrossel.html'), html, 'utf8');
      fs.writeFileSync(path.join(postDir, 'legenda.md'), `${item.caption.trim()}\n`, 'utf8');
      writeJsonAtomic(path.join(postDir, 'conteudo.json'), item);

      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.join(postDir, 'carrossel.html')).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const locators = page.locator('.slide');
      const slideCount = await locators.count();
      for (let slideIndex = 0; slideIndex < slideCount; slideIndex += 1) {
        // Keep the target slide at y=0 while capturing it. Very tall pages can make
        // Chromium rasterize the final card with an unpainted body-colour band.
        await page.evaluate((activeIndex) => {
          document.querySelectorAll('.slide').forEach((slide, index) => {
            slide.style.display = index === activeIndex ? 'flex' : 'none';
          });
        }, slideIndex);
        const issues = await locators.nth(slideIndex).evaluate(el => {
          const main = el.querySelector('main');
          const photo = el.querySelector('.photo');
          const errors = [];
          for (const child of main.children) {
            if (child.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom || child.scrollWidth > child.clientWidth + 1) errors.push('texto excede área segura');
          }
          const img = el.querySelector('img');
          if (!img.complete || !img.naturalWidth) errors.push('fotografia não carregou');
          if (!document.fonts.check('500 48px "Cormorant Garamond"') || !document.fonts.check('400 34px Inter')) errors.push('fonte não carregou');
          if (photo.getBoundingClientRect().bottom > el.querySelector('footer').getBoundingClientRect().top) errors.push('foto sobrepõe rodapé');
          return errors;
        });
        if (issues.length) fail(`Layout inválido ${slug}/${slideIndex+1}: ${issues.join(', ')}`);
        const filename = `slide-${String(slideIndex + 1).padStart(2, '0')}.png`;
        const localFile = path.join(imageDir, filename);
        await locators.nth(slideIndex).screenshot({ path: localFile });
        const normalizedFile = `${localFile}.normalized.png`;
        const normalized = spawnSync('convert', [localFile, '-depth', '8', '-colorspace', 'sRGB', normalizedFile], { encoding: 'utf8' });
        if (normalized.status !== 0) fail(`não foi possível normalizar ${localFile}: ${(normalized.stderr || '').trim()}`);
        fs.renameSync(normalizedFile, localFile);
        if (!preview) fs.copyFileSync(localFile, path.join(publicPostDir, filename));
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
    const record = { slug, bufferPostId: result.post.id, dueAt, assets: urls.length, scheduledAt: new Date().toISOString() };
    ledger.posts.push(record);
    writeJsonAtomic(ledgerFile, ledger);
    const statusData = await bufferRequest(`query ScheduledPostStatus($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink assets { id mimeType } error { ... on PostPublishingError { message } } } }`, { input: { id: result.post.id } });
    const live = statusData?.post;
    if (!live?.id) fail(`Buffer não retornou o estado vivo de ${slug}.`);
    Object.assign(record, {
      status: live.status,
      dueAt: live.dueAt,
      sentAt: live.sentAt || null,
      externalLink: live.externalLink || null,
      assets: live.assets?.length || 0,
      error: live.error?.message || null,
      statusCheckedAt: new Date().toISOString(),
    });
    writeJsonAtomic(ledgerFile, ledger);
    if (record.status !== 'scheduled' || record.assets !== item.slides.length || record.error) {
      fail(`estado vivo inválido para ${slug}: status=${record.status}, assets=${record.assets}, error=${record.error || 'null'}.`);
    }
    console.log(`agendado: ${slug} -> ${record.dueAt} (${record.bufferPostId}) [${record.status}, ${record.assets} assets]`);
  }
  console.log(`concluído: ${ledger.posts.length}/7 carrosséis registrados em ${ledgerFile}`);
}

async function reschedulePlan(plan, startDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) fail('reschedule exige --start-date AAAA-MM-DD.');
  const { channel } = await discoverBuffer();
  const weekDirName = `semana-${plan.weekStart}`;
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  const mediaBase = (process.env.MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');
  const ledgerFile = path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`);
  if (!fs.existsSync(publicRoot) || !fs.existsSync(ledgerFile)) fail('render ou ledger da semana não encontrado.');
  const ledger = readJson(ledgerFile);

  for (const [index, item] of plan.carousels.entries()) {
    const slug = `${String(index + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
    const record = ledger.posts.find((post) => post.slug === slug && post.bufferPostId);
    if (!record) fail(`post existente não encontrado no ledger: ${slug}`);
    const imageFiles = fs.readdirSync(path.join(publicRoot, slug)).filter((name) => /^slide-\d+\.png$/.test(name)).sort();
    const mediaVersion = `${plan.weekStart.replaceAll('-', '')}-${startDate.replaceAll('-', '')}`;
    const urls = imageFiles.map((name) => `${mediaBase}/${weekDirName}/${slug}/${name}?v=${mediaVersion}`);
    for (const url of urls) await assertPublic(url);
    const dueAt = dueAtFor(startDate, index);
    const input = {
      id: record.bufferPostId,
      text: item.caption,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
      dueAt,
      assets: urls.map((url) => ({ image: { url } })),
    };
    const data = await bufferRequest(`mutation RescheduleCarousel($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { id status dueAt assets { id mimeType } } } ... on MutationError { message } } }`, { input });
    const result = data?.editPost;
    if (!result?.post?.id) fail(result?.message || `Buffer não confirmou o reagendamento de ${slug}.`);
    Object.assign(record, { dueAt: result.post.dueAt, assets: result.post.assets.length, status: result.post.status, rescheduledAt: new Date().toISOString() });
    writeJsonAtomic(ledgerFile, ledger);
    console.log(`reagendado: ${slug} -> ${result.post.dueAt} (${result.post.id})`);
  }
}

async function auditPlan(plan) {
  const weekDirName = `semana-${plan.weekStart}`;
  const ledgerFile = path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`);
  if (!fs.existsSync(ledgerFile)) fail('ledger da semana não encontrado.');
  const ledger = readJson(ledgerFile);
  for (const record of ledger.posts || []) {
    const data = await bufferRequest(`query AuditPostStatus($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink assets { id mimeType } error { ... on PostPublishingError { message } } } }`, { input: { id: record.bufferPostId } });
    const live = data?.post;
    if (!live?.id) fail(`Buffer não retornou o estado vivo de ${record.slug}.`);
    Object.assign(record, { status: live.status, dueAt: live.dueAt, sentAt: live.sentAt || null, externalLink: live.externalLink || null, assets: live.assets?.length || record.assets, error: live.error?.message || null, statusCheckedAt: new Date().toISOString() });
    console.log(`${record.slug}: ${record.status}, ${record.assets} assets, error=${record.error || 'null'}`);
  }
  writeJsonAtomic(ledgerFile, ledger);
}

async function publishNow(plan, onlySlug) {
  if (!onlySlug) fail('publish-now exige --slug SLUG.');
  const { channel } = await discoverBuffer();
  const weekDirName = `semana-${plan.weekStart}`;
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  const mediaBase = (process.env.MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');
  const ledgerFile = path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`);
  if (!fs.existsSync(publicRoot) || !fs.existsSync(ledgerFile)) fail('render ou ledger da semana não encontrado.');
  const ledger = readJson(ledgerFile);
  const index = plan.carousels.findIndex((item, itemIndex) => {
    const slug = `${String(itemIndex + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
    return slug === onlySlug;
  });
  if (index < 0) fail(`slug não encontrado no planejamento: ${onlySlug}`);
  const item = plan.carousels[index];
  const record = ledger.posts.find((post) => post.slug === onlySlug && post.bufferPostId);
  if (!record) fail(`post existente não encontrado no ledger: ${onlySlug}`);

  const statusQuery = `query PublishNowStatus($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink assets { id mimeType } error { ... on PostPublishingError { message } } } }`;
  let current = (await bufferRequest(statusQuery, { input: { id: record.bufferPostId } }))?.post;
  if (!current?.id) fail(`Buffer não retornou o estado vivo de ${onlySlug}.`);
  if (current.status === 'sent') {
    Object.assign(record, { status: current.status, dueAt: current.dueAt, sentAt: current.sentAt || null, externalLink: current.externalLink || null, assets: current.assets?.length || record.assets, error: current.error?.message || null, statusCheckedAt: new Date().toISOString() });
    writeJsonAtomic(ledgerFile, ledger);
    console.log(`já publicado: ${onlySlug} (${current.id}) ${current.externalLink || ''}`.trim());
    return;
  }
  if (!['scheduled', 'sending'].includes(current.status)) fail(`estado incompatível com publish-now: ${current.status}.`);

  if (current.status === 'scheduled') {
    const imageFiles = fs.readdirSync(path.join(publicRoot, onlySlug)).filter((name) => /^slide-\d+\.(png|jpg)$/.test(name)).sort();
    const mediaVersion = `${plan.weekStart.replaceAll('-', '')}-now-${Date.now()}`;
    const urls = imageFiles.map((name) => `${mediaBase}/${weekDirName}/${onlySlug}/${name}?v=${mediaVersion}`);
    for (const url of urls) await assertPublic(url);
    const input = {
      id: record.bufferPostId,
      text: item.caption,
      schedulingType: 'automatic',
      mode: 'shareNow',
      metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
      assets: urls.map((url) => ({ image: { url } })),
    };
    const edited = await bufferRequest(`mutation PublishCarouselNow($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { id status dueAt assets { id mimeType } } } ... on MutationError { message } } }`, { input });
    const post = edited?.editPost?.post;
    if (!post?.id) fail(edited?.editPost?.message || `Buffer não confirmou publish-now de ${onlySlug}.`);
    Object.assign(record, { status: post.status, dueAt: post.dueAt, assets: post.assets?.length || 0, publishNowRequestedAt: new Date().toISOString(), shareMode: 'shareNow' });
    writeJsonAtomic(ledgerFile, ledger);
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    current = (await bufferRequest(statusQuery, { input: { id: record.bufferPostId } }))?.post;
    if (!current?.id) fail(`Buffer não retornou o estado vivo após publish-now de ${onlySlug}.`);
    Object.assign(record, { status: current.status, dueAt: current.dueAt, sentAt: current.sentAt || null, externalLink: current.externalLink || null, assets: current.assets?.length || record.assets, error: current.error?.message || null, statusCheckedAt: new Date().toISOString() });
    writeJsonAtomic(ledgerFile, ledger);
    if (current.status === 'sent') {
      console.log(`publicado agora: ${onlySlug} (${current.id}) ${current.externalLink || ''}`.trim());
      return;
    }
    if (current.status === 'error' || current.error) fail(`Buffer falhou ao publicar ${onlySlug}: ${current.error?.message || current.status}.`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  fail(`Buffer não confirmou status sent para ${onlySlug} dentro do prazo de verificação.`);
}

async function repairPendingPlan(plan, onlySlug = null) {
  const { channel } = await discoverBuffer();
  const weekDirName = `semana-${plan.weekStart}`;
  const publicRoot = path.join(ROOT, 'public', 'media', weekDirName);
  const mediaBase = (process.env.MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');
  const ledgerFile = path.join(ROOT, 'saidas', 'agendamentos', `${weekDirName}.json`);
  if (!fs.existsSync(publicRoot) || !fs.existsSync(ledgerFile)) fail('render ou ledger da semana não encontrado.');
  const ledger = readJson(ledgerFile);
  ledger.replacedPosts ||= [];

  for (const [index, item] of plan.carousels.entries()) {
    const slug = `${String(index + 1).padStart(2, '0')}-${slugify(item.slug || item.theme)}`;
    if (onlySlug && slug !== onlySlug) continue;
    const record = ledger.posts.find((post) => post.slug === slug && post.bufferPostId);
    if (!record) continue;
    let current = null;
    if (record.status !== 'deleted') {
      const currentData = await bufferRequest(`query RepairStatus($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink assets { id mimeType } error { ... on PostPublishingError { message } } } }`, { input: { id: record.bufferPostId } });
      current = currentData?.post;
    }
    if (current?.status === 'sent' || current?.status === 'sending') {
      Object.assign(record, {
        status: current.status,
        dueAt: current.dueAt,
        sentAt: current.sentAt || null,
        externalLink: current.externalLink || null,
        assets: current.assets?.length || record.assets,
        error: current.error?.message || null,
        statusCheckedAt: new Date().toISOString(),
      });
      writeJsonAtomic(ledgerFile, ledger);
      console.log(`inalterado: ${slug} (${current.status})`);
      continue;
    }
    const availableImages = fs.readdirSync(path.join(publicRoot, slug)).filter((name) => /^slide-\d+\.(png|jpg)$/.test(name)).sort();
    const imageFiles = availableImages.some((name) => name.endsWith('.jpg'))
      ? availableImages.filter((name) => name.endsWith('.jpg'))
      : availableImages.filter((name) => name.endsWith('.png'));
    const mediaVersion = `${plan.weekStart.replaceAll('-', '')}-repair-${Date.now()}`;
    const urls = imageFiles.map((name) => `${mediaBase}/${weekDirName}/${slug}/${name}?v=${mediaVersion}`);
    for (const url of urls) await assertPublic(url);

    if (!current || current.status === 'error') {
      if (current?.status === 'error') {
        const deleted = await bufferRequest(`mutation DeleteBrokenPost($input: DeletePostInput!) { deletePost(input: $input) { ... on DeletePostSuccess { id } ... on VoidMutationError { message } } }`, { input: { id: record.bufferPostId } });
        if (!deleted?.deletePost?.id) fail(deleted?.deletePost?.message || `não foi possível remover ${slug}.`);
      }
      const input = {
        text: item.caption,
        channelId: channel.id,
        schedulingType: 'automatic',
        mode: 'shareNow',
        metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
        assets: urls.map((url) => ({ image: { url } })),
      };
      const created = await bufferRequest(`mutation RetryCarousel($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status dueAt assets { id mimeType } } } ... on MutationError { message } } }`, { input });
      const post = created?.createPost?.post;
      if (!post?.id) fail(created?.createPost?.message || `Buffer não retornou novo ID para ${slug}.`);
      ledger.replacedPosts.push({ ...record, replacedAt: new Date().toISOString(), reason: 'media-repair' });
      Object.assign(record, { bufferPostId: post.id, dueAt: post.dueAt, assets: post.assets.length, status: post.status, repairedAt: new Date().toISOString(), shareMode: 'shareNow' });
      writeJsonAtomic(ledgerFile, ledger);
      console.log(`reenviado agora: ${slug} (${post.id})`);
      continue;
    }

    if (current.status === 'scheduled') {
      const isPastDue = current.dueAt && new Date(current.dueAt).getTime() <= Date.now();
      const input = {
        id: record.bufferPostId,
        text: item.caption,
        schedulingType: 'automatic',
        mode: isPastDue ? 'shareNow' : 'customScheduled',
        metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
        ...(isPastDue ? {} : { dueAt: current.dueAt }),
        assets: urls.map((url) => ({ image: { url } })),
      };
      const edited = await bufferRequest(`mutation RepairScheduledCarousel($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { id status dueAt assets { id mimeType } } } ... on MutationError { message } } }`, { input });
      const post = edited?.editPost?.post;
      if (!post?.id) fail(edited?.editPost?.message || `Buffer não confirmou a edição de ${slug}.`);
      Object.assign(record, { dueAt: post.dueAt, assets: post.assets.length, status: post.status, repairedAt: new Date().toISOString(), ...(isPastDue ? { shareMode: 'shareNow' } : {}) });
      writeJsonAtomic(ledgerFile, ledger);
      console.log(`${isPastDue ? 'publicação imediata solicitada' : 'assets atualizados'}: ${slug} (${post.id})`);
    }
  }
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
if (!['preview', 'validate', 'render', 'schedule', 'reschedule', 'audit', 'publish-now', 'repair', 'archive'].includes(command)) {
  console.log('Uso: node scripts/weekly-content.mjs <preview|validate|render|discover|schedule|reschedule|audit|publish-now|repair|archive> [--input planejamento/semana-AAAA-MM-DD.json] [--start-date AAAA-MM-DD] [--slug SLUG]');
  process.exit(command === 'help' ? 0 : 2);
}
const inputFile = path.resolve(ROOT, args.input || defaultInputPath());
const plan = validatePlan(readJson(inputFile));
if (command === 'validate') console.log(`válido: ${inputFile} (7 carrosséis)`);
if (command === 'render') await renderPlan(inputFile, plan);
if (command === 'preview') await renderPlan(inputFile, plan, true);
if (command === 'schedule') await schedulePlan(plan, args['start-date'] || plan.weekStart);
if (command === 'reschedule') await reschedulePlan(plan, args['start-date']);
if (command === 'audit') await auditPlan(plan);
if (command === 'publish-now') await publishNow(plan, args.slug || null);
if (command === 'repair') await repairPendingPlan(plan, args.slug || null);
if (command === 'archive') archivePlan(inputFile, plan);
