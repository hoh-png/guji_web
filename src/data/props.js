/**
 * 修复文物小游戏的道具数据。
 *
 * 道具来源：public/images/props/ 下按用途分目录——
 *   tools/   8 类修复工具 × 3 个品质
 *   venues/  3 个修复场所
 *   desks/   3 张工作台
 *
 * 品质约定：1 = 低级（初始工具），2 = 中级，3 = 高级；
 * 数字越大品质越高，需要玩家用铜钱兑换。
 *
 * 价格：当前统一为 0，由用户确认后再填。改价只需改 SHOP_PRICES / VENUE_PRICES。
 */

/** 品质等级 → 中文名与色板 */
export const TIERS = {
  1: { id: 1, name: '低级', full: '低级工具', tone: 'low' },
  2: { id: 2, name: '中级', full: '中级工具', tone: 'mid' },
  3: { id: 3, name: '高级', full: '高级工具', tone: 'high' },
}

/** 道具价格（铜钱）。当前均为 0。 */
export const SHOP_PRICES = {
  1: 0,
  2: 0,
  3: 0,
}

/** 场所价格（铜钱）。当前均为 0；低级场所默认可用。 */
export const VENUE_PRICES = {
  1: 0,
  2: 0,
  3: 0,
}

/** 工具图尺寸，供页面按比例摆放 */
export const TOOL_IMAGE_SIZE = { width: 640, height: 480 }

/**
 * 构造一个工具。
 * 素材文件名规则：<slug>-<tier>.webp，而 slug 恰好等于 id 去掉末尾的「-<tier>」，
 * 因此这里只传 id，slug 由 id 推导，避免两处各写一遍导致不一致。
 */
const tool = (groupId, id, name, tier, use) => ({
  id,
  groupId, // 供 UI 按工具类型取显示尺寸，避免逐个工具维护
  slug: id.replace(/-\d+$/, ''),
  name,
  tier,
  use,
  image: `/images/props/tools/${id}.webp`,
  price: SHOP_PRICES[tier],
})

/** 8 类修复工具，每类 3 个品质 */
export const TOOLS = [
  {
    group: '锤子',
    groupId: 'hammer',
    description: '用于敲击、整形与加固，是修复工作的基础工具。',
    items: [
      tool('hammer', 'hammer-1', '木柄锤', 1, '轻敲整形'),
      tool('hammer', 'hammer-2', '钢头锤', 2, '精准敲击'),
      tool('hammer', 'hammer-3', '配重锤', 3, '重击加固'),
    ],
  },
  {
    group: '镊子',
    groupId: 'tweezers',
    description: '夹取细小碎片与填充材料，避免手部直接触碰文物。',
    items: [
      tool('tweezers', 'tweezers-1', '直头镊子', 1, '夹取碎片'),
      tool('tweezers', 'tweezers-2', '弯头镊子', 2, '深入缝隙'),
      tool('tweezers', 'tweezers-3', '精密镊子', 3, '毫厘级操作'),
    ],
  },
  {
    group: '手术刀',
    groupId: 'scalpel',
    description: '剔除多余附着物、修整补配边缘。',
    items: [
      tool('scalpel', 'scalpel-1', '基础手术刀', 1, '削除附着物'),
      tool('scalpel', 'scalpel-2', '宽刃手术刀', 2, '修整边缘'),
      tool('scalpel', 'scalpel-3', '细刃手术刀', 3, '精细雕刻'),
    ],
  },
  {
    group: '针锥',
    groupId: 'needle-awl',
    description: '清理纹饰缝隙、疏通细小孔洞。',
    items: [
      tool('needle-awl', 'needle-awl-1', '木柄针锥', 1, '疏通孔洞'),
      tool('needle-awl', 'needle-awl-2', '钢针锥', 2, '清理缝隙'),
      tool('needle-awl', 'needle-awl-3', '细针锥', 3, '精修纹饰'),
    ],
  },
  {
    group: '滴管',
    groupId: 'dropper',
    description: '定量滴加清洗液与粘接剂，控制用量避免渗染。',
    items: [
      tool('dropper', 'dropper-1', '普通滴管', 1, '滴加清洗液'),
      tool('dropper', 'dropper-2', '刻度滴管', 2, '定量滴加'),
      tool('dropper', 'dropper-3', '微量滴管', 3, '微量渗透'),
    ],
  },
  {
    group: '电烙铁',
    groupId: 'soldering-iron',
    description: '金属类文物的焊接与局部加固。',
    items: [
      tool('soldering-iron', 'soldering-iron-1', '基础电烙铁', 1, '简单焊接'),
      tool('soldering-iron', 'soldering-iron-2', '调温电烙铁', 2, '控温焊接'),
      tool('soldering-iron', 'soldering-iron-3', '恒温电烙铁', 3, '精密焊接'),
    ],
  },
  {
    group: '热风枪',
    groupId: 'heat-gun',
    description: '软化粘接剂、加速干燥，需严格控制温度。',
    items: [
      tool('heat-gun', 'heat-gun-1', '基础热风枪', 1, '软化粘接剂'),
      tool('heat-gun', 'heat-gun-2', '调温热风枪', 2, '控温烘干'),
      tool('heat-gun', 'heat-gun-3', '数显热风枪', 3, '精准控温'),
    ],
  },
  {
    group: '垫板',
    groupId: 'mat',
    description: '承托文物、缓冲操作力度，保护器物与台面。',
    items: [
      tool('mat', 'mat-1', '棉布垫板', 1, '基础缓冲'),
      tool('mat', 'mat-2', '软胶垫板', 2, '稳定承托'),
      tool('mat', 'mat-3', '防静电垫板', 3, '专业防护'),
    ],
  },
]

/** 扁平化的工具列表，便于按 id 查找 */
export const ALL_TOOLS = TOOLS.flatMap((group) => group.items)

/** 低级工具：初始默认拥有 */
export const STARTER_TOOL_IDS = ALL_TOOLS.filter((t) => t.tier === 1).map((t) => t.id)

/** 按 id 取工具 */
export function getToolById(id) {
  return ALL_TOOLS.find((t) => t.id === id) || null
}

/** 修复场所 */
export const VENUES = [
  {
    id: 'venue-1',
    name: '基础修复室',
    tier: 1,
    image: '/images/props/venues/venue-1.jpg',
    price: VENUE_PRICES[1],
    description: '起步用的修复室，木质工作台与基础收纳，满足日常清理与补配。',
  },
  {
    id: 'venue-2',
    name: '标准修复室',
    tier: 2,
    image: '/images/props/venues/venue-2.jpg',
    price: VENUE_PRICES[2],
    description: '配备专业工具墙与分类收纳，适合精细修复作业。',
  },
  {
    id: 'venue-3',
    name: '专业修复室',
    tier: 3,
    image: '/images/props/venues/venue-3.jpg',
    price: VENUE_PRICES[3],
    description: '恒温恒湿、器材齐备的高等级修复空间，可承接高难度文物。',
  },
]

/** 工作台 */
export const DESKS = [
  {
    id: 'desk-1',
    name: '木作工作台',
    tier: 1,
    // 这张素材带透明背景，必须用 PNG（JPEG 不支持透明，透明区会被填黑）
    image: '/images/props/desks/desk-1.png',
    price: VENUE_PRICES[1],
    description: '原木台面，朴素耐用。',
  },
  {
    id: 'desk-2',
    name: '绣布工作台',
    tier: 2,
    // 与 desk-1 一致，用 PNG 保留透明背景（JPEG 会把透明区压成黑或白块）
    image: '/images/props/desks/desk-2.png',
    price: VENUE_PRICES[2],
    description: '铺陈绣布，减缓器物磕碰。',
  },
  {
    id: 'desk-3',
    name: '精作工作台',
    tier: 3,
    image: '/images/props/desks/desk-3.png',
    price: VENUE_PRICES[3],
    description: '台面平整，适合精密作业。',
  },
]

/** 默认场所与工作台：均为低级，初始可用 */
export const DEFAULT_VENUE_ID = 'venue-1'
export const DEFAULT_DESK_ID = 'desk-1'

/** 默认已拥有的场所/工作台 */
export const STARTER_VENUE_IDS = ['venue-1']
export const STARTER_DESK_IDS = ['desk-1']

export function getVenueById(id) {
  return VENUES.find((v) => v.id === id) || null
}

export function getDeskById(id) {
  return DESKS.find((d) => d.id === id) || null
}

/**
 * 按固定槽位排序工具：同类的所有工具共用一个槽位位置。
 *
 * 工坊页按这个顺序摆放，因此把低级锤子换成高级锤子时，
 * 新锤子仍然出现在原来那个位置，不会跑到末尾。
 */
const GROUP_ORDER = new Map(TOOLS.map((group, index) => [group.groupId, index]))

export function sortToolsBySlot(tools) {
  return [...tools].sort((a, b) => {
    const ga = GROUP_ORDER.get(a.groupId) ?? Number.MAX_SAFE_INTEGER
    const gb = GROUP_ORDER.get(b.groupId) ?? Number.MAX_SAFE_INTEGER
    if (ga !== gb) return ga - gb
    return a.tier - b.tier
  })
}
