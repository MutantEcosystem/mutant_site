# Mintroom

Mintroom is an independent, artwork-first gallery for the KASMUTANT KRC-721 collection on Kaspa. It is a static Vite + React + TypeScript site built for GitHub Pages.

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Build and preview the production output:

```bash
npm run build
npm run preview
```

## Collection data

The committed `public/data/collection.json` snapshot contains verified artwork metadata from the public KaspaCom API and mint availability from the official KRC-721 indexer. The browser refreshes the small availability-ranges and collection-details responses at startup. If that request fails, the interface keeps working and labels the data as snapshot status.

Refresh the committed snapshot with:

```bash
npm run data:update
```

The update script validates that:

- all 1,100 metadata records were returned;
- available token ranges contain no inferred status; and
- `available + minted` equals total supply.

Public sources:

- `https://api.kaspa.com/api/krc721/tokens`
- `https://krc721-indexer.kaspa.com/api/v1/krc721/mainnet/nfts/KASMUTANT`
- `https://krc721-indexer.kaspa.com/api/v1/krc721/mainnet/ranges/KASMUTANT`
- `https://krc721-cache.kaspa.com/krc721/mainnet/optimized/KASMUTANT/{tokenId}`

The source endpoints currently allow browser requests from GitHub Pages origins. No API key or backend is required. Rate-limit guarantees are not published, which is why the full metadata catalog is committed as a snapshot.

## Artwork files

The production gallery uses the official optimized KRC-721 cache URLs. To use local originals instead, place files in `public/artwork/` named by token ID (for example `85.webp`) and update `artworkImage()` in `src/data.ts`. Preserve the token IDs so metadata and status remain aligned.

## GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Push to `main` or run **Deploy Mintroom to GitHub Pages** manually.

`vite.config.ts` reads the repository name from `GITHUB_REPOSITORY` and builds with the correct project-site base path automatically. For a custom path, set `VITE_BASE_PATH` (including leading and trailing slashes). Hash routes keep shared artwork URLs and browser refreshes working without server rewrites.

## Integrity and scope

Mintroom does not connect a wallet, simulate a mint, collect payment, or invent prices and ownership. Available pieces link to the verified collection mint page because KRC-721 minting selects from the official available ranges rather than providing a reliable per-item mint URL. Minted pieces link to their exact KaspaCom item page.
