-- Keep historical rows for existing foreign keys, but remove them from the active quiz pool.
UPDATE `Question` SET `isActive` = false;

-- The knowledge challenge now uses the five questions from the frontend design.
-- Each question grants 100 coins the first time a user answers correctly.
INSERT INTO `Question`
  (`question`, `optionA`, `optionB`, `optionC`, `optionD`, `correctAnswer`, `rewardCoins`, `rewardIngots`, `explanation`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (
    '中国古建中有"墙倒屋不塌"的说法，主要原因是：',
    '墙体使用了特别坚固的砖石',
    '屋架由榫卯梁架承重，墙体只起围合作用',
    '屋顶重量很轻',
    '地基中埋有抗震构件',
    'B', 100, 0,
    '木构架榫卯体系承担全部荷载，墙体只分隔空间、不承重。',
    true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
  ),
  (
    '下列屋顶形制中等级最高、用于最重要殿宇的是：',
    '硬山顶', '悬山顶', '庑殿顶', '攒尖顶',
    'C', 100, 0,
    '庑殿顶四坡五脊，等级最高，如故宫太和殿。',
    true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
  ),
  (
    '斗拱中方形木块与弓形短木分别称为：',
    '斗与拱', '昂与翘', '梁与枋', '檩与椽',
    'A', 100, 0,
    '方形为斗、弓形为拱、斜向长木为昂，共同组成斗拱。',
    true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
  ),
  (
    '青花瓷属于下列哪一类瓷器装饰工艺？',
    '釉上彩', '釉下彩', '珐琅彩', '颜色釉',
    'B', 100, 0,
    '青花以钴料在胎上绘画、罩釉后高温一次烧成，属釉下彩。',
    true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
  ),
  (
    '文物修复中"最小干预、可识别、可逆"原则的含义是：',
    '修复后要完全看不出补配痕迹',
    '尽量少扰动原物，补配可分辨且未来可安全移除',
    '只修复最值钱的文物',
    '修复越快越好',
    'B', 100, 0,
    '保护原物与历史信息优先，补配部分应协调但可识别、可撤销。',
    true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
  );
