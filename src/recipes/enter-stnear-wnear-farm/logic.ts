import * as nearAPI from "near-api-js"
import {
    nearToWnear,
    nearToStnear,
    depositTokensOnRef,
    estimateStnearOut,
    getMetapoolInfo,
    getFarmingStake,
    passToWallet
} from "../../services/near"

const STNEAR_WNEAR_POOL_ID: number = 535

/**
 * take NEAR tokens, provide liquidity to wNear<>stNear, stake on farm
 *
 * @param allowance
 */
async function stepOneAction(allowance: string): Promise<void> {
    const preTXs: Promise<nearAPI.transactions.Transaction[]>[] = []

    // recipe wraps one half of provided NEAR
    const amountToWrap = (BigInt(allowance) / BigInt("2")).toString()
    // recipe stakes one half of provided NEAR with metapool
    const amountToStake = (BigInt(allowance) / BigInt("2")).toString()
    // get stNear price and metapool minimum deposit amount
    const metapoolInfo = await getMetapoolInfo()
    // get expected amount of stNEAR user gets by staking amountToWrap
    const estimatedStnearAmount = estimateStnearOut(amountToStake, metapoolInfo.st_near_price)

    // wrap half of provided NEAR tokens
    preTXs.push(nearToWnear(amountToWrap))
    // stake on metapool half of provided NEAR tokens
    preTXs.push(nearToStnear(amountToStake))
    // deposit both tokens on ref-finance
    preTXs.push(
        depositTokensOnRef([
            { token: window.nearConfig.ADDRESS_METAPOOL, amount: estimatedStnearAmount },
            { token: window.nearConfig.ADDRESS_WNEAR, amount: amountToWrap }
        ])
    )
    // TODO: provide liquidity

    // TODO: stake on farm

    const TXs = await Promise.all(preTXs)
    window.walletAccount.requestSignTransactions({
        transactions: TXs.flat(),
        callbackUrl: window.location.href
    })
}

async function stnearWnearFarmingStake(): Promise<string> {
    const stake_shares: string = await getFarmingStake(STNEAR_WNEAR_POOL_ID)
    return stake_shares
}

// function stepOneAction(allowance: string) {

//     passToWallet([
//         nearToWnear((BigInt(allowance) / BigInt("2")).toString()),
//         nearToStnear((BigInt(allowance) / BigInt("2")).toString())
//     ]);

// }

export { stepOneAction, stnearWnearFarmingStake }
