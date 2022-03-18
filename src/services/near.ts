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

window.nearConfig = getConfig("mainnet")

export default class BaseLogic {
    OLD_POOL_ID = 47 // ['f5cfbc74057c610c8ef151a439252680ac68c6dc.factory.bridge.near', 'wrap.near']
    NEW_POOL_ID = 1889 // ["meta-pool.near","f5cfbc74057c610c8ef151a439252680ac68c6dc.factory.bridge.near"]
    SIMPLE_POOL_SHARE_DECIMALS = 24
    FARM_STORAGE_BALANCE: string = nearAPI.utils.format.parseNearAmount("0.045") as string
    MIN_DEPOSIT_PER_TOKEN: string = nearAPI.utils.format.parseNearAmount("0.005") as string
    ONE_MORE_DEPOSIT_AMOUNT: string = nearAPI.utils.format.parseNearAmount("0.01") as string
    LP_STORAGE_AMOUNT: string = nearAPI.utils.format.parseNearAmount("0.01") as string
    NEW_ACCOUNT_STORAGE_COST: string = nearAPI.utils.format.parseNearAmount("0.00125") as string

    // Initializing contract
    // TEMP generalized
    static async initNear() {
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

    // TEMP generalized
    async getFarmingStake(pool_id: number): Promise<string> {
        const seeds: any = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_FARMING, "list_user_seeds", {
            account_id: window.account.accountId
        })
        return seeds[`${window.nearConfig.ADDRESS_REF_EXCHANGE}@${pool_id}`]
            ? seeds[`${window.nearConfig.ADDRESS_REF_EXCHANGE}@${pool_id}`]
            : "0"
    }

    // TEMP generalized
    async getPosition(poolID: number): Promise<{
        user_total_shares: string
        user_farm_shares: string
        user_lp_shares: string
        total_shares: string
        min_amounts: string[]
    }> {
        const [user_farm_shares, pool_info] = await Promise.all([
            this.getFarmingStake(poolID),
            this.getPoolInfo(poolID)
        ])

        const user_total_shares = (BigInt(user_farm_shares) + BigInt(pool_info.user_shares)).toString()

        const min_amounts = this.calcMinAmountsOut(user_total_shares, pool_info.total_shares, pool_info.amounts)

        return {
            user_total_shares,
            user_farm_shares,
            user_lp_shares: pool_info.user_shares,
            total_shares: pool_info.total_shares,
            min_amounts
        }
    }

    async exitOldPosition(staked_amount: string, user_total_shares: string, min_amounts: string[]): Promise<void> {
        const preTXs: Promise<nearAPI.transactions.Transaction[]>[] = []

        // if user has LP shares on farm, unstake them
        if (BigInt(staked_amount) > BigInt("0")) {
            preTXs.push(this.unstake(staked_amount))
        }
        // remove liquidity from OCT <-> wNEAR pool
        preTXs.push(this.removeLiquidity(user_total_shares, min_amounts))

        // withdraw wNEAR from Ref and unwrap it
        preTXs.push(this.wnearToNear(min_amounts[1]))

        const TXs = await Promise.all(preTXs)

        window.walletAccount.requestSignTransactions({
            transactions: TXs.flat(),
            callbackUrl: window.location.href
        })
    }

    // stake farm shares in OCT<>stNEAR farm
    async farmStake(amount: string, poolID: number): Promise<nearAPI.transactions.Transaction[]> {
        const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
        const storageActions: nearAPI.transactions.Action[] = []
        const stakingActions: nearAPI.transactions.Action[] = []

        const storage_balance: any = await window.account.viewFunction(
            window.nearConfig.ADDRESS_REF_FARMING,
            "storage_balance_of",
            {
                account_id: window.account.accountId
            }
        )

        if (
            !storage_balance ||
            BigInt(storage_balance?.available ?? "0") < BigInt(this.FARM_STORAGE_BALANCE) ||
            BigInt(storage_balance?.available ?? "0") < BigInt(this.MIN_DEPOSIT_PER_TOKEN)
        ) {
            storageActions.push(
                nearAPI.transactions.functionCall(
                    "storage_deposit", // contract method to deposit NEAR for wNEAR
                    {},
                    20_000_000_000_000, // attached gas
                    this.FARM_STORAGE_BALANCE // amount of NEAR to deposit and wrap
                )
            )
        }

        stakingActions.push(
            nearAPI.transactions.functionCall(
                "mft_transfer_call",
                {
                    receiver_id: window.nearConfig.ADDRESS_REF_FARMING,
                    token_id: `:${poolID}`,
                    amount: amount,
                    msg: ""
                },
                180_000_000_000_000,
                "1" // one yocto
            )
        )

        // only add storage transaction if needed
        if (storageActions.length > 0) {
            preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_FARMING, storageActions))
        }

        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, stakingActions))

        return await Promise.all(preTXs)
    }

    // unstake farm shares from OCT<>wNEAR farm
    async unstake(amnt: string): Promise<nearAPI.transactions.Transaction[]> {
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
                    this.FARM_STORAGE_BALANCE // amount of NEAR to deposit and wrap
                )
            )
        }

        actions.push(
            nearAPI.transactions.functionCall(
                "withdraw_seed",
                {
                    seed_id: `${window.nearConfig.ADDRESS_REF_EXCHANGE}@${this.OLD_POOL_ID}`,
                    amount: amnt,
                    msg: ""
                },
                200_000_000_000_000,
                "1" // one yocto
            )
        )

        const TX: nearAPI.transactions.Transaction = await this.makeTransaction(
            window.nearConfig.ADDRESS_REF_FARMING,
            actions
        )

        return [TX]
    }

    // TEMP generalized
    calcMinAmountsOut(user_shares: string, total_shares: string, amounts: string[]): string[] {
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
    async getPoolInfo(poolID: number): Promise<{
        user_shares: string
        total_shares: string
        amounts: string[]
    }> {
        // get user shares
        const user_shares: string = await window.account.viewFunction(
            window.nearConfig.ADDRESS_REF_EXCHANGE,
            "get_pool_shares",
            {
                pool_id: poolID,
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
            pool_id: poolID
        })

        return { user_shares, total_shares, amounts }
    }

    async getNewPoolInfo(): Promise<{
        user_shares: string
        total_shares: string
        amounts: string[]
    }> {
        const user_shares = await window.account.viewFunction(
            window.nearConfig.ADDRESS_REF_EXCHANGE,
            "get_pool_shares",
            {
                pool_id: this.NEW_POOL_ID,
                account_id: window.account.accountId
            }
        )

        const {
            amounts,
            shares_total_supply: total_shares
        }: {
            amounts: string[]
            shares_total_supply: string
        } = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_pool", {
            pool_id: this.NEW_POOL_ID
        })

        return { user_shares, total_shares, amounts }
    }

    // remove liquidity from OCT<>wNEAR pool
    async removeLiquidity(user_shares: string, min_amounts: string[]): Promise<nearAPI.transactions.Transaction[]> {
        const actions: nearAPI.transactions.Action[] = []

        // query user storage
        const storage_balance: any = await window.account.viewFunction(
            window.nearConfig.ADDRESS_REF_EXCHANGE,
            "storage_balance_of",
            {
                account_id: window.account.accountId
            }
        )

        if (storage_balance === null || BigInt(storage_balance.available) <= BigInt(this.MIN_DEPOSIT_PER_TOKEN)) {
            actions.push(
                nearAPI.transactions.functionCall(
                    "storage_deposit", // contract method to deposit NEAR for wNEAR
                    {},
                    20_000_000_000_000, // attached gas
                    this.ONE_MORE_DEPOSIT_AMOUNT // amount of NEAR to deposit and wrap
                )
            )
        }

        actions.push(
            nearAPI.transactions.functionCall(
                "remove_liquidity",
                {
                    pool_id: this.OLD_POOL_ID,
                    shares: user_shares,
                    min_amounts: min_amounts
                },
                50_000_000_000_000,
                "1" // one yocto
            )
        )

        const TX: nearAPI.transactions.Transaction = await this.makeTransaction(
            window.nearConfig.ADDRESS_REF_EXCHANGE,
            actions
        )

        return [TX]
    }

    // get user wNEAR balance on Ref-finance
    async getWnearBalanceOnRef(): Promise<string> {
        const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
            account_id: window.account.accountId
        })
        return balance[window.nearConfig.ADDRESS_WNEAR] ? balance[window.nearConfig.ADDRESS_WNEAR] : "0"
    }

    // get user native NEAR balance
    async getNativeNearBalance(): Promise<string> {
        const accountBalance = await window.account.getAccountBalance()
        return accountBalance.available
    }

    // withdraw wNEAR from Ref account and unwrap it
    async wnearToNear(wnear_amount: string): Promise<nearAPI.transactions.Transaction[]> {
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
                nearAPI.transactions.functionCall(
                    "storage_deposit",
                    {},
                    30_000_000_000_000,
                    this.ONE_MORE_DEPOSIT_AMOUNT
                )
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
        const wnearStorage: any = await window.account.viewFunction(
            window.nearConfig.ADDRESS_WNEAR,
            "storage_balance_of",
            {
                account_id: window.account.accountId
            }
        )

        if (!wnearStorage || BigInt(wnearStorage.total) <= BigInt("0")) {
            wNearActions_1.push(
                nearAPI.transactions.functionCall(
                    "storage_deposit",
                    {},
                    30_000_000_000_000,
                    this.NEW_ACCOUNT_STORAGE_COST
                )
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
            preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_WNEAR, wNearActions_1))
        }
        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions))
        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_WNEAR, wNearActions_2))

        const TXs = await Promise.all(preTXs)

        return TXs
    }

    // stake NEAR with metapool to get stNEAR
    async nearToStnear(near_amount: string): Promise<nearAPI.transactions.Transaction[]> {
        const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
        const metapoolActions: nearAPI.transactions.Action[] = []

        // deposit NEAR to metapool
        metapoolActions.push(
            nearAPI.transactions.functionCall("deposit_and_stake", {}, 50_000_000_000_000, near_amount)
        )

        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_METAPOOL, metapoolActions))

        const TXs = await Promise.all(preTXs)
        return TXs
    }

    async nearToWnear(near_amount: string): Promise<nearAPI.transactions.Transaction[]> {
        const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
        const wNearActions: nearAPI.transactions.Action[] = []

        // query user storage balance on wNEAR contract
        const wnearStorage: any = await window.account.viewFunction(
            window.nearConfig.ADDRESS_WNEAR,
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
                    this.NEW_ACCOUNT_STORAGE_COST
                )
            )
        }

        // deposit NEAR to metapool
        wNearActions.push(nearAPI.transactions.functionCall("near_deposit", {}, 50_000_000_000_000, near_amount))

        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_METAPOOL, wNearActions))

        const TXs = await Promise.all(preTXs)
        return TXs
    }

    // get stNEAR price and min deposit amount in $NEAR
    async getMetapoolInfo(): Promise<{
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
    async getStnearBalance(): Promise<string> {
        const balance: string = await window.account.viewFunction(window.nearConfig.ADDRESS_METAPOOL, "ft_balance_of", {
            account_id: window.account.accountId
        })
        return balance
    }

    // get user stNEAR balance on Ref-finance
    async getStnearBalanceOnRef(): Promise<string> {
        const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
            account_id: window.account.accountId
        })
        return balance[window.nearConfig.ADDRESS_METAPOOL] ? balance[window.nearConfig.ADDRESS_METAPOOL] : "0"
    }

    // get user stNEAR balance on Ref-finance
    async getOctBalanceOnRef(): Promise<string> {
        const balance = await window.account.viewFunction(window.nearConfig.ADDRESS_REF_EXCHANGE, "get_deposits", {
            account_id: window.account.accountId
        })
        console.log("Balance: ", window.nearConfig.ADDRESS_REF_EXCHANGE)
        return balance[window.nearConfig.ADDRESS_OCT] ? balance[window.nearConfig.ADDRESS_OCT] : "0"
    }

    // deposit stNEAR then add liquidity to OCT<>stNEAR pool
    async addLiquidity(amount_stnear: string, lp_amounts: string[]): Promise<nearAPI.transactions.Transaction[]> {
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
        if (storage_balance === null || BigInt(storage_balance.available) <= BigInt(this.MIN_DEPOSIT_PER_TOKEN)) {
            refActions_1.push(
                nearAPI.transactions.functionCall(
                    "storage_deposit", // contract method to deposit NEAR for wNEAR
                    {},
                    20_000_000_000_000, // attached gas
                    this.ONE_MORE_DEPOSIT_AMOUNT // amount of NEAR to deposit and wrap
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
                    pool_id: this.NEW_POOL_ID,
                    amounts: lp_amounts,
                    min_amounts: min_lp_amounts
                },
                100_000_000_000_000,
                this.LP_STORAGE_AMOUNT
            )
        )

        if (refActions_1.length > 0) {
            preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions_1))
        }
        if (metapoolActions.length > 0) {
            preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_METAPOOL, metapoolActions))
        }
        preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions_2))
        const TXs: nearAPI.transactions.Transaction[] = await Promise.all(preTXs)

        return TXs
    }

    /**
     * deposit multiple tokens on Ref.
     * Assumptions:
     * 1- ref-finance contract already has storage deposit on provided tokens
     * 2- provided tokens are on the ref-finance global whitelist
     *
     * @param deposits
     */
    async depositTokensOnRef(
        deposits: { token: string; amount: string }[]
    ): Promise<nearAPI.transactions.Transaction[]> {
        const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
        const tokensActions: {
            address: string
            actions: nearAPI.transactions.Action[]
        }[] = []

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

        // transaction objects for deposits. Each token deposit is a separate transaction
        for (let i = 0; i < deposits.length; i++) {
            preTXs.push(this.makeTransaction(tokensActions[i].address, tokensActions[i].actions))
        }

        const TXs = await Promise.all(preTXs)
        return TXs
    }

    // estimate LP shares you get for supplying amounts
    // see https://github.com/ref-finance/ref-contracts/blob/3c04fd20767ad7f1c383deee8e0a2b5ab47fbc18/ref-exchange/src/simple_pool.rs#L118
    calcLpSharesFromAmounts(pool_total_shares: string, pool_amounts: string[], lp_amounts: string[]): string {
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

    /**
     * round number x to next nearest multiple of m.
     * if (x % m == 0) then return x
     * else return nearest multiple of m that's bigger than x
     *
     * @example
     * roundUpToNearest (0, 5) => 0
     * roundUpToNearest (39, 5) => 40
     * roundUpToNearest (40, 5) => 40
     * roundUpToNearest (41, 5) => 45
     *
     * @param x
     * @param m
     * @returns
     */
    roundUpToNearest(x: string, m: string): string {
        const rest: bigint = BigInt(x) % BigInt(m)
        const toAdd: bigint = rest === BigInt(0) ? BigInt(0) : BigInt(m)
        return (BigInt(x) - rest + toAdd).toString()
    }

    /**
     * estimate & pay storage costs for actions that'll be performed
     * on Ref-finane exchange. Supported: token deposits and LP
     *
     * !! IMPORTANT !!
     * When making multiple actions on Ref-finance at once, like:
     * deposit multiple tokens, multiple LPs or combination of both
     * Use this method to correctly estimate needed storage before
     * performing the actions (this transaction has to go first).
     *
     * @example good: deposit 2 tokens and 1 LP at once:
     * - 1: call payRefStorage payRefStorage({ lp_positions: 1, token_deposits: 2})
     * - 2: deposit tokens and provide LP
     * this will correctly estimate storage for the
     *
     * @example !! BAD !!: separate calls miscalculate needed storage on ref-finance
     * Situation: user has 0.1 available for storage and 1 token needs 0.1
     * user wants to deposit 2 tokens
     * - 1: estimate storage for 1st token then deposit:
     * payRefStorage({ lp_positions: 0, token_deposits: 1})
     * depositTokensOnRef([{token: "dai", amount: "1"}])
     * => check available storage: 0.1 so enough for 1 token: correct
     * - 2: estimate storage for 2nd token then deposit:
     * payRefStorage({ lp_positions: 0, token_deposits: 1})
     * depositTokensOnRef([{token: "usdt", amount: "1"}])
     * => check available storage: 0.1 so enough for 1 token: this is wrong !!
     * because we will be depositing 1 token before this, so we won't have enough
     * storage for the 2nd token when the TXs actually execute
     *
     * @param payFor actions to cover storage for
     * - lp_position: number of LP positions we'll create
     * - token_deosits: number of tokens that we'll deposit
     */
    async payRefStorage(payFor: {
        lp_positions: number
        token_deposits: number
    }): Promise<nearAPI.transactions.Transaction[]> {
        const preTXs: Promise<nearAPI.transactions.Transaction>[] = []
        // increase user storage balance on ref before token deposits
        const refActions: nearAPI.transactions.Action[] = []

        const storage_needed: bigint =
            BigInt(payFor.lp_positions) * BigInt(this.LP_STORAGE_AMOUNT) +
            BigInt(payFor.token_deposits) * BigInt(this.MIN_DEPOSIT_PER_TOKEN)

        // query user storage on ref
        const storage_balance: any = await window.account.viewFunction(
            window.nearConfig.ADDRESS_REF_EXCHANGE,
            "storage_balance_of",
            {
                account_id: window.account.accountId
            }
        )

        // check if user storage is enough
        if (storage_balance === null || BigInt(storage_balance.available) <= storage_needed) {
            // calculate amount to pay
            const amountMissing: string = (storage_needed - BigInt(storage_balance.available)).toString()
            const amountToPay: string = this.roundUpToNearest(amountMissing, this.MIN_DEPOSIT_PER_TOKEN)

            refActions.push(
                nearAPI.transactions.functionCall(
                    "storage_deposit", // contract method to deposit NEAR for wNEAR
                    {},
                    20_000_000_000_000, // attached gas
                    amountToPay
                )
            )
        }

        // only construct a transaction if we actually have to pay storage
        if (refActions.length > 0) {
            preTXs.push(this.makeTransaction(window.nearConfig.ADDRESS_REF_EXCHANGE, refActions))
        }

        return await Promise.all(preTXs)
    }

    // helpers

    // returns yocto stNEAR amount equivalent to specified yocto NEAR amount
    estimateStnearOut(amount: string, price: string, accuracy = 5): string {
        return BigInt(price) === BigInt(0)
            ? "0"
            : nearAPI.utils.format.parseNearAmount(
                  (Number(BigInt(amount + "0".repeat(accuracy)) / BigInt(price)) / 10 ** accuracy).toString()
              )!
    }

    async makeTransaction(
        receiverId: string,
        actions: nearAPI.transactions.Action[],
        nonceOffset = 1
    ): Promise<nearAPI.transactions.Transaction> {
        const [accessKey, block] = await Promise.all([
            window.account.accessKeyForTransaction(receiverId, actions),
            window.near.connection.provider.block({ finality: "final" })
        ])

        if (!accessKey) {
            throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`)
        }

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
    async passToWallet(preTXs: Promise<nearAPI.transactions.Transaction[]>[]): Promise<void> {
        const TXs = await Promise.all(preTXs)
        window.walletAccount.requestSignTransactions({
            transactions: TXs.flat(),
            callbackUrl: window.location.href
        })
    }

    // Loads nearAPI and this contract into window scope.
}
