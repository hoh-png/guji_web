/**
 * 主页三个功能模块的配置。
 *
 * 每个模块对应原 index.html 里一个 .module 元素，
 * id 用于定位 CSS 中写死的覆盖位置（#mod-science / #mod-game / #mod-quiz）。
 */
export const HOME_MODULES = [
  {
    id: 'mod-science',
    tag: '智慧科普',
    hint: '点击进入 →',
    title: '进入智慧科普',
    to: '/pages/science.html',
  },
  {
    id: 'mod-game',
    tag: '修复游戏',
    hint: '点击进入 →',
    title: '进入修复游戏',
    to: '/pages/game.html',
  },
  {
    id: 'mod-quiz',
    tag: '知识挑战',
    hint: '点击进入 →',
    title: '进入知识挑战',
    to: '/pages/quiz.html',
  },
]
