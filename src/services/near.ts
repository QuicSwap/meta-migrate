import "regenerator-runtime/runtime"

import * as nearAPI from "near-api-js"
import { baseDecode } from "borsh"
import { getConfig } from "./nearConfig"

declare global {
    interface Window {
        redirectTo: number
        NEAR_ENV: string
        account: nearAPI.ConnectedWalletAccount
        near: nearAPI.Near
        walletAccount: nearAPI.WalletConnection
        contract_metapool: nearAPI.Contract
        contract_wnear: nearAPI.Contract
        contract_ref_exchange: nearAPI.Contract
        contract_ref_farming: nearAPI.Contract
        nearConfig: any
        nearInitPromise: any
    }
}

const OLD_POOL_ID = 47
// TODO: Pool ID of $OCT<->$stNEAR
const NEW_POOL_ID = 1889
const SIMPLE_POOL_SHARE_DECIMALS = 24
const FARM_STORAGE_BALANCE: string = nearAPI.utils.format.parseNearAmount("0.045") as string
const MIN_DEPOSIT_PER_TOKEN: string = nearAPI.utils.format.parseNearAmount("0.005") as string
const ONE_MORE_DEPOSIT_AMOUNT: string = nearAPI.utils.format.parseNearAmount("0.01") as string
const LP_STORAGE_AMOUNT: string = nearAPI.utils.format.parseNearAmount("0.01") as string
const NEW_ACCOUNT_STORAGE_COST: string = nearAPI.utils.format.parseNearAmount("0.00125") as string

window.nearConfig = getConfig("mainnet")

// Initializing contract
async function initNear() {
    // Initializing connection to the NEAR node.
    window.near = await nearAPI.connect(
        Object.assign(
            {
                deps: {
                    keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore()
                }
            },
            window.nearConfig
        )
    )

    // Initializing Wallet based Account.
    window.walletAccount = new nearAPI.WalletAccount(window.near, null)
    window.account = window.walletAccount.account()
}

async function getFarmingStake(pool_id: number): Promise<string> {
    const seeds: any = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_FARMING, "list_user_seeds", {
        account_id: window.account.accountId
    })
    return seeds[`${window.nearConfig.ADDRESS_REF_EXCHANGE}@${pool_id}`]
        ? seeds[`${window.nearConfig.ADDRESS_REF_EXCHANGE}@${pool_id}`]
        : "0"
}

async function getOldPosition(): Promise<{
    user_total_shares: string
    user_farm_shares: string
    user_lp_shares: string
    total_shares: string
    min_amounts: string[]
}> {
    const [user_farm_shares, pool_info] = await Promise.all([getFarmingStake(OLD_POOL_ID), getOldPoolInfo()])

    const user_total_shares = (BigInt(user_farm_shares) + BigInt(pool_info.user_shares)).toString()

    const min_amounts = calcMinAmountsOut(user_total_shares, pool_info.total_shares, pool_info.amounts)

    return {
        user_total_shares,
        user_farm_shares,
        user_lp_shares: pool_info.user_shares,
        total_shares: pool_info.total_shares,
        min_amounts
    }
}

async function exitOldPosition(staked_amount: string, user_total_shares: string, min_amounts: string[]): Promise<void> {
    const preTXs: Promise<nearAPI.transactions.Transaction[]>[] = []

    // if user has LP shares on farm, unstake them
    if (BigInt(staked_amount) > BigInt("0")) {
        preTXs.push(unstake(staked_amount))
    }
    // remove liquidity from OCT <-> wNEAR pool
    preTXs.push(removeLiquidity(user_total_shares, min_amounts))

    // withdraw wNEAR from Ref and unwrap it
    preTXs.push(wnearToNear(min_amounts[1]))

    const TXs = await Promise.all(preTXs)

    window.walletAccount.requestSignTransactions({
        transactions: TXs.flat(),
        callbackUrl: window.location.href
    })
}

// stake farm shares in OCT<>stNEAR farm
async function stake(amnt: string): Promise<nearAPI.transactions.Transaction[]> {
    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []

    const storage_balance: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_FARMING,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    let storageAction: nearAPI.transactions.Action | undefined = undefined
    if (
        !storage_balance ||
        BigInt(storage_balance?.available ?? "0") < BigInt(FARM_STORAGE_BALANCE) ||
        BigInt(storage_balance?.available ?? "0") < BigInt(MIN_DEPOSIT_PER_TOKEN)
    ) {
        storageAction = nearAPI.transactions.functionCall(
            "storage_deposit", // contract method to deposit NEAR for wNEAR
            {},
            20_000_000_000_000, // attached gas
            FARM_STORAGE_BALANCE // amount of NEAR to deposit and wrap
        )
    }

    const stakingAction: nearAPI.transactions.Action = nearAPI.transactions.functionCall(
        "mft_transfer_call",
        {
            receiver_id: window.nearConfig.ADDRESS_REF_FARMING,
            token_id: `:${NEW_POOL_ID}`,
            amount: amnt,
            msg: ""
        },
        180_000_000_000_000,
        "1" // one yocto
    )

    if (storageAction !== undefined) {
        preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_FARMING, [storageAction]))
    }

    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, [stakingAction]))

    const TXs = await Promise.all(preTXs)

    return TXs
}

// unstake farm shares from OCT<>wNEAR farm
async function unstake(amnt: string): Promise<nearAPI.transactions.Transaction[]> {
    const actions: nearAPI.transactions.Action[] = []
    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_FARMING,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    if (storage_balance === null || BigInt(storage_balance.available) <= BigInt("0")) {
        actions.push(
            nearAPI.transactions.functionCall(
                "storage_deposit", // contract method to deposit NEAR for wNEAR
                {},
                20_000_000_000_000, // attached gas
                FARM_STORAGE_BALANCE // amount of NEAR to deposit and wrap
            )
        )
    }

    actions.push(
        nearAPI.transactions.functionCall(
            "withdraw_seed",
            {
                seed_id: `${window.nearConfig.ADDRESS_REF_EXCHANGE}@${OLD_POOL_ID}`,
                amount: amnt,
                msg: ""
            },
            200_000_000_000_000,
            "1" // one yocto
        )
    )

    const TX: nearAPI.transactions.Transaction = await makeTransaction(window.nearConfig.ADDRESS_REF_FARMING, actions)

    return [TX]
}

function calcMinAmountsOut(user_shares: string, total_shares: string, amounts: string[]): string[] {
    return amounts.map(amount => {
        let exact_amount = (BigInt(amount) * BigInt(user_shares)) / BigInt(total_shares)
        // add 0.01% slippage tolerance
        return ((exact_amount * BigInt("999")) / BigInt("1000")).toString()
    })
}

// get user LP shares in OCT<>wNEAR pool
// IMPORTANT: after calling this function disable the associated button.
// REASON: consider following scenario:
// 1- UI makes request to refresh min_amount_out
// 2- before response arrives, user clicks button and thinks old values will apply
// 3- new values arrive
// 4- wallet re-direct arrives
// => user will approve new values thinking he'll get the old values
async function getOldPoolInfo(): Promise<{
    user_shares: string
    total_shares: string
    amounts: string[]
}> {
    // get user shares
    const user_shares: string = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        "get_pool_shares",
        {
            pool_id: OLD_POOL_ID,
            account_id: window.account.accountId
        }
    )

    // get pool info
    const {
        amounts,
        shares_total_supply: total_shares
    }: {
        amounts: string[]
        shares_total_supply: string
    } = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_pool", {
        pool_id: OLD_POOL_ID
    })

    return { user_shares, total_shares, amounts }
}

async function getNewPoolInfo(): Promise<{
    user_shares: string
    total_shares: string
    amounts: string[]
}> {
    const user_shares = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_pool_shares", {
        pool_id: NEW_POOL_ID,
        account_id: window.account.accountId
    })

    const {
        amounts,
        shares_total_supply: total_shares
    }: {
        amounts: string[]
        shares_total_supply: string
    } = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_pool", {
        pool_id: NEW_POOL_ID
    })

    return { user_shares, total_shares, amounts }
}

// remove liquidity from OCT<>wNEAR pool
async function removeLiquidity(
    user_shares: string,
    min_amounts: string[]
): Promise<nearAPI.transactions.Transaction[]> {
    const actions: nearAPI.transactions.Action[] = []

    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    if (storage_balance === null || BigInt(storage_balance.available) <= BigInt(MIN_DEPOSIT_PER_TOKEN)) {
        actions.push(
            nearAPI.transactions.functionCall(
                "storage_deposit", // contract method to deposit NEAR for wNEAR
                {},
                20_000_000_000_000, // attached gas
                ONE_MORE_DEPOSIT_AMOUNT // amount of NEAR to deposit and wrap
            )
        )
    }

    actions.push(
        nearAPI.transactions.functionCall(
            "remove_liquidity",
            {
                pool_id: OLD_POOL_ID,
                shares: user_shares,
                min_amounts: min_amounts
            },
            50_000_000_000_000,
            "1" // one yocto
        )
    )

    const TX: nearAPI.transactions.Transaction = await makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, actions)

    return [TX]
}

// get user wNEAR balance on Ref-finance
async function getWnearBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
        account_id: window.account.accountId
    })
    return balance[window.nearConfig.ADDRESS_WNEAR] ? balance[window.nearConfig.ADDRESS_WNEAR] : "0"
}

// get user native NEAR balance
async function getNativeNearBalance(): Promise<string> {
    const accountBalance = await window.account.getAccountBalance()
    return accountBalance.available
}

// withdraw wNEAR from Ref account and unwrap it
async function wnearToNear(wnear_amount: string): Promise<nearAPI.transactions.Transaction[]> {
    const wNearActions_1: nearAPI.transactions.Action[] = []
    const refActions: nearAPI.transactions.Action[] = []
    const wNearActions_2: nearAPI.transactions.Action[] = []

    // query user storage balance on ref contract
    const refStorage: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )
    if (!refStorage || BigInt(refStorage.total) <= BigInt("0")) {
        refActions.push(
            nearAPI.transactions.functionCall("storage_deposit", {}, 30_000_000_000_000, ONE_MORE_DEPOSIT_AMOUNT)
        )
    }
    // withdraw wNEAR from Ref action
    refActions.push(
        nearAPI.transactions.functionCall(
            "withdraw",
            {
                token_id: window.nearConfig.ADDRESS_WNEAR,
                // amount: utils.format.parseNearAmount(amount),
                amount: wnear_amount
            },
            100_000_000_000_000,
            "1" // one yocto
        )
    )

    // query user storage balance on wNEAR contract
    const wnearStorage: any = await window.account.viewFunction(window.nearConfig.ADDRESS_WNEAR, "storage_balance_of", {
        account_id: window.account.accountId
    })

    if (!wnearStorage || BigInt(wnearStorage.total) <= BigInt("0")) {
        wNearActions_1.push(
            nearAPI.transactions.functionCall("storage_deposit", {}, 30_000_000_000_000, NEW_ACCOUNT_STORAGE_COST)
        )
    }
    // unwrap wNEAR action
    wNearActions_2.push(
        nearAPI.transactions.functionCall(
            "near_withdraw",
            {
                amount: wnear_amount
            },
            10_000_000_000_000,
            "1" // one yocto
        )
    )

    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []

    if (wNearActions_1.length > 0) {
        preTXs.push(makeTransaction(window.nearConfig.ADDRESS_WNEAR, wNearActions_1))
    }
    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions))
    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_WNEAR, wNearActions_2))

    const TXs = await Promise.all(preTXs)

    return TXs
}

// stake NEAR with metapool to get stNEAR
async function nearToStnear(near_amount: string): Promise<nearAPI.transactions.Transaction[]> {
    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
    const metapoolActions: nearAPI.transactions.Action[] = []

    // deposit NEAR to metapool
    metapoolActions.push(nearAPI.transactions.functionCall("deposit_and_stake", {}, 50_000_000_000_000, near_amount))

    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_METAPOOL, metapoolActions))

    const TXs = await Promise.all(preTXs)
    return TXs
}

async function nearToWnear(near_amount: string): Promise<nearAPI.transactions.Transaction[]> {
    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
    const wNearActions: nearAPI.transactions.Action[] = []

    // query user storage balance on wNEAR contract
    const wnearStorage: any = await window.account.viewFunction(window.nearConfig.ADDRESS_WNEAR, "storage_balance_of", {
        account_id: window.account.accountId
    })

    if (!wnearStorage || BigInt(wnearStorage.total) <= BigInt("0")) {
        wNearActions.push(
            nearAPI.transactions.functionCall("storage_deposit", {}, 30_000_000_000_000, NEW_ACCOUNT_STORAGE_COST)
        )
    }

    // deposit NEAR to metapool
    wNearActions.push(nearAPI.transactions.functionCall("near_deposit", {}, 50_000_000_000_000, near_amount))

    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_METAPOOL, wNearActions))

    const TXs = await Promise.all(preTXs)
    return TXs
}

// get stNEAR price and min deposit amount in $NEAR
async function getMetapoolInfo(): Promise<{
    st_near_price: string
    min_deposit_amount: string
}> {
    const contract_state: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_METAPOOL,
        "get_contract_state",
        {}
    )
    return {
        st_near_price: contract_state["st_near_price"],
        min_deposit_amount: contract_state["min_deposit_amount"]
    }
}

// get user stNEAR on metapool
async function getStnearBalance(): Promise<string> {
    const balance: string = await window.account.viewFunction(window.nearConfig.ADDRESS_METAPOOL, "ft_balance_of", {
        account_id: window.account.accountId
    })
    return balance
}

// get user stNEAR balance on Ref-finance
async function getStnearBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
        account_id: window.account.accountId
    })
    return balance[window.nearConfig.ADDRESS_METAPOOL] ? balance[window.nearConfig.ADDRESS_METAPOOL] : "0"
}

// get user stNEAR balance on Ref-finance
async function getOctBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
        account_id: window.account.accountId
    })
    console.log("Balance: ", window.nearConfig.ADDRESS_REF_EXCHANGE)
    return balance[window.nearConfig.ADDRESS_OCT] ? balance[window.nearConfig.ADDRESS_OCT] : "0"
}

// deposit stNEAR then add liquidity to OCT<>stNEAR pool
async function addLiquidity(amount_stnear: string, lp_amounts: string[]): Promise<nearAPI.transactions.Transaction[]> {
    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
    const metapoolActions: nearAPI.transactions.Action[] = []
    // use this to increase storage balance on ref before depositing stNEAR
    const refActions_1: nearAPI.transactions.Action[] = []
    // use this for actions related to LP
    const refActions_2: nearAPI.transactions.Action[] = []

    // query user storage on ref
    const storage_balance: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    // check if storage is enough for a new token deposit
    if (storage_balance === null || BigInt(storage_balance.available) <= BigInt(MIN_DEPOSIT_PER_TOKEN)) {
        refActions_1.push(
            nearAPI.transactions.functionCall(
                "storage_deposit", // contract method to deposit NEAR for wNEAR
                {},
                20_000_000_000_000, // attached gas
                ONE_MORE_DEPOSIT_AMOUNT // amount of NEAR to deposit and wrap
            )
        )
    }

    // deposit stNEAR on ref-finance. Assumptions:
    // 1- ref-finance contract already has storage deposit on stNEAR contract
    // 2- stNEAR is on the ref-finance global token whitelist
    if (BigInt(amount_stnear) > BigInt("0")) {
        metapoolActions.push(
            nearAPI.transactions.functionCall(
                "ft_transfer_call",
                {
                    receiver_id: window.nearConfig.ADDRESS_REF_EXCHANGE,
                    amount: amount_stnear,
                    msg: ""
                },
                150_000_000_000_000,
                "1" // one yocto
            )
        )
    }

    // set slippage protection to 0.1%
    const min_lp_amounts: string[] = lp_amounts.map(amount => {
        return ((BigInt(amount) * BigInt("999")) / BigInt("1000")).toString()
    })

    // add liquidity to $OCT <-> $stNEAR
    // no need to check for storage as storage deposit
    // is take from attached deposit for this action
    refActions_2.push(
        nearAPI.transactions.functionCall(
            "add_liquidity",
            {
                pool_id: NEW_POOL_ID,
                amounts: lp_amounts,
                min_amounts: min_lp_amounts
            },
            100_000_000_000_000,
            LP_STORAGE_AMOUNT
        )
    )

    if (refActions_1.length > 0) {
        preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions_1))
    }
    if (metapoolActions.length > 0) {
        preTXs.push(makeTransaction(window.nearConfig.ADDRESS_METAPOOL, metapoolActions))
    }
    preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions_2))
    const TXs: nearAPI.transactions.Transaction[] = await Promise.all(preTXs)

    return TXs
}

/**
 * deposit multiple tokens on Ref.
 * Assumptions:
 * 1- ref-finance contract already has storage deposit on provided tokens
 * 2- provided tokens are on the ref-finance global whitelist
 *
 * !! IMPORTANT !!
 * if you want to deposit multiple tokens at once, then:
 * @example good: all tokens in 1 call
 * depositTokensOnRef([{token: "dai", amount: "1"}, {token: "usdt", amount: "1"}])
 * @example bad: separate calls miscalculate required user storage on ref-finance
 * depositTokensOnRef([{token: "dai", amount: "1"}])
 * depositTokensOnRef([{token: "usdt", amount: "1"}])
 *
 *
 * @param deposits
 */
async function depositTokensOnRef(
    deposits: { token: string; amount: string }[]
): Promise<nearAPI.transactions.Transaction[]> {
    const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
    const tokensActions: {
        address: string
        actions: nearAPI.transactions.Action[]
    }[] = []

    // increase user storage balance on ref before token deposits
    const refActions: nearAPI.transactions.Action[] = []

    // query user storage on ref
    const storage_balance: any = await window.account.viewFunction(
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    // check if user storage is enough for depositing n tokens
    if (
        storage_balance === null ||
        BigInt(storage_balance.available) <= BigInt(deposits.length) * BigInt(MIN_DEPOSIT_PER_TOKEN)
    ) {
        refActions.push(
            nearAPI.transactions.functionCall(
                "storage_deposit", // contract method to deposit NEAR for wNEAR
                {},
                20_000_000_000_000, // attached gas
                (BigInt(deposits.length) * BigInt(ONE_MORE_DEPOSIT_AMOUNT)).toString() // amount of NEAR to deposit and wrap
            )
        )
    }

    for (let i = 0; i < deposits.length; i++) {
        tokensActions.push({
            address: deposits[i].token,
            actions: [
                nearAPI.transactions.functionCall(
                    "ft_transfer_call",
                    {
                        receiver_id: window.nearConfig.ADDRESS_REF_EXCHANGE,
                        amount: deposits[i].amount,
                        msg: ""
                    },
                    150_000_000_000_000,
                    "1" // one yocto
                )
            ]
        })
    }

    // transaction object for ref-finance storage deposit (if needed)
    if (refActions.length >= 1) {
        preTXs.push(makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions))
    }
    // transaction objects for deposits. Each token deposit is a separate transaction
    for (let i = 0; i < deposits.length; i++) {
        preTXs.push(makeTransaction(tokensActions[i].address, tokensActions[i].actions))
    }

    const TXs = await Promise.all(preTXs)
    return TXs
}

// estimate LP shares you get for supplying amounts
// see https://github.com/ref-finance/ref-contracts/blob/3c04fd20767ad7f1c383deee8e0a2b5ab47fbc18/ref-exchange/src/simple_pool.rs#L118
function calcLpSharesFromAmounts(pool_total_shares: string, pool_amounts: string[], lp_amounts: string[]): string {
    let lp_shares_estimate: string = pool_amounts.reduce((prevValue, poolAmt, index) => {
        let currValue = (BigInt(pool_total_shares) * BigInt(lp_amounts[index])) / BigInt(poolAmt)
        return BigInt(prevValue) < currValue ? prevValue : currValue.toString()
    })

    // set tolerance to 0.01%
    // !!! important leave at least 1 LP share to occupy storage
    // see: https://github.com/ref-finance/ref-contracts/issues/36
    lp_shares_estimate = ((BigInt(lp_shares_estimate) * BigInt("9999")) / BigInt("10000")).toString()

    return lp_shares_estimate
}

// action: LP to new pool and stake on farm
async function addLiquidityAndStake(
    amount_stnear: string,
    lp_amounts: string[],
    lp_shares_to_stake: string
): Promise<void> {
    const TXs = await Promise.all([addLiquidity(amount_stnear, lp_amounts), stake(lp_shares_to_stake)])

    window.walletAccount.requestSignTransactions({
        transactions: TXs.flat(),
        callbackUrl: window.location.href
    })
}

// helpers

function estimateStnearOut(amount: string, price: string, accuracy = 5): string {
    return BigInt(price) === BigInt(0)
        ? "0"
        : (BigInt(amount + "0".repeat(accuracy)) / BigInt(price) / BigInt("1" + "0".repeat(accuracy))).toString()
}

async function makeTransaction(
    receiverId: string,
    actions: nearAPI.transactions.Action[],
    nonceOffset = 1
): Promise<nearAPI.transactions.Transaction> {
    let accessKey = await window.account.accessKeyForTransaction(receiverId, actions)
    if (!accessKey) {
        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`)
    }

    const block = await window.near.connection.provider.block({
        finality: "final"
    })
    const blockHash = baseDecode(block.header.hash)

    const publicKey = nearAPI.utils.PublicKey.from(accessKey.public_key)
    const nonce = accessKey.access_key.nonce + nonceOffset

    return nearAPI.transactions.createTransaction(
        window.account.accountId,
        publicKey,
        receiverId,
        nonce,
        actions,
        blockHash
    )
}

// Takes array of Transaction Promises and redirects the user to the wallet page to sign them.
async function passToWallet(preTXs: Promise<nearAPI.transactions.Transaction[]>[]): Promise<void> {
    const TXs = await Promise.all(preTXs)
    window.walletAccount.requestSignTransactions({
        transactions: TXs.flat(),
        callbackUrl: window.location.href
    })
}

// Loads nearAPI and this contract into window scope.

export {
    initNear,
    getOldPosition,
    exitOldPosition,
    getFarmingStake,
    getNewPoolInfo,
    getWnearBalanceOnRef,
    getOctBalanceOnRef,
    getStnearBalanceOnRef,
    getStnearBalance,
    getNativeNearBalance,
    getMetapoolInfo,
    calcLpSharesFromAmounts,
    addLiquidityAndStake,
    nearToStnear,
    nearToWnear,
    passToWallet,
    estimateStnearOut,
    depositTokensOnRef,
    OLD_POOL_ID,
    NEW_POOL_ID
}
