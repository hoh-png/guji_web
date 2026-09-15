/**
 * 知识挑战页内容（对应原 pages/quiz.html）
 * 结构约定同 scienceContent.js
 */
export const quizContent = {
  heading: '知识挑战',
  cards: [
    {
      id: 'rules',
      title: '挑战规则',
      blocks: [
        {
          type: 'paragraph',
          text: '每轮随机抽取 5 道文物与修复相关题目，答对得分、答错不得分，满分 100 分。全部答完即可查看你的"修复师等级"。',
        },
      ],
    },
    {
      id: 'sample-questions',
      title: '示例题目',
      blocks: [
        {
          type: 'list',
          items: [
            { text: '文物修复的核心原则之一是？—— "修旧如旧"' },
            { text: '"青花瓷"的蓝色图案通常由哪种元素呈色？—— 钴' },
            { text: '古建筑三大主要结构体系不包括？—— 悬索结构' },
            { text: '数字化修复常用的三维技术是？—— 三维扫描重建' },
          ],
        },
      ],
    },
    {
      id: 'in-development',
      title: '挑战功能开发中',
      blocks: [
        {
          type: 'paragraph',
          text: '题库与积分系统正在开发，正式上线后即可开启你的知识对决之旅！',
        },
      ],
    },
  ],
}
