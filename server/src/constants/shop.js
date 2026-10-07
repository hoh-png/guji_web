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

export const STARTER_TOOL_IDS = TOOL_GROUPS.map((group) => `${group}-1`)
export const DEFAULT_VENUE_ID = "venue-1"
export const DEFAULT_DESK_ID = "desk-1"

export const STARTER_SHOP_ITEMS = [
  ...STARTER_TOOL_IDS.map((itemId) => ({ itemType: "tool", itemId })),
  { itemType: "venue", itemId: DEFAULT_VENUE_ID },
  { itemType: "desk", itemId: DEFAULT_DESK_ID },
]

export const RELIC_IDS = [
  "hubei-1", "hubei-2", "hubei-3", "hubei-4", "hubei-5", "hubei-6", "hubei-7",
  "other-1", "other-2", "other-3", "other-4", "other-5", "other-6", "other-7",
]

const SHOP_ITEMS = new Map([
  ...TOOL_GROUPS.flatMap((group) => [1, 2, 3].map((tier) => [
    `tool:${group}-${tier}`,
    {
      itemType: "tool",
      itemId: `${group}-${tier}`,
      groupId: group,
      currency: "coins",
      price: 0,
    },
  ])),
  ...[1, 2, 3].map((tier) => [
    `venue:venue-${tier}`,
    { itemType: "venue", itemId: `venue-${tier}`, currency: "coins", price: 0 },
  ]),
  ...[1, 2, 3].map((tier) => [
    `desk:desk-${tier}`,
    { itemType: "desk", itemId: `desk-${tier}`, currency: "coins", price: 0 },
  ]),
  ...RELIC_IDS.map((itemId) => [
    `relic:${itemId}`,
    { itemType: "relic", itemId, currency: "ingots", price: 0 },
  ]),
])

export function getShopItem(itemType, itemId) {
  return SHOP_ITEMS.get(`${itemType}:${itemId}`) ?? null
}

export function getToolGroup(toolId) {
  return getShopItem("tool", toolId)?.groupId ?? null
}
