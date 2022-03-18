import BaseLogic from "../../services/near"

export default class Logic extends BaseLogic {
    OLD_POOL_ID = 47
    NEW_POOL_ID = 1889

    newFarmingStake?: string
    oldPosition?: {
        user_total_shares: string
        user_farm_shares: string
        user_lp_shares: string
        total_shares: string
        min_amounts: string[]
    }
    newPoolInfo?: {
        user_shares: string
        total_shares: string
        amounts: string[]
    }
    stNEARPrice?: string
    minDepositAmount?: string
    wNEARBalanceOnRef?: string
    OCTBalanceOnRef?: string
    stNEARBalanceOnRef?: string
    stNEARBalance?: string
    nativeNEARBalance?: string
    lpSharesToStake?: string

    getOldFarmingStake(): Promise<string> {
        return this.getFarmingStake(this.OLD_POOL_ID)
    }

    getNewFarmingStake(): Promise<string> {
        return this.getFarmingStake(this.NEW_POOL_ID)
    }

    getOldPosition(): Promise<{
        user_total_shares: string
        user_farm_shares: string
        user_lp_shares: string
        total_shares: string
        min_amounts: string[]
    }> {
        return this.getPosition(this.OLD_POOL_ID)
    }

    getNewPosition(): Promise<{
        user_total_shares: string
        user_farm_shares: string
        user_lp_shares: string
        total_shares: string
        min_amounts: string[]
    }> {
        return this.getPosition(this.NEW_POOL_ID)
    }

    // action: LP to new pool and stake on farm
    async addLiquidityAndStake(amount_stnear: string, lp_amounts: string[], lp_shares_to_stake: string): Promise<void> {
        this.passToWallet([
            this.addLiquidity(amount_stnear, lp_amounts),
            this.farmStake(lp_shares_to_stake, this.NEW_POOL_ID)
        ])
    }
}
