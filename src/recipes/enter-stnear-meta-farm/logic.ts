import * as nearAPI from "near-api-js"
import BaseLogic from "../../services/near"

export default class Logic extends BaseLogic {
    nativeNEARBalance?: string
    minDepositAmount?: string
    stNEARPrice?: string

    stepOneAction(amount: string) {
        this.passToWallet([this.nearToStnear(amount)])
    }
}
