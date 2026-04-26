'use strict';

// Vercel serverless equivalent of server/server.js — token never reaches the browser.
const UPSTREAM = 'https://api.thenewsapi.com/v1/news/all';
const ALLOWED_CLIENT_PARAMS = ['page', 'search', 'categories', 'published_after'];

module.exports = async (req, res) => {
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

  let upstream;
  try {
    upstream = await fetch(upstreamUrl); // Node 18 built-in fetch
  } catch (err) {
    return res.status(502).json({ error: 'Upstream unreachable' });
  }

  const body = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(body);
};
