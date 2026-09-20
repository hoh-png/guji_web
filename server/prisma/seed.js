import { prisma } from "../src/lib/prisma.js"

const questions = [
  {
    question: "青铜器主要由哪两类金属组成？",
    optionA: "金和银",
    optionB: "铜和锡",
    optionC: "铁和铝",
    optionD: "铜和铁",
    correctAnswer: "B",
    rewardCoins: 10,
    rewardIngots: 0,
    explanation: "青铜通常是以铜为主、加入锡等元素制成的合金。",
  },
  {
    question: "被誉为中国“瓷都”的城市是哪里？",
    optionA: "景德镇",
    optionB: "洛阳",
    optionC: "西安",
    optionD: "敦煌",
    correctAnswer: "A",
    rewardCoins: 10,
    rewardIngots: 0,
    explanation: "江西景德镇以悠久的制瓷历史和精湛工艺闻名。",
  },
  {
    question: "唐三彩最常见的三种釉色通常是黄、绿和什么颜色？",
    optionA: "紫",
    optionB: "黑",
    optionC: "白",
    optionD: "粉",
    correctAnswer: "C",
    rewardCoins: 10,
    rewardIngots: 0,
    explanation: "唐三彩常见的主要釉色为黄、绿、白。",
  },
  {
    question: "司母戊鼎属于哪一历史时期的文物？",
    optionA: "秦代",
    optionB: "汉代",
    optionC: "商代",
    optionD: "唐代",
    correctAnswer: "C",
    rewardCoins: 15,
    rewardIngots: 0,
    explanation: "司母戊鼎是商代晚期的重要青铜礼器。",
  },
  {
    question: "修复陶瓷文物前，通常首先要做什么？",
    optionA: "直接补色",
    optionB: "记录并检查文物现状",
    optionC: "立即粘接",
    optionD: "更换全部残片",
    correctAnswer: "B",
    rewardCoins: 10,
    rewardIngots: 1,
    explanation: "修复前应先进行现状调查、记录和科学评估。",
  },
]

async function main() {
  for (const data of questions) {
    const existing = await prisma.question.findFirst({
      where: { question: data.question },
      select: { id: true },
    })

    if (existing) {
      await prisma.question.update({ where: { id: existing.id }, data })
    } else {
      await prisma.question.create({ data })
    }
  }

  console.log(`Seeded ${questions.length} quiz questions`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
