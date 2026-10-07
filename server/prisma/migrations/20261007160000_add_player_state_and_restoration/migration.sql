-- Persist player profile, equipped items and restoration progress.
CREATE TABLE `PlayerProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `nickname` VARCHAR(191) NOT NULL DEFAULT '修复师',
    `bio` VARCHAR(191) NOT NULL DEFAULT '',
    `avatarId` VARCHAR(191) NOT NULL DEFAULT 'avatar-ink',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayerProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlayerPreference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `equippedToolIds` JSON NOT NULL,
    `equippedVenueId` VARCHAR(191) NOT NULL DEFAULT 'venue-1',
    `equippedDeskId` VARCHAR(191) NOT NULL DEFAULT 'desk-1',
    `equippedRelicId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayerPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RelicRestoration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `relicId` VARCHAR(191) NOT NULL,
    `completedSteps` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RelicRestoration_userId_idx`(`userId`),
    INDEX `RelicRestoration_relicId_idx`(`relicId`),
    UNIQUE INDEX `RelicRestoration_userId_relicId_key`(`userId`, `relicId`),
    CONSTRAINT `RelicRestoration_completedSteps_range` CHECK (`completedSteps` >= 0 AND `completedSteps` <= 7),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlayerProfile` ADD CONSTRAINT `PlayerProfile_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlayerPreference` ADD CONSTRAINT `PlayerPreference_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RelicRestoration` ADD CONSTRAINT `RelicRestoration_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
