import * as nearAPI from "near-api-js"
import BaseLogic from "../../services/near"

export default class Logic extends BaseLogic {
    STNEAR_WNEAR_POOL_ID: number = 535 // [ 'meta-pool.near', 'wrap.near' ]

    minDepositAmount?: string
    nativeNEARBalance?: string
    wNEARBalanceOnRef?: string
    stNEARBalanceOnRef?: string
    stNEARBalance?: string

    /**
     * take NEAR tokens, provide liquidity to wNear<>stNear, stake on farm
     *
     * @param allowance
     */
    async stepOneAction(allowance: string): Promise<void> {
        // recipe wraps one half of provided NEAR
        const amountToWrap = (BigInt(allowance) / BigInt("2")).toString()
        // recipe stakes one half of provided NEAR with metapool
        const amountToStake = (BigInt(allowance) / BigInt("2")).toString()
        // fetch metapool info and stNEAR<>wNEAR pool info
        const [{ st_near_price }, { total_shares, amounts }] = await Promise.all([
            this.getMetapoolInfo(),
            this.getPoolInfo(this.STNEAR_WNEAR_POOL_ID)
        ])
        // get expected amount of stNEAR user gets by staking amountToWrap
        const estimatedStnearAmount = this.estimateStnearOut(amountToStake, st_near_price)
        // estimate received LP shares
        const lpShares: string = this.calcLpSharesFromAmounts(total_shares, amounts, [
            estimatedStnearAmount,
            amountToWrap
        ])

        this.passToWallet([
            // wrap half of provided NEAR tokens
            this.nearToWnear(amountToWrap),
            // stake on metapool half of provided NEAR tokens
            this.nearToStnear(amountToStake),
            // deposit both tokens on ref-finance
            this.depositTokensOnRef([
                { token: window.nearConfig.ADDRESS_METAPOOL, amount: estimatedStnearAmount },
                { token: window.nearConfig.ADDRESS_WNEAR, amount: amountToWrap }
            ]),
            // rovide liquidity to stNEAR<>wNEAR pool
            this.addLiquidity([{ pool_id: this.STNEAR_WNEAR_POOL_ID, amounts: [estimatedStnearAmount, amountToWrap] }]),
            // stake on farm
            this.farmStake(lpShares, this.STNEAR_WNEAR_POOL_ID)
        ])
    }

    async stnearWnearFarmingStake(): Promise<string> {
        const stake_shares: string = await this.getFarmingStake(this.STNEAR_WNEAR_POOL_ID)
        return stake_shares
    }
}
