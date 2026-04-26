import type { Article } from '../lib/newsapi';

interface Props {
  articles: Article[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onSelectIndex: (i: number) => void;
  isFavorite: (a: Article) => boolean;
  onToggleFavorite: (a: Article) => void;
  favoritesMode?: boolean;
}

const PLACEHOLDER = '/placeholder.svg';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

export default function HeadlinesList({
  articles,
  currentIndex,
  loading,
  error,
  page,
  hasMore,
  onNext,
  onPrev,
  onFirst,
  onSelectIndex,
  isFavorite,
  onToggleFavorite,
  favoritesMode = false,
}: Props) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!articles.length) return <EmptyState />;

  const article = articles[currentIndex] ?? articles[0];
  const safeIndex = articles[currentIndex] ? currentIndex : 0;
  const canPrev = safeIndex > 0 || page > 1;
  const canNext = safeIndex < articles.length - 1 || hasMore;
  const fav = isFavorite(article);

  // Absolute article number label for each pager dot
  const absBase = (page - 1) * 3;

  return (
    <div className="headlines">
      <article className="featured-card" aria-label={article.title}>
        <div className="card-image-wrap">
          <img
            className="card-image"
            src={article.image_url || PLACEHOLDER}
            alt={article.title}
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
          />
          <div className="card-gradient" aria-hidden="true" />
        </div>

        <div className="card-overlay">
          {article.categories?.length > 0 && (
            <span className="card-tag" aria-label={`Category: ${article.categories[0]}`}>
              {article.categories[0]}
            </span>
          )}

          <h2 className="card-title">{article.title}</h2>

          {article.description && (
            <p className="card-description">{article.description}</p>
          )}

          <div className="card-meta">
            <span className="card-source">{article.source}</span>
            <span className="card-sep" aria-hidden="true">·</span>
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          </div>

          <div className="card-actions">
            <a
              className="card-cta"
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Read full article: ${article.title}`}
            >
              View Full Article →
            </a>
            <button
              className={`fav-btn${fav ? ' fav-btn--active' : ''}`}
              onClick={() => onToggleFavorite(article)}
              aria-pressed={fav}
              aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}
            >
              {fav ? '★ Saved' : '☆ Save'}
            </button>
          </div>
        </div>
      </article>

      <nav className="pager" aria-label="Article navigation">
        <button
          className="pager-btn"
          onClick={onFirst}
          disabled={page === 1 && safeIndex === 0}
          aria-label="First article"
          title="First article"
        >
          «
        </button>

        <button
          className="pager-btn"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous article"
          title="Previous article"
        >
          ‹
        </button>

        <div className="pager-dots" role="tablist" aria-label="Articles on this page">
          {articles.map((_, i) => {
            const absNum = favoritesMode ? i + 1 : absBase + i + 1;
            const isActive = i === safeIndex;
            return (
              <button
                key={i}
                role="tab"
                className={`pager-dot${isActive ? ' pager-dot--active' : ''}`}
                onClick={() => onSelectIndex(i)}
                aria-selected={isActive}
                aria-label={`Article ${absNum}`}
                title={`Article ${absNum}`}
              >
                <span className="pager-dot-num">{absNum}</span>
              </button>
            );
          })}
          {/* Placeholder dots when page hasn't loaded all 3 articles yet */}
          {!favoritesMode && articles.length < 3 && Array.from({ length: 3 - articles.length }).map((_, i) => (
            <span key={`ph-${i}`} className="pager-dot pager-dot--placeholder" aria-hidden="true">
              <span className="pager-dot-num">{absBase + articles.length + i + 1}</span>
            </span>
          ))}
        </div>

        <button
          className="pager-btn"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next article"
          title="Next article"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="headlines" role="status" aria-label="Loading articles">
      <div className="featured-card featured-card--skeleton">
        <div className="skeleton-image" aria-hidden="true" />
        <div className="skeleton-overlay" aria-hidden="true">
          <div className="skeleton-tag" />
          <div className="skeleton-title" />
          <div className="skeleton-title skeleton-title--short" />
          <div className="skeleton-desc" />
          <div className="skeleton-desc skeleton-desc--short" />
          <div className="skeleton-meta" />
        </div>
      </div>
      <div className="pager pager--skeleton" aria-hidden="true">
        {[0,1,2,3,4].map(i => <div key={i} className="pager-btn pager-btn--skeleton" />)}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state" role="alert" aria-live="assertive">
      <p className="error-icon" aria-hidden="true">⚠</p>
      <p className="error-message">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state" role="status">
      <p className="empty-icon" aria-hidden="true">📰</p>
      <p>No articles found.</p>
      <p className="empty-hint">Try a different search or category.</p>
    </div>
  );
}
