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
      id: 'enter-workshop',
      title: '开始修复',
      blocks: [
        {
          type: 'paragraph',
          text: '修复工坊已经开放：在商店兑换趁手的工具与场所后，即可进入工坊，把工具摆到操作台上开始作业。',
        },
        { type: 'link-button', label: '进入修复工坊 →', to: 'WORKSHOP' },
      ],
    },
    {
      id: 'in-development',
      title: '正在开发中',
      blocks: [
        {
          type: 'paragraph',
          text: '文物素材与各道工序的交互逻辑正在加紧开发，敬请期待上线体验！',
        },
      ],
    },
  ],
}
