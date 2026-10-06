/**
 * 修复工坊 · 文物与修复工序。
 *
 * 与商店的关系：
 *   这里的每个 artifact 都对应商店「文物」栏目里的一件藏品（同一个 id）。
 *   玩家在商店用元宝买下、并「设为使用」，工坊才会摆出那一件。
 *   每件文物各自记录修复进度，换走再换回来仍停在原处。
 *
 * 图片由 _verify/scripts/process-steps.cjs 处理：
 * 原图是 2160×1620 的白底整幅画布，已抠底、裁到内容、缩放。
 *
 * 工序顺序取自设计资料《修复步骤解释.docx》：
 *   锤子 → 热风枪 → 镊子 → 滴管 → 手术刀 → 针锥 → 电烙铁
 * 玩家必须按这个顺序使用工具，用错则不推进。
 *
 * 素材状态：14 件文物、每件 8 张（出土状态 + 七道工序）均已接入，
 * 由 _verify/scripts/process-all-artifacts.cjs 从桌面「修复步骤」批量处理而来。
 */

/** 文物图目录 */
const DIR = '/images/workshop'

/** 七道工序的目标尺寸基准（图片统一按这个宽度处理） */
export const STEP_IMAGE_WIDTH = 420

/**
 * 每件文物的图片：出土状态 + 七道工序。
 *
 * key 与商店文物 id 一致（见 src/data/relics.js），
 * 文件名形如 `<id>-1..8.webp`：1 = 出土状态，2..8 = 七道工序的完成态。
 * 命名规整，因此这里由 id 直接推出路径，不必逐条列。
 */
export const ARTIFACT_IDS = [
  'hubei-1',
  'hubei-2',
  'hubei-3',
  'hubei-4',
  'hubei-5',
  'hubei-6',
  'hubei-7',
  'other-1',
  'other-2',
  'other-3',
  'other-4',
  'other-5',
  'other-6',
  'other-7',
]

/** 某件文物的第 n 张图（n 从 1 开始；1 = 出土状态） */
function imageOf(relicId, n) {
  return `${DIR}/${relicId}-${n}.webp`
}

/** 取某件文物的图片资源；未接入的返回 null */
export function getArtifactAssets(relicId) {
  if (!ARTIFACT_IDS.includes(relicId)) return null
  return {
    initialImage: imageOf(relicId, 1),
    stepImages: [2, 3, 4, 5, 6, 7, 8].map((n) => imageOf(relicId, n)),
  }
}

/** 该文物是否已接入修复素材 */
export function hasArtifactAssets(relicId) {
  return ARTIFACT_IDS.includes(relicId)
}

/** 全部文物图片路径（供预加载用） */
export function getAllArtifactImages() {
  return ARTIFACT_IDS.flatMap((id) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => imageOf(id, n)))
}

/**
 * 七道工序的定义（与具体文物无关，各件共用同一套工序）。
 *
 * tool   —— 该工序必须使用的工具（对应 data/props.js 的 groupId）
 * title  —— 工序简称
 * desc   —— 工序说明
 */
export const RESTORATION_STEPS = [
  {
    id: 1,
    tool: 'hammer',
    toolName: '锤子',
    title: '敲落板结土',
    desc: '外层大块板结的土块被敲落，器物完整轮廓显露出来；纹饰凹槽里仍残留一层薄硬土。',
  },
  {
    id: 2,
    tool: 'heat-gun',
    toolName: '热风枪',
    title: '烘烤清土',
    desc: '低温烘烤软化纹饰凹槽内的顽固薄土，全部泥土清理干净。',
  },
  {
    id: 3,
    tool: 'tweezers',
    toolName: '镊子',
    title: '填料补缺',
    desc: '镊子夹取修复填料，精准填充到缺损缺口处，填料微微向外凸起。',
  },
  {
    id: 4,
    tool: 'dropper',
    toolName: '滴管',
    title: '滴胶固化',
    desc: '滴管滴加透明粘合固定试剂，缺口内的修补填料完全固化，牢牢固定在缺损位置。',
  },
  {
    id: 5,
    tool: 'scalpel',
    toolName: '手术刀',
    title: '削平打磨',
    desc: '削除填料溢出的多余部分、刮掉表层胶痕，修补处与原器齐平，边缘过渡顺滑。',
  },
  {
    id: 6,
    tool: 'needle-awl',
    toolName: '针锥',
    title: '复刻纹样',
    desc: '在打磨平整的填料表面，手工复刻雕刻原有纹样。',
  },
  {
    id: 7,
    tool: 'soldering-iron',
    toolName: '电烙铁',
    title: '做色融合',
    desc: '低温热熔微调修补表层质感并做色泽融合，色调与锈迹斑驳感与原器统一。',
  },
]

/** 工序总数 */
export const TOTAL_STEPS = RESTORATION_STEPS.length

/**
 * 取某件文物在「已完成 step 步」时应显示的图片。
 * @param {string} relicId
 * @param {number} step  已完成工序数，0 表示出土状态
 */
export function getArtifactImage(relicId, step) {
  if (!hasArtifactAssets(relicId)) return null
  if (step <= 0) return imageOf(relicId, 1)
  const done = Math.min(step, TOTAL_STEPS)
  /* 图 1 = 出土状态，图 2 = 第 1 步完成态，因此第 n 步完成看第 n+1 张 */
  return imageOf(relicId, done + 1)
}

/** 取某一步需要的工具 groupId（step 从 1 开始） */
export function getStepTool(step) {
  const item = RESTORATION_STEPS[step - 1]
  return item ? item.tool : null
}
