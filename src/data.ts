import type { Artwork, CollectionSnapshot } from './types'

export const COLLECTION_URL = 'https://kaspa.com/nft/collections/KASMUTANT'
export const INDEXER_BASE = 'https://krc721-indexer.kaspa.com/api/v1/krc721/mainnet'
export const IMAGE_BASE = 'https://krc721-cache.kaspa.com/krc721/mainnet/optimized/KASMUTANT'

type RangesResponse = { message: string; result: string }
type DetailsResponse = {
  message: string
  result: { max: string; minted: string; royaltyFee: string } | null
}

export function artworkImage(tokenId: number) {
  return `${IMAGE_BASE}/${tokenId}`
}

export function itemUrl(tokenId: number) {
  return `${COLLECTION_URL}/${tokenId}`
}

export function parseRanges(value: string): number[] {
  const numbers = value.split(',').filter(Boolean).map(Number)
  const ids: number[] = []

  for (let index = 0; index < numbers.length; index += 2) {
    const start = numbers[index]
    const size = numbers[index + 1]
    if (!Number.isInteger(start) || !Number.isInteger(size)) continue
    for (let id = start; id < start + size; id += 1) ids.push(id)
  }

  return ids.sort((a, b) => a - b)
}

export async function loadSnapshot(signal?: AbortSignal): Promise<CollectionSnapshot> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/collection.json`, { signal })
  if (!response.ok) throw new Error('The collection snapshot could not be loaded.')
  return response.json()
}

export async function refreshLiveStatus(signal?: AbortSignal) {
  const [rangesResponse, detailsResponse] = await Promise.all([
    fetch(`${INDEXER_BASE}/ranges/KASMUTANT`, { signal }),
    fetch(`${INDEXER_BASE}/nfts/KASMUTANT`, { signal }),
  ])

  if (!rangesResponse.ok || !detailsResponse.ok) {
    throw new Error('Live mint status is temporarily unavailable.')
  }

  const ranges = (await rangesResponse.json()) as RangesResponse
  const details = (await detailsResponse.json()) as DetailsResponse
  if (ranges.message !== 'success' || !details.result) {
    throw new Error('The indexer returned an unexpected response.')
  }

  const availableIds = parseRanges(ranges.result)
  const totalSupply = Number(details.result.max)
  const totalMinted = Number(details.result.minted)
  if (availableIds.length !== totalSupply - totalMinted) {
    throw new Error('Live mint status failed its consistency check.')
  }

  return { availableIds, totalSupply, totalMinted, updatedAt: new Date().toISOString() }
}

export function searchableText(artwork: Artwork) {
  return `${artwork.name} ${artwork.tokenId} ${artwork.attributes.map((trait) => `${trait.trait_type} ${trait.value}`).join(' ')}`.toLowerCase()
}
