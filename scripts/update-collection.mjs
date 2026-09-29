import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://api.kaspa.com/api/krc721/tokens'
const INDEXER = 'https://krc721-indexer.kaspa.com/api/v1/krc721/mainnet'
const pageSize = 100

function parseRanges(value) {
  const numbers = value.split(',').filter(Boolean).map(Number)
  const ids = []
  for (let index = 0; index < numbers.length; index += 2) {
    for (let id = numbers[index]; id < numbers[index] + numbers[index + 1]; id += 1) ids.push(id)
  }
  return ids.sort((a, b) => a - b)
}

async function getJson(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

const [details, ranges] = await Promise.all([
  getJson(`${INDEXER}/nfts/KASMUTANT`),
  getJson(`${INDEXER}/ranges/KASMUTANT`),
])

const firstPage = await getJson(API, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ticker: 'KASMUTANT', limit: pageSize, offset: 0, sortField: 'tokenId', sortDirection: 'asc' }),
})

const pageCount = Math.ceil(firstPage.totalCount / pageSize)
const pages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => getJson(API, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ticker: 'KASMUTANT', limit: pageSize, offset: (index + 1) * pageSize, sortField: 'tokenId', sortDirection: 'asc' }),
})))

const items = [firstPage, ...pages].flatMap((page) => page.items).map((item) => ({
  tokenId: item.tokenId,
  name: `Kasmutant #${item.tokenId}`,
  rarityRank: item.rarityRank,
  attributes: (item.attributes ?? Object.entries(item.traits ?? {}).map(([trait_type, trait]) => ({ trait_type, value: trait.value }))).map(({ trait_type, value }) => ({ trait_type, value })),
})).sort((a, b) => a.tokenId - b.tokenId)

const availableIds = parseRanges(ranges.result)
const totalSupply = Number(details.result.max)
const totalMinted = Number(details.result.minted)
if (items.length !== totalSupply) throw new Error(`Expected ${totalSupply} metadata records, received ${items.length}.`)
if (availableIds.length !== totalSupply - totalMinted) throw new Error('Available token ranges do not match collection totals.')

const snapshot = {
  collectedAt: new Date().toISOString(),
  collection: {
    ticker: 'KASMUTANT',
    name: 'KASMUTANT',
    description: 'Kasmutant Ape Yacht Club (KASMUTANT) is an exclusive NFT collection on the Kaspa blockchain.',
    totalSupply,
    totalMinted,
    mintPriceKas: Number(details.result.royaltyFee) / 1e8,
    royaltyPercent: 1.5,
  },
  availableIds,
  items,
  sources: [API, `${INDEXER}/nfts/KASMUTANT`, `${INDEXER}/ranges/KASMUTANT`],
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await mkdir(resolve(root, 'public/data'), { recursive: true })
await writeFile(resolve(root, 'public/data/collection.json'), `${JSON.stringify(snapshot)}\n`)
console.log(`Wrote ${items.length} items; ${availableIds.length} available; ${totalMinted} minted.`)
