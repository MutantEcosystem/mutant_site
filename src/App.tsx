import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ExternalLink, Menu, Search, X } from 'lucide-react'
import { artworkImage, COLLECTION_URL, itemUrl, loadSnapshot, refreshLiveStatus, searchableText } from './data'
import type { Artwork, CollectionSnapshot, MintStatus } from './types'

type Route = { page: 'home' | 'gallery' | 'about' } | { page: 'artwork'; id: number }
type Filter = 'all' | MintStatus
type Sort = 'number-asc' | 'number-desc' | 'rank-asc'

const FEATURED_IDS = [85, 1, 577]

function parseRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (path[0] === 'gallery') return { page: 'gallery' }
  if (path[0] === 'about') return { page: 'about' }
  if (path[0] === 'artwork' && Number.isInteger(Number(path[1]))) return { page: 'artwork', id: Number(path[1]) }
  return { page: 'home' }
}

function go(path = '') {
  window.location.hash = path ? `#/${path}` : '#/'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function External({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}<ExternalLink aria-hidden="true" size={15} /></a>
}

function App() {
  const [route, setRoute] = useState<Route>(parseRoute)
  const [snapshot, setSnapshot] = useState<CollectionSnapshot | null>(null)
  const [availableIds, setAvailableIds] = useState<Set<number>>(new Set())
  const [updatedAt, setUpdatedAt] = useState('')
  const [statusSource, setStatusSource] = useState<'live' | 'snapshot'>('snapshot')
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRoute())
      setMenuOpen(false)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadSnapshot(controller.signal)
      .then((data) => {
        setSnapshot(data)
        setAvailableIds(new Set(data.availableIds))
        setUpdatedAt(data.collectedAt)
        return refreshLiveStatus(controller.signal)
      })
      .then((live) => {
        setAvailableIds(new Set(live.availableIds))
        setUpdatedAt(live.updatedAt)
        setStatusSource('live')
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
    return () => controller.abort()
  }, [])

  const active = route.page === 'artwork' ? 'gallery' : route.page

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <button className="wordmark" onClick={() => go()} aria-label="Mintroom home">
          <span className="wordmark-mark">M</span><span>Mintroom</span>
        </button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-nav" aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="site-nav" className={menuOpen ? 'nav-open' : ''} aria-label="Main navigation">
          {(['home', 'gallery', 'about'] as const).map((page) => (
            <button key={page} className={active === page ? 'active' : ''} onClick={() => go(page === 'home' ? '' : page)}>{page}</button>
          ))}
          <External href={COLLECTION_URL} className="nav-mint">Mint on KaspaCom</External>
        </nav>
      </header>

      <main id="main">
        {!snapshot && !error && <LoadingState />}
        {!snapshot && error && <ErrorState message={error} />}
        {snapshot && route.page === 'home' && <Home snapshot={snapshot} availableIds={availableIds} />}
        {snapshot && route.page === 'gallery' && <Gallery snapshot={snapshot} availableIds={availableIds} updatedAt={updatedAt} statusSource={statusSource} statusError={error} />}
        {snapshot && route.page === 'artwork' && <ArtworkView snapshot={snapshot} id={route.id} availableIds={availableIds} updatedAt={updatedAt} />}
        {snapshot && route.page === 'about' && <About snapshot={snapshot} />}
      </main>

      <footer>
        <div><span className="wordmark-mark small">M</span><strong>Mintroom</strong></div>
        <p>An independent gallery for KASMUTANT artwork on Kaspa.</p>
        <External href={COLLECTION_URL}>View the verified collection</External>
      </footer>
    </div>
  )
}

function LoadingState() {
  return <section className="state-page" aria-live="polite"><div className="loader" /><p>Preparing the gallery…</p></section>
}

function ErrorState({ message }: { message: string }) {
  return <section className="state-page"><p className="eyebrow">Gallery unavailable</p><h1>We could not open the collection.</h1><p>{message}</p><button className="button dark" onClick={() => window.location.reload()}>Try again</button></section>
}

function Home({ snapshot, availableIds }: { snapshot: CollectionSnapshot; availableIds: Set<number> }) {
  const [featuredIndex, setFeaturedIndex] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % FEATURED_IDS.length), 5500)
    return () => window.clearInterval(interval)
  }, [])
  const featuredId = FEATURED_IDS[featuredIndex]

  return <>
    <section className="hero">
      <div className="hero-copy reveal">
        <p className="eyebrow">Digital art on Kaspa · KRC-721</p>
        <h1>A room for<br /><em>the mutants.</em></h1>
        <p className="hero-intro">Discover the character, color, and strange charm of KASMUTANT — one piece at a time.</p>
        <div className="button-row">
          <button className="button dark" onClick={() => go('gallery')}>Explore the gallery</button>
          <External href={COLLECTION_URL} className="button light">Mint on KaspaCom</External>
        </div>
      </div>
      <button className="hero-art reveal delay" onClick={() => go(`artwork/${featuredId}`)} aria-label={`View Kasmutant #${featuredId}`}>
        {FEATURED_IDS.map((id, index) => <img key={id} className={index === featuredIndex ? 'visible' : ''} src={artworkImage(id)} alt={`Kasmutant #${id}`} fetchPriority={index === 0 ? 'high' : 'auto'} />)}
        <span className="hero-caption"><span>Featured</span><strong>Kasmutant #{featuredId}</strong><span>{availableIds.has(featuredId) ? 'Available to mint' : 'Minted'}</span></span>
      </button>
    </section>

    <section className="intro-band">
      <p className="eyebrow">The collection</p>
      <div><h2>1,100 expressions.<br />One mutant lineage.</h2><p>{snapshot.collection.description} Mintroom puts the artwork first, with verified metadata and mint status sourced from the Kaspa KRC-721 indexer.</p></div>
    </section>

    <section className="featured-strip">
      <div className="section-heading"><p className="eyebrow">Selected works</p><button className="text-link" onClick={() => go('gallery')}>View all artwork <ArrowRight size={17} /></button></div>
      <div className="selected-grid">
        {[1, 85, 577].map((id, index) => <ArtworkCard key={id} artwork={snapshot.items.find((item) => item.tokenId === id)!} status={availableIds.has(id) ? 'available' : 'minted'} priority={index < 2} />)}
      </div>
    </section>
  </>
}

function Gallery({ snapshot, availableIds, updatedAt, statusSource, statusError }: { snapshot: CollectionSnapshot; availableIds: Set<number>; updatedAt: string; statusSource: 'live' | 'snapshot'; statusError: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('number-asc')
  const [limit, setLimit] = useState(48)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^#/, '')
    const numericId = /^\d+$/.test(term) ? Number(term) : null
    const result = snapshot.items.filter((item) => {
      const matchesQuery = !term || (numericId !== null ? item.tokenId === numericId : searchableText(item).includes(term))
      const available = availableIds.has(item.tokenId)
      const matchesFilter = filter === 'all' || (filter === 'available' ? available : !available)
      return matchesQuery && matchesFilter
    })
    return result.sort((a, b) => sort === 'number-desc' ? b.tokenId - a.tokenId : sort === 'rank-asc' ? (a.rarityRank ?? Infinity) - (b.rarityRank ?? Infinity) : a.tokenId - b.tokenId)
  }, [snapshot.items, query, filter, sort, availableIds])

  useEffect(() => setLimit(48), [query, filter, sort])

  return <section className="gallery-page">
    <header className="page-heading"><p className="eyebrow">KASMUTANT archive</p><h1>Meet every mutant.</h1><p>Search by number, name, or trait. Mint availability is checked against the official KRC-721 indexer.</p></header>

    <div className="gallery-toolbar">
      <label className="search-box"><Search size={18} /><span className="sr-only">Search the collection</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, name, or trait" /></label>
      <div className="filter-group" aria-label="Filter artwork">
        {([['all', 'All'], ['available', 'Available to mint'], ['minted', 'Minted']] as [Filter, string][]).map(([value, label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <label className="sort-control"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="number-asc">Number: low to high</option><option value="number-desc">Number: high to low</option><option value="rank-asc">Rarity rank</option></select></label>
    </div>

    <div className="results-line" aria-live="polite"><strong>{filtered.length.toLocaleString('en')} {filtered.length === 1 ? 'artwork' : 'artworks'}</strong><span className={`source-badge ${statusSource}`}>{statusSource === 'live' ? 'Live status' : 'Snapshot status'} · {formatDate(updatedAt)}</span></div>
    {statusError && <p className="notice">Live refresh failed. Showing the last verified snapshot.</p>}

    {filtered.length ? <>
      <div className="art-grid">{filtered.slice(0, limit).map((item, index) => <ArtworkCard key={item.tokenId} artwork={item} status={availableIds.has(item.tokenId) ? 'available' : 'minted'} priority={index < 8} />)}</div>
      {limit < filtered.length && <button className="button light load-more" onClick={() => setLimit((value) => value + 48)}>Show more artwork</button>}
    </> : <div className="empty-state"><p className="eyebrow">No matches</p><h2>Nothing is hiding here.</h2><p>Try another number, name, or status filter.</p><button className="text-link" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button></div>}
  </section>
}

function ArtworkCard({ artwork, status, priority = false }: { artwork: Artwork; status: MintStatus; priority?: boolean }) {
  if (!artwork) return null
  return <article className="art-card">
    <button onClick={() => go(`artwork/${artwork.tokenId}`)} aria-label={`View ${artwork.name}`}>
      <span className="image-frame"><img src={artworkImage(artwork.tokenId)} alt={`${artwork.name}, KASMUTANT digital artwork`} loading={priority ? 'eager' : 'lazy'} /></span>
      <span className="card-info"><span><strong>{artwork.name}</strong><small>{artwork.rarityRank ? `Rarity rank #${artwork.rarityRank}` : 'KRC-721 artwork'}</small></span><span className={`status ${status}`}>{status === 'available' ? 'Available' : 'Minted'}</span></span>
    </button>
  </article>
}

function ArtworkView({ snapshot, id, availableIds, updatedAt }: { snapshot: CollectionSnapshot; id: number; availableIds: Set<number>; updatedAt: string }) {
  const artwork = snapshot.items.find((item) => item.tokenId === id)
  const closeRef = useRef<HTMLButtonElement>(null)
  const status: MintStatus = availableIds.has(id) ? 'available' : 'minted'

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') go('gallery')
      if (event.key === 'ArrowLeft' && id > 1) go(`artwork/${id - 1}`)
      if (event.key === 'ArrowRight' && id < snapshot.collection.totalSupply) go(`artwork/${id + 1}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, snapshot.collection.totalSupply])

  if (!artwork) return <section className="state-page"><p className="eyebrow">Artwork not found</p><h1>This mutant is not in the archive.</h1><button className="button dark" onClick={() => go('gallery')}>Return to gallery</button></section>

  return <section className="artwork-view" aria-labelledby="artwork-title">
    <button ref={closeRef} className="back-link" onClick={() => go('gallery')}><ArrowLeft size={17} /> Back to gallery</button>
    <div className="artwork-layout">
      <div className="detail-image"><img src={artworkImage(id)} alt={`${artwork.name}, KASMUTANT digital artwork`} /></div>
      <div className="detail-copy">
        <p className="eyebrow">KASMUTANT · #{id}</p>
        <h1 id="artwork-title">{artwork.name}</h1>
        <div className="detail-status"><span className={`status ${status}`}>{status === 'available' ? 'Available to mint' : 'Minted'}</span><small>Verified {formatDate(updatedAt)}</small></div>
        <p className="detail-intro">A unique KRC-721 artwork from the KASMUTANT collection on Kaspa.</p>
        <dl className="trait-list">{artwork.attributes.map((trait) => <div key={trait.trait_type}><dt>{trait.trait_type}</dt><dd>{trait.value.trim()}</dd></div>)}{artwork.rarityRank && <div><dt>Rarity rank</dt><dd>#{artwork.rarityRank}</dd></div>}</dl>
        {status === 'available' ? <External href={COLLECTION_URL} className="button dark detail-action">Mint on KaspaCom</External> : <External href={itemUrl(id)} className="button dark detail-action">View verified item</External>}
        <p className="action-note">Minting and wallet actions take place securely on KaspaCom.</p>
        <div className="artwork-nav">
          <button disabled={id <= 1} onClick={() => go(`artwork/${id - 1}`)}><ArrowLeft /> Previous</button>
          <button disabled={id >= snapshot.collection.totalSupply} onClick={() => go(`artwork/${id + 1}`)}>Next <ArrowRight /></button>
        </div>
      </div>
    </div>
  </section>
}

function About({ snapshot }: { snapshot: CollectionSnapshot }) {
  const available = snapshot.collection.totalSupply - snapshot.collection.totalMinted
  return <section className="about-page">
    <header className="about-hero"><div><p className="eyebrow">Collection story</p><h1>Made for the<br /><em>mutant-minded.</em></h1></div><p>{snapshot.collection.description} This independent gallery was made to slow the experience down and let every piece hold the room.</p></header>
    <div className="about-image"><img src={artworkImage(85)} alt="Kasmutant #85 from the KASMUTANT collection" /></div>
    <div className="facts-grid">
      <div><strong>{snapshot.collection.totalSupply.toLocaleString('en')}</strong><span>Total works</span></div>
      <div><strong>{snapshot.collection.totalMinted.toLocaleString('en')}</strong><span>Minted at snapshot</span></div>
      <div><strong>{available.toLocaleString('en')}</strong><span>Available at snapshot</span></div>
      <div><strong>{snapshot.collection.mintPriceKas} KAS</strong><span>Verified mint price</span></div>
    </div>
    <div className="about-copy"><p className="eyebrow">What Mintroom verifies</p><div><h2>Art first.<br />Facts intact.</h2><p>Names, attributes, supply, mint progress, and available token ranges come from the public KaspaCom and KRC-721 services. Mintroom does not connect wallets or simulate transactions. When you decide to mint, you continue to the verified collection on KaspaCom.</p><External href={COLLECTION_URL} className="button dark">Visit the collection</External></div></div>
  </section>
}

export default App
