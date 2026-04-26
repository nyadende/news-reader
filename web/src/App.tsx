import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchNews, errorMessage } from './lib/newsapi';
import type { Article, FetchParams } from './lib/newsapi';
import HeadlinesList from './components/HeadlinesList';

const CATEGORIES = [
  'tech', 'general', 'science', 'sports', 'business',
  'health', 'entertainment', 'politics', 'food', 'travel',
] as const;
type Category = typeof CATEGORIES[number];
type View = 'news' | 'favorites';

function loadFavorites(): Article[] {
  try { return JSON.parse(localStorage.getItem('nr-favorites') ?? '[]'); }
  catch { return []; }
}
function persistFavorites(favs: Article[]) {
  localStorage.setItem('nr-favorites', JSON.stringify(favs));
}

function cacheKey(page: number, search: string, category: Category): string {
  return search ? `s:${search}:${page}` : `c:${category}:${page}`;
}

export default function App() {
  // ── Filter state ──────────────────────────────────────────────
  const [category, setCategory] = useState<Category>('tech');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Pagination state ──────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [articleIndex, setArticleIndex] = useState(0);

  // ── Data state ────────────────────────────────────────────────
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // ── UI state ──────────────────────────────────────────────────
  const [favorites, setFavorites] = useState<Article[]>(loadFavorites);
  const [view, setView] = useState<View>('news');
  const [showFilters, setShowFilters] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────
  const pageCache = useRef(new Map<string, Article[]>());
  const prefetching = useRef(new Set<string>());

  // ── Core fetch ────────────────────────────────────────────────
  const doFetch = useCallback(async (
    p: number,
    sq: string,
    cat: Category,
    updateUI: boolean,
  ): Promise<Article[]> => {
    const key = cacheKey(p, sq, cat);

    if (pageCache.current.has(key)) {
      const cached = pageCache.current.get(key)!;
      if (updateUI) {
        setArticles(cached);
        setHasMore(cached.length === 3);
        setLoading(false);
        setError(null);
      }
      return cached;
    }

    if (updateUI) {
      setLoading(true);
      setError(null);
    }

    const params: FetchParams = { page: p };
    if (sq) {
      params.search = sq;
      // Restrict searches to the last 30 days so results stay current
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      params.published_after = cutoff.toISOString().split('T')[0];
    } else {
      params.categories = cat;
    }

    try {
      const data = await fetchNews(params);
      pageCache.current.set(key, data.data);
      if (updateUI) {
        setArticles(data.data);
        setHasMore(data.data.length === 3);
        setLoading(false);
      }
      return data.data;
    } catch (err) {
      if (updateUI) {
        setLoading(false);
        setError(errorMessage(err));
      }
      return [];
    }
  }, []);

  // ── Load on page / query change ───────────────────────────────
  useEffect(() => {
    if (view !== 'news') return;
    doFetch(page, searchQuery, category, true);
  }, [page, searchQuery, category, view, doFetch]);

  // ── Prefetch adjacent pages ───────────────────────────────────
  useEffect(() => {
    if (view !== 'news' || articles.length === 0) return;

    const prefetch = (p: number) => {
      const key = cacheKey(p, searchQuery, category);
      if (pageCache.current.has(key) || prefetching.current.has(key)) return;
      prefetching.current.add(key);
      doFetch(p, searchQuery, category, false).finally(() => {
        prefetching.current.delete(key);
      });
    };

    if (articleIndex === 1 && hasMore) prefetch(page + 1);
    if (articleIndex === 0 && page > 1) prefetch(page - 1);
  }, [articleIndex, page, searchQuery, category, articles.length, hasMore, view, doFetch]);

  // ── Filter handlers ───────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (q === searchQuery) return;
    pageCache.current.clear();
    prefetching.current.clear();
    setArticles([]);
    setSearchQuery(q);
    setPage(1);
    setArticleIndex(0);
    setHasMore(true);
  };

  const handleClearSearch = () => {
    pageCache.current.clear();
    prefetching.current.clear();
    setArticles([]);
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    setArticleIndex(0);
    setHasMore(true);
  };

  const handleCategoryChange = (cat: Category) => {
    if (cat === category && !searchQuery) return;
    pageCache.current.clear();
    prefetching.current.clear();
    setArticles([]);
    setSearchInput('');
    setSearchQuery('');
    setCategory(cat);
    setPage(1);
    setArticleIndex(0);
    setHasMore(true);
  };

  // ── Navigation handlers ───────────────────────────────────────
  const handleNext = () => {
    if (articleIndex < articles.length - 1) {
      setArticleIndex(articleIndex + 1);
    } else if (hasMore) {
      setArticles([]);
      setPage(page + 1);
      setArticleIndex(0);
    }
  };

  const handlePrev = () => {
    if (articleIndex > 0) {
      setArticleIndex(articleIndex - 1);
    } else if (page > 1) {
      setArticles([]);
      setPage(page - 1);
      setArticleIndex(2);
    }
  };

  const handleFirst = () => {
    if (page === 1 && articleIndex === 0) return;
    setPage(1);
    setArticleIndex(0);
  };

  const handleSelectIndex = (i: number) => {
    if (i >= 0 && i < articles.length) setArticleIndex(i);
  };

  // ── Favorites handlers ────────────────────────────────────────
  const toggleFavorite = (article: Article) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.uuid === article.uuid);
      const next = exists ? prev.filter(f => f.uuid !== article.uuid) : [...prev, article];
      persistFavorites(next);
      return next;
    });
  };

  const isFavorite = (article: Article) => favorites.some(f => f.uuid === article.uuid);

  // ── Favorites view article navigation ────────────────────────
  const [favIndex, setFavIndex] = useState(0);
  useEffect(() => { setFavIndex(0); }, [view]);

  const handleFavNext = () => { if (favIndex < favorites.length - 1) setFavIndex(favIndex + 1); };
  const handleFavPrev = () => { if (favIndex > 0) setFavIndex(favIndex - 1); };

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo" aria-label="News Reader">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="7" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          NewsReader
        </span>

        {view === 'favorites' && (
          <span className="header-subtitle">Saved Articles</span>
        )}

        <button
          className="filter-toggle"
          onClick={() => setShowFilters(s => !s)}
          aria-expanded={showFilters}
          aria-controls="sidebar"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </header>

      <div className="layout">
        <aside
          id="sidebar"
          className={`sidebar${showFilters ? ' sidebar--open' : ''}`}
          role="navigation"
          aria-label="Search and filters"
        >
          <form className="search-form" onSubmit={handleSearchSubmit} role="search">
            <div className="search-row">
              <input
                type="search"
                className="search-input"
                placeholder="Search news…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                aria-label="Search news"
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>

          {searchQuery && (
            <p className="active-search">
              Results for: <strong>{searchQuery}</strong>
              <button className="clear-search-link" onClick={handleClearSearch}>
                clear
              </button>
            </p>
          )}

          <nav aria-label="News categories">
            <h2 className="sidebar-label">Categories</h2>
            <ul className="category-list" role="list">
              {CATEGORIES.map(cat => (
                <li key={cat} role="listitem">
                  <button
                    className={`category-btn${cat === category && !searchQuery ? ' category-btn--active' : ''}`}
                    onClick={() => handleCategoryChange(cat)}
                    aria-pressed={cat === category && !searchQuery}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button
              className={`favorites-btn${view === 'favorites' ? ' favorites-btn--active' : ''}`}
              onClick={() => setView(v => v === 'favorites' ? 'news' : 'favorites')}
              aria-pressed={view === 'favorites'}
            >
              {view === 'favorites'
                ? '← Back to News'
                : `Saved (${favorites.length})`}
            </button>
          </div>
        </aside>

        <main className="content" role="main">
          {view === 'favorites' ? (
            <FavoritesView
              favorites={favorites}
              favIndex={favIndex}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onNext={handleFavNext}
              onPrev={handleFavPrev}
              onSelectIndex={setFavIndex}
              onBack={() => setView('news')}
            />
          ) : (
            <HeadlinesList
              articles={articles}
              currentIndex={articleIndex}
              loading={loading}
              error={error}
              page={page}
              hasMore={hasMore}
              onNext={handleNext}
              onPrev={handlePrev}
              onFirst={handleFirst}
              onSelectIndex={handleSelectIndex}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ── Inline Favorites view ─────────────────────────────────────────────────────
interface FavViewProps {
  favorites: Article[];
  favIndex: number;
  isFavorite: (a: Article) => boolean;
  onToggleFavorite: (a: Article) => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectIndex: (i: number) => void;
  onBack: () => void;
}

function FavoritesView({ favorites, favIndex, isFavorite, onToggleFavorite, onNext, onPrev, onSelectIndex }: FavViewProps) {
  if (favorites.length === 0) {
    return (
      <div className="empty-state" role="status">
        <p className="empty-icon" aria-hidden="true">★</p>
        <p>No saved articles yet.</p>
        <p className="empty-hint">Hit "Save" on any article to add it here.</p>
      </div>
    );
  }

  return (
    <HeadlinesList
      articles={favorites}
      currentIndex={Math.min(favIndex, favorites.length - 1)}
      loading={false}
      error={null}
      page={1}
      hasMore={false}
      onNext={onNext}
      onPrev={onPrev}
      onFirst={() => onSelectIndex(0)}
      onSelectIndex={onSelectIndex}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      favoritesMode
    />
  );
}
