import "regenerator-runtime/runtime"

import * as nearAPI from "near-api-js"
import { baseDecode } from "borsh"
import { getConfig } from "./nearConfig"

declare global {
    interface Window {
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
        oldFarmingStake: string
        newFarmingStake: string
        oldPoolInfo: {
            user_shares: string
            total_shares: string
            min_amounts: string[]
        }
        newPoolInfo: {
            user_shares: string
            total_shares: string
            amounts: string[]
        }
        stNEARPrice: string
        minDepositAmount: string
        wNEARBalanceOnRef: string
        OCTBalanceOnRef: string
        stNEARBalanceOnRef: string
        stNEARBalance: string
    }
}

const view_storage: string[] = ["storage_balance_bounds", "storage_balance_of"]
const change_storage: string[] = ["storage_deposit"]
const view_ft: string[] = ["ft_balance_of"]
const change_ft: string[] = ["ft_transfer_call", "ft_transfer"]

const ADDRESS_OCT = "f5cfbc74057c610c8ef151a439252680ac68c6dc.factory.bridge.near"
const OLD_POOL_ID = 47
// TODO: Pool ID of $OCT<->$stNEAR
const NEW_POOL_ID = 1889
const SIMPLE_POOL_SHARE_DECIMALS = 24
const FARM_STORAGE_BALANCE: string = nearAPI.utils.format.parseNearAmount(
    "0.045"
) as string
const MIN_DEPOSIT_PER_TOKEN: string = nearAPI.utils.format.parseNearAmount(
    "0.005"
) as string
const ONE_MORE_DEPOSIT_AMOUNT: string = nearAPI.utils.format.parseNearAmount(
    "0.01"
) as string
const LP_STORAGE_AMOUNT: string = nearAPI.utils.format.parseNearAmount(
    "0.01"
) as string
const NEW_ACCOUNT_STORAGE_COST: string = nearAPI.utils.format.parseNearAmount(
    "0.00125"
) as string

window.nearConfig = getConfig("mainnet")

// Initializing contract
async function initContracts() {
    // Initializing connection to the NEAR node.
    window.near = await nearAPI.connect(
        Object.assign(
            {
                deps: {
                    keyStore:
                        new nearAPI.keyStores.BrowserLocalStorageKeyStore()
                }
            },
            window.nearConfig
        )
    )

    // Initializing Wallet based Account.
    window.walletAccount = new nearAPI.WalletAccount(window.near, null)
    window.account = window.walletAccount.account()

    // Initializing our contract APIs by contract name and configuration.
    window.contract_metapool = new nearAPI.Contract(
        window.account,
        window.nearConfig.ADDRESS_METAPOOL,
        {
            viewMethods: view_storage
                .concat(view_ft)
                .concat(["get_contract_state"]),
            changeMethods: change_storage.concat(change_ft)
        }
    )
    window.contract_wnear = new nearAPI.Contract(
        window.account,
        window.nearConfig.ADDRESS_WNEAR,
        {
            viewMethods: view_storage.concat(view_ft),
            changeMethods: change_storage
                .concat(change_ft)
                .concat(["near_deposit", "near_withdraw"])
        }
    )
    // https://docs.ref.finance/smart-contracts/ref-exchange
    window.contract_ref_exchange = new nearAPI.Contract(
        window.account,
        window.nearConfig.ADDRESS_REF_EXCHANGE,
        {
            viewMethods: view_storage.concat([
                "get_pool_shares",
                "get_pool_total_shares",
                "get_deposits",
                "get_pool"
            ]),
            changeMethods: change_storage.concat([
                "add_liquidity",
                "remove_liquidity",
                "mft_register",
                "mft_transfer_call"
            ])
        }
    )
    // https://docs.ref.finance/smart-contracts/how_to_interact_with_ref-farming_contract
    window.contract_ref_farming = new nearAPI.Contract(
        window.account,
        window.nearConfig.ADDRESS_REF_FARMING,
        {
            viewMethods: view_storage.concat([
                "list_user_seeds",
                "get_unclaimed_reward"
            ]),
            changeMethods: change_storage.concat([
                "withdraw_seed",
                "claim_reward_by_farm"
            ])
        }
    )
}

// get user stake in OCT<>wNEAR farm
async function getOldFarmingStake(): Promise<string> {
    const seeds: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "list_user_seeds",
        {
            account_id: window.account.accountId
        }
    )
    return seeds[`v2.ref-finance.near@${OLD_POOL_ID}`]
        ? seeds[`v2.ref-finance.near@${OLD_POOL_ID}`]
        : "0"
}

// get user stake in OCT<>stNEAR farm
async function getNewFarmingStake(): Promise<string> {
    const seeds: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "list_user_seeds",
        {
            account_id: window.account.accountId
        }
    )
    return seeds[`v2.ref-finance.near@${NEW_POOL_ID}`]
        ? seeds[`v2.ref-finance.near@${NEW_POOL_ID}`]
        : "0"
}

// stake farm shares in OCT<>stNEAR farm
async function stake(amnt: string): Promise<void> {
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    let storageAction: nearAPI.transactions.Action | undefined = undefined
    if (
        !storage_balance ||
        BigInt(storage_balance?.available ?? "0") <
            BigInt(FARM_STORAGE_BALANCE) ||
        BigInt(storage_balance?.available ?? "0") <
            BigInt(MIN_DEPOSIT_PER_TOKEN)
    ) {
        storageAction = nearAPI.transactions.functionCall(
            "storage_deposit", // contract method to deposit NEAR for wNEAR
            {},
            20_000_000_000_000, // attached gas
            FARM_STORAGE_BALANCE // amount of NEAR to deposit and wrap
        )
    }

    const stakingAction: nearAPI.transactions.Action =
        nearAPI.transactions.functionCall(
            "mft_transfer_call",
            {
                receiver_id: window.nearConfig.ADDRESS_REF_FARMING,
                token_id: `v2.ref-finance.near@${NEW_POOL_ID}`,
                amount: amnt,
                msg: ""
            },
            180_000_000_000_000,
            "1" // one yocto
        )

    const TXs = await Promise.all(
        storageAction !== undefined
            ? [
                  makeTransaction(window.contract_ref_farming.contractId, [
                      storageAction
                  ]),
                  makeTransaction(window.contract_ref_exchange.contractId, [
                      stakingAction
                  ])
              ]
            : [
                  makeTransaction(window.contract_ref_exchange.contractId, [
                      stakingAction
                  ])
              ]
    )

    window.walletAccount.requestSignTransactions({
        transactions: TXs
    })
}

// unstake farm shares from OCT<>wNEAR farm
async function unstake(amnt: string): Promise<void> {
    const actions: nearAPI.transactions.Action[] = []
    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    if (
        storage_balance === null ||
        BigInt(storage_balance.available) <= BigInt("0")
    ) {
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
                seed_id: `v2.ref-finance.near@${OLD_POOL_ID}`,
                amount: amnt,
                msg: ""
            },
            200_000_000_000_000,
            "1" // one yocto
        )
    )

    const TX: nearAPI.transactions.Transaction = await makeTransaction(
        window.contract_ref_farming.contractId,
        actions
    )

    window.walletAccount.requestSignTransactions({
        transactions: [TX]
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
    min_amounts: string[]
}> {
    // get user shares
    const user_shares: string = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
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
    } = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_pool",
        {
            pool_id: OLD_POOL_ID
        }
    )

    // calculate min amounts
    const min_amounts = amounts.map(amount => {
        let exact_amount =
            (BigInt(amount) * BigInt(user_shares)) / BigInt(total_shares)
        // add 0.01% slippage tolerance
        return ((exact_amount * BigInt("999")) / BigInt("1000")).toString()
    })

    return { user_shares, total_shares, min_amounts }
}

async function getNewPoolInfo(): Promise<{
    user_shares: string
    total_shares: string
    amounts: string[]
}> {
    const user_shares = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_pool_shares",
        {
            pool_id: NEW_POOL_ID,
            account_id: window.account.accountId
        }
    )

    const {
        amounts,
        shares_total_supply: total_shares
    }: {
        amounts: string[]
        shares_total_supply: string
    } = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_pool",
        {
            pool_id: NEW_POOL_ID
        }
    )

    return { user_shares, total_shares, amounts }
}

// remove liquidity from OCT<>wNEAR pool
async function removeLiquidity(
    user_shares: string,
    total_share: string,
    min_amounts: string[]
): Promise<void> {
    const actions: nearAPI.transactions.Action[] = []

    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    if (
        storage_balance === null ||
        BigInt(storage_balance.available) <= BigInt(MIN_DEPOSIT_PER_TOKEN)
    ) {
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

    const TX: nearAPI.transactions.Transaction = await makeTransaction(
        window.contract_ref_exchange.contractId,
        actions
    )

    window.walletAccount.requestSignTransactions({
        transactions: [TX]
    })
}

// get user wNEAR balance on Ref-finance
async function getWnearBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_deposits",
        {
            account_id: window.account.accountId
        }
    )
    return balance[window.contract_wnear.contractId]
        ? balance[window.contract_wnear.contractId]
        : "0"
}

// withdraw and unwrap wNEAR on Ref-finance
async function wnearToStnear(wnear_amount: string): Promise<void> {
    const refActions: nearAPI.transactions.Action[] = []
    const wNearActions: nearAPI.transactions.Action[] = []
    const metapoolActions: nearAPI.transactions.Action[] = []

    // query user storage balance on wNEAR contract
    const refStorage: any = await window.account.viewFunction(
        window.contract_wnear.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )
    if (!refStorage || BigInt(refStorage.total) <= BigInt("0")) {
        refActions.push(
            nearAPI.transactions.functionCall(
                "storage_deposit",
                {},
                30_000_000_000_000,
                ONE_MORE_DEPOSIT_AMOUNT
            )
        )
    }
    // withdraw wNEAR from Ref action
    refActions.push(
        nearAPI.transactions.functionCall(
            "withdraw",
            {
                token_id: window.contract_wnear.contractId,
                // amount: utils.format.parseNearAmount(amount),
                amount: wnear_amount
            },
            100_000_000_000_000,
            "1" // one yocto
        )
    )

    // query user storage balance on wNEAR contract
    const wnearStorage: any = await window.account.viewFunction(
        window.contract_wnear.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )
    if (!wnearStorage || BigInt(wnearStorage.total) <= BigInt("0")) {
        wNearActions.push(
            nearAPI.transactions.functionCall(
                "storage_deposit",
                {},
                30_000_000_000_000,
                NEW_ACCOUNT_STORAGE_COST
            )
        )
    }
    // unwrap wNEAR action
    wNearActions.push(
        nearAPI.transactions.functionCall(
            "near_withdraw",
            {
                amount: wnear_amount
            },
            10_000_000_000_000,
            "1" // one yocto
        )
    )

    // deposit NEAR to metapool
    metapoolActions.push(
        nearAPI.transactions.functionCall(
            "deposit_and_stake",
            {},
            50_000_000_000_000,
            wnear_amount
        )
    )

    const TXs = await Promise.all([
        makeTransaction(window.contract_ref_exchange.contractId, refActions),
        makeTransaction(window.contract_wnear.contractId, wNearActions),
        makeTransaction(window.contract_metapool.contractId, metapoolActions)
    ])

    window.walletAccount.requestSignTransactions({
        transactions: TXs
    })
}

// get stNEAR price and min deposit amount in $NEAR
async function getMetapoolInfo(): Promise<{
    st_near_price: string
    min_deposit_amount: string
}> {
    const contract_state: any = await window.account.viewFunction(
        window.contract_metapool.contractId,
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
    const balance: string = await window.account.viewFunction(
        window.contract_metapool.contractId,
        "ft_balance_of",
        { account_id: window.account.accountId }
    )
    return balance;
}

// get user stNEAR balance on Ref-finance
async function getStnearBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_deposits",
        {
            account_id: window.account.accountId
        }
    )
    return balance[window.contract_metapool.contractId]
        ? balance[window.contract_metapool.contractId]
        : "0"
}

// get user stNEAR balance on Ref-finance
async function getOctBalanceOnRef(): Promise<string> {
    const balance = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "get_deposits",
        {
            account_id: window.account.accountId
        }
    )
    return balance[ADDRESS_OCT]
        ? balance[ADDRESS_OCT]
        : "0"
}

// deposit stNEAR then add liquidity to OCT<>stNEAR pool
async function addLiquidity(
    amount_stnear: string,
    lp_amounts: string[]
): Promise<void> {
    const metapoolActions: nearAPI.transactions.Action[] = []
    // use this to increase storage balance on ref before depositing stNEAR 
    const refActions_1: nearAPI.transactions.Action[] = []
    // use this for actions related to LP 
    const refActions_2: nearAPI.transactions.Action[] = []

    // query user storage on ref
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "storage_balance_of",
        {
            account_id: window.account.accountId
        }
    )

    // check if storage is enough for a new token deposit
    if (
        storage_balance === null ||
        BigInt(storage_balance.available) <= BigInt(MIN_DEPOSIT_PER_TOKEN)
    ) {
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
    metapoolActions.push(
        nearAPI.transactions.functionCall(
            "ft_transfer_call",
            {
                receiver_id: window.contract_ref_exchange.contractId,
                amount: amount_stnear,
                msg: ""
            },
            150_000_000_000_000,
            "1" // one yocto
        )
    )

    // add liquidity to $OCT <-> $stNEAR
    // no need to check for storage as storage deposit
    // is take from attached deposit for this action
    refActions_2.push(
        nearAPI.transactions.functionCall(
            "add_liquidity",
            {
                pool_id: NEW_POOL_ID,
                amounts: lp_amounts
            },
            100_000_000_000_000,
            LP_STORAGE_AMOUNT
        )
    );


    const preTXs: any = [];
    if (refActions_1.length > 0) {
        preTXs.push(
            makeTransaction(window.contract_ref_exchange.contractId, refActions_1)
        )
    }
    preTXs.push(
        makeTransaction(window.contract_metapool.contractId, metapoolActions)
    );
    preTXs.push(
        makeTransaction(window.contract_ref_exchange.contractId, refActions_2)
    );
    const TXs: nearAPI.transactions.Transaction[] = await Promise.all(preTXs);

    window.walletAccount.requestSignTransactions({
        transactions: TXs
    })
}

async function makeTransaction(
    receiverId: string,
    actions: nearAPI.transactions.Action[],
    nonceOffset = 1
): Promise<nearAPI.transactions.Transaction> {
    let accessKey = await window.account.accessKeyForTransaction(
        receiverId,
        actions
    )
    if (!accessKey) {
        throw new Error(
            `Cannot find matching key for transaction sent to ${receiverId}`
        )
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

// Loads nearAPI and this contract into window scope.

export {
    initContracts,
    getOldFarmingStake,
    getNewFarmingStake,
    stake,
    unstake,
    getOldPoolInfo,
    getNewPoolInfo,
    removeLiquidity,
    getWnearBalanceOnRef,
    wnearToStnear,
    getMetapoolInfo
}
