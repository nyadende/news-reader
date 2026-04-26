# News Reader — Server

Express proxy that keeps your TheNewsApi token out of the browser.

## Setup

```bash
cp .env.example .env
# Edit .env and set THENEWSAPI_TOKEN
npm install
npm run dev
```

Proxy runs on **http://localhost:5177**.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/news/all` | Proxied TheNewsApi all-news endpoint |

### Supported query params forwarded to upstream

| Param | Type | Notes |
|-------|------|-------|
| `page` | number | Page number |
| `search` | string | Full-text search (mutually exclusive with `categories`) |
| `categories` | string | Comma-separated categories |

`language=en` and `limit=3` are always added server-side and cannot be overridden by the client.
The `api_token` is never sent to or logged for the browser.
