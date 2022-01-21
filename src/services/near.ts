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
    }
}

const view_storage: string[] = ["storage_balance_bounds", "storage_balance_of"]
const change_storage: string[] = ["storage_deposit"]
const view_ft: string[] = ["ft_balance_of"]
const change_ft: string[] = ["ft_transfer_call", "ft_transfer"]

const OLD_POOL_ID = 47
const FARM_STORAGE_BALANCE: string = nearAPI.utils.format.parseNearAmount(
    "0.045"
) as string
const MIN_DEPOSIT_PER_TOKEN: string = nearAPI.utils.format.parseNearAmount(
    "0.005"
) as string
const ONE_MORE_DEPOSIT_AMOUNT: string = nearAPI.utils.format.parseNearAmount(
    "0.01"
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
            viewMethods: view_storage.concat(view_ft),
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

// Using initialized contract
/*
async function doWork() {
  // Based on whether you've authorized, checking which flow we should go.
  if (!window.walletAccount.isSignedIn()) {
    signedOutFlow();
  } else {
    signedInFlow();
  }
}
*/

// Function that initializes the signIn button using WalletAccount
/*
function signedOutFlow() {
  // Displaying the signed out flow container.
  Array.from(document.querySelectorAll('.signed-out')).forEach(el => el.style.display = '');
  // Adding an event to a sing-in button.
  document.getElementById('sign-in')!.addEventListener('click', () => {
    window.walletAccount.requestSignIn(
      // The contract name that would be authorized to be called by the user's account.
      window.nearConfig.contractName,
      // This is the app name. It can be anything.
      'Who was the last person to say "Hi!"?',
      // We can also provide URLs to redirect on success and failure.
      // The current URL is used by default.
    );
  });
}
*/

// Main function for the signed-in flow (already authorized by the wallet).
/*
function signedInFlow() {
  // Displaying the signed in flow container.
  Array.from(document.querySelectorAll('.signed-in')).forEach(el => el.style.display = '');

  // Displaying current account name.
  document.getElementById('account-id')!.innerText = window.account.accountId;

  // Adding an event to a say-hi button.
  document.getElementById('say-hi')!.addEventListener('click', () => {
    // We call say Hi and then update who said Hi last.
    window.contract.sayHi().then(updateWhoSaidHi);
  });

  // Adding an event to a sing-out button.
  document.getElementById('sign-out')!.addEventListener('click', e => {
    e.preventDefault();
    window.walletAccount.signOut();
    // Forcing redirect.
    window.location.replace(window.location.origin + window.location.pathname);
  });

  // fetch who last said hi without requiring button click
  // but wait a second so the question is legible
  setTimeout(updateWhoSaidHi, 1000);
}
*/

// get user stake in OCT<>wNEAR farm
async function getOldFarmingStake(): Promise<string> {
    const seeds: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "list_user_seeds",
        {
            account_id: window.account.accountId
        }
    )
    return seeds["v2.ref-finance.near@47"]
        ? seeds["v2.ref-finance.near@47"]
        : "0"
}
// unstake farm shares from OCT<>wNEAR farm
async function unstake(): Promise<void> {
    const actions: nearAPI.transactions.Action[] = []
    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_farming.contractId,
        "storage_balance_of",
        {
            accountId: window.account.accountId
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

    const amnt = await getOldFarmingStake()

    actions.push(
        nearAPI.transactions.functionCall(
            "withdraw_seed",
            {
                seed_id: 7,
                amount: amnt,
                msg: ""
            },
            200_000_000_000_000,
            "1" // one yocto
        )
    )

    const TXs: nearAPI.transactions.Transaction = await makeTransaction(
        window.contract_ref_farming.contractId,
        actions
    )

    window.walletAccount.requestSignTransactions({
        transactions: [TXs]
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
    // get use shares
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
        total_shares
    }: {
        amounts: string[]
        total_shares: string
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
            BigInt(amount) * (BigInt(user_shares) / BigInt(total_shares))
        // add 0.01% slippage tolerance
        return ((exact_amount * BigInt("999")) / BigInt("1000")).toString()
    })

    return { user_shares, total_shares, min_amounts }
}

// remove liquidity from OCT<>wNEAR pool
async function removeLiquidity(): Promise<void> {
    const actions: nearAPI.transactions.Action[] = []

    // query user storage
    const storage_balance: any = await window.account.viewFunction(
        window.contract_ref_exchange.contractId,
        "storage_balance_of",
        {
            accountId: window.account.accountId
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

    const { user_shares, total_shares, min_amounts } = await getOldPoolInfo()

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

export { initContracts }
