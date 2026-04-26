export interface Article {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  image_url: string | null;
  published_at: string;
  source: string;
  categories: string[];
}

export interface NewsResponse {
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
  data: Article[];
}

export interface FetchParams {
  page: number;
  categories?: string;
  search?: string;
  published_after?: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchNews(params: FetchParams): Promise<NewsResponse> {
  const qs = new URLSearchParams({ page: String(params.page) });
  if (params.search) {
    qs.set('search', params.search);
  } else if (params.categories) {
    qs.set('categories', params.categories);
  }
  if (params.published_after) {
    qs.set('published_after', params.published_after);
  }

  const url = `/api/news/all?${qs}`;
  console.log('[client] fetching:', url);

  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError((json as { message?: string }).message ?? 'API error', res.status);
  }

  return json as NewsResponse;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Daily request limit reached. Please try again tomorrow.';
    if (err.status === 401 || err.status === 403) return 'TheNewsApi authentication failed. Check your API token in server/.env.';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
