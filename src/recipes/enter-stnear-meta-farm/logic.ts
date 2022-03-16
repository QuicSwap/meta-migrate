import * as nearAPI from "near-api-js"
import { passToWallet, nearToStnear } from "../../services/near"

function stepOneAction(amount: string) {
    passToWallet([nearToStnear(amount)])
}

export { stepOneAction }
