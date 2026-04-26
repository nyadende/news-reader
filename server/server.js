'use strict';

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5177;
const UPSTREAM = 'https://api.thenewsapi.com/v1/news/all';
const ALLOWED_CLIENT_PARAMS = ['page', 'search', 'categories', 'published_after'];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/api/news/all', async (req, res) => {
  const token = process.env.THENEWSAPI_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfigured: THENEWSAPI_TOKEN is not set' });
  }

  const params = new URLSearchParams({
    api_token: token,
    language: 'en',
    limit: '3',
  });

  for (const key of ALLOWED_CLIENT_PARAMS) {
    const val = req.query[key];
    if (val && typeof val === 'string') params.set(key, val);
  }

  const upstreamUrl = `${UPSTREAM}?${params}`;
  // Never log the raw token
  const safeUrl = upstreamUrl.replace(token, '[REDACTED]');
  console.log(`[proxy] GET ${safeUrl}`);

  let upstream;
  try {
    upstream = await fetch(upstreamUrl);
  } catch (err) {
    console.error('[proxy] network error:', err.message);
    return res.status(502).json({ error: 'Upstream unreachable', detail: err.message });
  }

  const body = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    console.warn(`[proxy] upstream ${upstream.status}:`, JSON.stringify(body).slice(0, 200));
  }

  res.status(upstream.status).json(body);
});

app.listen(PORT, () => {
  console.log(`[server] proxy running on http://localhost:${PORT}`);
});
