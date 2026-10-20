/**
 * 修复游戏页内容（对应原 pages/game.html）
 * 结构约定同 scienceContent.js
 */
import { RESTORATION_STEPS } from './restoration.js'

export const gameContent = {
  heading: '修复游戏',
  cards: [
    {
      id: 'how-to-play',
      title: '游戏玩法介绍',
      blocks: [
        {
          type: 'paragraph',
          text: '化身修复师，从馆藏文物中选择一件，依次使用合适工具完成七道修复工序。每件文物的进度都会按账号保存。',
        },
      ],
    },
    {
      id: 'seven-steps',
      title: '七道修复工序',
      blocks: [
        {
          type: 'list',
          items: RESTORATION_STEPS.map((step) => ({
            lead: `${step.title}：`,
            text: step.desc,
          })),
        },
      ],
    },
    {
      id: 'enter-workshop',
      title: '开始修复',
      blocks: [
        {
          type: 'paragraph',
          text: '修复工坊已经开放：在商店选购文物并准备好工具与场所后，即可进入工坊，按提示把正确工具拖到文物上。',
        },
        { type: 'link-button', label: '进入修复工坊 →', to: 'WORKSHOP' },
      ],
    },
  ],
}
