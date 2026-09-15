/**
 * 修复游戏页内容（对应原 pages/game.html）
 * 结构约定同 scienceContent.js
 */
export const gameContent = {
  heading: '修复游戏',
  cards: [
    {
      id: 'how-to-play',
      title: '游戏玩法介绍',
      blocks: [
        {
          type: 'paragraph',
          text: '化身修复师，完成"清理—补配—做旧"三道工序，亲手让一件破损的瓷器重获新生。操作简单、趣味满满，还能学到专业修复知识。',
        },
      ],
    },
    {
      id: 'three-steps',
      title: '三道修复工序',
      blocks: [
        {
          type: 'list',
          items: [
            { lead: '清理：', text: '轻轻刷去器物表面的积尘与污渍。' },
            { lead: '补配：', text: '选用合适的材料填补残缺部位。' },
            { lead: '做旧：', text: '调整色泽，使补配部位与原件协调统一。' },
          ],
        },
      ],
    },
    {
      id: 'in-development',
      title: '正在开发中',
      blocks: [
        {
          type: 'paragraph',
          text: '游戏关卡、积分排行与修复成就系统正在加紧开发，敬请期待上线体验！',
        },
      ],
    },
  ],
}
