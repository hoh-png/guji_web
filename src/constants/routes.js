/**
 * 全局路由常量。
 *
 * 路径统一采用「*.html」风格，与站点的静态页面地址习惯保持一致。
 * 页面之间的跳转一律引用这里的常量，不手写字符串。
 */
export const ROUTES = {
  LOGIN: '/', // 登录页
  HOME: '/index.html', // 功能主页
  SCIENCE: '/pages/science.html', // 智慧科普
  GAME: '/pages/game.html', // 修复游戏
  QUIZ: '/pages/quiz.html', // 知识挑战（规则与示例题目）
  CHALLENGE: '/pages/challenge.html', // 知识挑战 · 关卡页（修复文物）
  SHOP: '/pages/shop.html', // 道具商店
  WORKSHOP: '/pages/workshop.html', // 修复文物（工坊）
  PROFILE: '/pages/profile.html', // 个人中心
}
