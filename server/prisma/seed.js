import { prisma } from "../src/lib/prisma.js"

const questions = [
  {
    question: '中国古建中有"墙倒屋不塌"的说法，主要原因是：',
    optionA: "墙体使用了特别坚固的砖石",
    optionB: "屋架由榫卯梁架承重，墙体只起围合作用",
    optionC: "屋顶重量很轻",
    optionD: "地基中埋有抗震构件",
    correctAnswer: "B",
    rewardCoins: 100,
    rewardIngots: 0,
    explanation: "木构架榫卯体系承担全部荷载，墙体只分隔空间、不承重。",
    isActive: true,
  },
  {
    question: "下列屋顶形制中等级最高、用于最重要殿宇的是：",
    optionA: "硬山顶",
    optionB: "悬山顶",
    optionC: "庑殿顶",
    optionD: "攒尖顶",
    correctAnswer: "C",
    rewardCoins: 100,
    rewardIngots: 0,
    explanation: "庑殿顶四坡五脊，等级最高，如故宫太和殿。",
    isActive: true,
  },
  {
    question: "斗拱中方形木块与弓形短木分别称为：",
    optionA: "斗与拱",
    optionB: "昂与翘",
    optionC: "梁与枋",
    optionD: "檩与椽",
    correctAnswer: "A",
    rewardCoins: 100,
    rewardIngots: 0,
    explanation: "方形为斗、弓形为拱、斜向长木为昂，共同组成斗拱。",
    isActive: true,
  },
  {
    question: "青花瓷属于下列哪一类瓷器装饰工艺？",
    optionA: "釉上彩",
    optionB: "釉下彩",
    optionC: "珐琅彩",
    optionD: "颜色釉",
    correctAnswer: "B",
    rewardCoins: 100,
    rewardIngots: 0,
    explanation: "青花以钴料在胎上绘画、罩釉后高温一次烧成，属釉下彩。",
    isActive: true,
  },
  {
    question: '文物修复中"最小干预、可识别、可逆"原则的含义是：',
    optionA: "修复后要完全看不出补配痕迹",
    optionB: "尽量少扰动原物，补配可分辨且未来可安全移除",
    optionC: "只修复最值钱的文物",
    optionD: "修复越快越好",
    correctAnswer: "B",
    rewardCoins: 100,
    rewardIngots: 0,
    explanation: "保护原物与历史信息优先，补配部分应协调但可识别、可撤销。",
    isActive: true,
  },
]

async function main() {
  await prisma.$transaction(async (tx) => {
    // 旧题目保留给既有记录做外键关联，但不再对玩家展示。
    await tx.question.updateMany({ data: { isActive: false } })

    for (const data of questions) {
      const existing = await tx.question.findFirst({
        where: { question: data.question },
        select: { id: true },
      })

      if (existing) {
        await tx.question.update({ where: { id: existing.id }, data })
      } else {
        await tx.question.create({ data })
      }
    }
  })

  console.log(`Activated ${questions.length} quiz questions with 100-coin rewards`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
