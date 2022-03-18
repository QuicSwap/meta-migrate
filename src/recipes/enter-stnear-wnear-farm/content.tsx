import * as React from "react"
import { ReactNode } from "react"
import { Description, Break } from "../../components/description"
import { InputData, InputComponent } from "../../components/input"
import LocateComponent from "../../components/locate"
import NavButtonComponent from "../../components/navbuttons"
import StepComponent from "../../components/step"
import TitleComponent from "../../components/title"
import meme from "../../memes/2.gif"
import { Refresh } from "../../utils/refresh"
import { utils } from "near-api-js"
import { yton } from "../../utils/math"
import Logic from "./logic"

const NEAR = new Logic()

let allowanceInput: InputData
let refresh: Refresh[] = []

export const steps: string[] = ["enter farm", "profit"]

export function getContent(page: number): ReactNode | null {
    switch (page) {
        case 0:
            // Define Inputs
            if (NEAR.nativeNEARBalance !== undefined && NEAR.nativeNEARBalance !== undefined)
                allowanceInput ??= new InputData({
                    value: yton(NEAR.nativeNEARBalance!, 5),
                    pattern: /^\d+(\.\d{0,24})?$/,
                    assert: [
                        {
                            test: (value: string) =>
                                NEAR.minDepositAmount !== undefined &&
                                BigInt(utils.format.parseNearAmount(value) ?? "0") <
                                    BigInt(2) * BigInt(NEAR.minDepositAmount),
                            msg: () =>
                                `This recipe requires a minimum of ${yton(
                                    (BigInt(2) * BigInt(NEAR.minDepositAmount!)).toString(),
                                    2
                                )} $NEAR.`
                        },
                        {
                            test: (value: string) =>
                                NEAR.nativeNEARBalance !== undefined &&
                                BigInt(utils.format.parseNearAmount(value) ?? "0") > BigInt(NEAR.nativeNEARBalance),
                            msg: () =>
                                `Insufficient funds. You only have ${utils.format.formatNearAmount(
                                    NEAR.nativeNEARBalance!
                                )} $NEAR in your wallet.`
                        }
                    ]
                })
            // Define Refresh
            refresh[0] ??= new Refresh(
                () =>
                    Promise.all([NEAR.getMetapoolInfo(), NEAR.getNativeNearBalance()]).then(res => {
                        NEAR.minDepositAmount = res[0].min_deposit_amount
                        NEAR.nativeNEARBalance = res[1]
                        return BigInt(NEAR.nativeNEARBalance) < BigInt(2) * BigInt(NEAR.minDepositAmount)
                    }),
                0
            )
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="Enter stNEAR <-> wNEAR Farm" step={1} />
                    <StepComponent
                        title={"Specify the recipe allowace in $NEAR."}
                        description={
                            <Description>
                                Your NEAR will be staked and wrapped in equal parts, {""}
                                provided as liquidity in the stNEAR {"<->"} wNEAR pool and {""}
                                finally the LP Shares are put into the stNEAR {"<->"} wNEAR farm. {""}
                                <Break />
                                <InputComponent
                                    data={allowanceInput}
                                    label="recipe allowance"
                                    type="number"
                                    unit="NEAR"
                                />
                            </Description>
                        }
                        denied={allowanceInput.data.error}
                        completed={refresh[0]}
                        action={() => {}}
                    />
                    <NavButtonComponent next />
                </>
            )

        case 1:
            // Define Inputs
            // -
            // Define Refresh
            // -
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="Happy Farming!" />
                    <img src={meme} style={{ maxWidth: "50%" }} alt="meme" />
                    <NavButtonComponent back />
                </>
            )

        case 2:
            // Define Inputs
            // -
            // Define Refresh
            // -
            // Define Values
            const rows: {
                location: string
                link: string
                amount?: string | undefined
                unit: string
                noline?: boolean | undefined
            }[] = []
            return <LocateComponent rows={rows} />

        default:
            return <TitleComponent title="Something went wrong" />
    }
}
