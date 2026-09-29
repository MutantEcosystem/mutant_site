export type Trait = {
  trait_type: string
  value: string
}

export type Artwork = {
  tokenId: number
  name: string
  attributes: Trait[]
  rarityRank?: number
}

export type CollectionSnapshot = {
  collectedAt: string
  collection: {
    ticker: string
    name: string
    description: string
    totalSupply: number
    totalMinted: number
    mintPriceKas: number
    royaltyPercent: number
  }
  availableIds: number[]
  items: Artwork[]
  sources: string[]
}

export type MintStatus = 'available' | 'minted'
