#!/usr/bin/env node

const API_URL = process.env.BUFFER_API_URL || 'https://api.buffer.com';
const TOKEN = process.env.BUFFER_ACCESS_TOKEN;

function usage() {
  console.error(`Uso:
  node --env-file=.env scripts/buffer.js channels
  node --env-file=.env scripts/buffer.js schedule --channel ID --at 2026-07-20T15:00:00Z --text "Texto"
  node --env-file=.env scripts/buffer.js schedule --channel ID --at 2026-07-20T15:00:00Z --text "Texto" --type post --image URL --image URL

A data deve ser ISO-8601 com timezone explícito (ex.: Z ou -03:00).`);
  process.exit(2);
}

if (!TOKEN) {
  console.error('BUFFER_ACCESS_TOKEN não configurado. Crie .env a partir de .env.example.');
  process.exit(1);
}

async function bufferRequest(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Buffer HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
  return body.data;
}

function arg(name, args) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function allArgs(name, args) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1]) values.push(args[i + 1]);
  }
  return values;
}

async function listChannels() {
  const organizationId = process.env.BUFFER_ORGANIZATION_ID;
  if (!organizationId) throw new Error('BUFFER_ORGANIZATION_ID não configurado.');
  const query = `query GetChannels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id name displayName service avatar isQueuePaused
    }
  }`;
  const data = await bufferRequest(query, { organizationId });
  for (const channel of data.channels || []) {
    console.log(`${channel.id}\t${channel.service}\t${channel.displayName || channel.name}`);
  }
}

async function schedule(args) {
  const channelId = arg('--channel', args);
  const dueAt = arg('--at', args);
  const text = arg('--text', args);
  const type = arg('--type', args) || 'post';
  const images = allArgs('--image', args);
  if (!channelId || !dueAt || !text) usage();
  if (Number.isNaN(Date.parse(dueAt))) throw new Error('--at não é uma data ISO-8601 válida.');

  const assets = images.map((url) => ({ image: { url } }));
  const query = `mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post { id text assets { id mimeType } }
      }
      ... on MutationError { message }
    }
  }`;
  const input = {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    metadata: { instagram: { type, shouldShareToFeed: true } },
    dueAt: new Date(dueAt).toISOString(),
    ...(assets.length ? { assets } : {}),
  };
  const data = await bufferRequest(query, { input });
  const result = data.createPost;
  if (!result?.post) throw new Error(result?.message || 'Buffer não retornou o post criado.');
  console.log(JSON.stringify({ id: result.post.id, dueAt: input.dueAt, channelId, assets: result.post.assets || [] }, null, 2));
}

const [command, ...args] = process.argv.slice(2);
if (command === 'channels') listChannels().catch((error) => { console.error(error.message); process.exit(1); });
else if (command === 'schedule') schedule(args).catch((error) => { console.error(error.message); process.exit(1); });
else usage();
