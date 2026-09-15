/**
 * 智慧科普页内容（对应原 pages/science.html）
 *
 * 结构约定：
 *  - type: 'paragraph' → 渲染 <p>{text}</p>
 *  - type: 'list'      → 渲染 <ul><li>，item.lead 为 <strong> 加粗前缀
 */
export const scienceContent = {
  heading: '智慧科普',
  cards: [
    {
      id: 'what-is-restoration',
      title: '什么是文物修复？',
      blocks: [
        {
          type: 'paragraph',
          text: '文物修复是对因年代久远、自然侵蚀或人为损坏而残缺、破损的文物进行科学复原的专业过程，涵盖清理、加固、补配、做旧等多个环节，核心原则是"修旧如旧、最小干预、可逆可识别"。',
        },
      ],
    },
    {
      id: 'digital-technology',
      title: '数字化修复技术',
      blocks: [
        {
          type: 'list',
          items: [
            { lead: '三维扫描重建：', text: '高精度采集文物几何与纹理信息，建立数字模型。' },
            { lead: '图像智能补全：', text: '利用AI算法还原缺失纹样与色彩。' },
            { lead: '虚拟修复展示：', text: '在数字空间模拟修复过程，辅助方案决策。' },
            { lead: '材料无损分析：', text: '通过光谱等技术判断材质与病害，避免损伤文物。' },
          ],
        },
      ],
    },
    {
      id: 'precious-relics',
      title: '了解这些珍贵文物',
      blocks: [
        {
          type: 'paragraph',
          text: '青铜鼎、青瓷瓶、青花瓷、古建筑梁架……每一件文物都是历史长河的见证。通过数字化手段，我们让千年文明得以在云端延续、被更多人看见。',
        },
      ],
    },
  ],
}
