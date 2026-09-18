-- Wallet balances and configured question rewards must never be negative.
ALTER TABLE `Wallet`
  ADD CONSTRAINT `Wallet_ingots_nonnegative` CHECK (`ingots` >= 0),
  ADD CONSTRAINT `Wallet_coins_nonnegative` CHECK (`coins` >= 0);

ALTER TABLE `Question`
  ADD CONSTRAINT `Question_rewardCoins_nonnegative` CHECK (`rewardCoins` >= 0),
  ADD CONSTRAINT `Question_rewardIngots_nonnegative` CHECK (`rewardIngots` >= 0);
