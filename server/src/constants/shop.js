const TOOL_GROUPS = [
  "hammer",
  "tweezers",
  "scalpel",
  "needle-awl",
  "dropper",
  "soldering-iron",
  "heat-gun",
  "mat",
]

export const STARTER_SHOP_ITEMS = [
  ...TOOL_GROUPS.map((group) => ({ itemType: "tool", itemId: `${group}-1` })),
  { itemType: "venue", itemId: "venue-1" },
  { itemType: "desk", itemId: "desk-1" },
]

const SHOP_ITEMS = new Map([
  ...TOOL_GROUPS.flatMap((group) => [1, 2, 3].map((tier) => [
    `tool:${group}-${tier}`,
    { itemType: "tool", itemId: `${group}-${tier}`, priceCoins: 0 },
  ])),
  ...[1, 2, 3].map((tier) => [
    `venue:venue-${tier}`,
    { itemType: "venue", itemId: `venue-${tier}`, priceCoins: 0 },
  ]),
  ...[1, 2, 3].map((tier) => [
    `desk:desk-${tier}`,
    { itemType: "desk", itemId: `desk-${tier}`, priceCoins: 0 },
  ]),
])

export function getShopItem(itemType, itemId) {
  return SHOP_ITEMS.get(`${itemType}:${itemId}`) ?? null
}
