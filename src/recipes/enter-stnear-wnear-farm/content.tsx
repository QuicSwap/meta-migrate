import * as React from "react"
import { ReactNode, useEffect, useState } from "react"
import { Description, Break, Loading, Purple, Note } from "../../components/description"
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
import { getFarmAPR } from "../../utils/apr"

const NEAR = new Logic()

let allowanceInput: InputData
let refresh: Refresh[] = []

export const steps: string[] = ["enter farm", "profit"]

export function getContent(page: number): ReactNode | null {
    switch (page) {
        case 0:
            // Define Inputs
            if (NEAR.minDepositAmount !== undefined && NEAR.nativeNEARBalance !== undefined)
                allowanceInput ??= new InputData({
                    value: Math.max(Number(yton(NEAR.nativeNEARBalance!, 5)) - 5, 0).toString(),
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
            const balance = Loading(!!NEAR?.nativeNEARBalance, NEAR.nativeNEARBalance, s => yton(s)!)
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
                                You currently have <Purple>{balance}</Purple>&nbsp;$NEAR in your wallet.
                                <Break />
                                <InputComponent
                                    data={allowanceInput ?? new InputData({ value: "" })}
                                    label="recipe allowance"
                                    type="number"
                                    unit="NEAR"
                                />
                                <Break />
                                <Note>Execution might take a while.</Note>
                            </Description>
                        }
                        denied={allowanceInput?.data.error}
                        completed={refresh[0]}
                        action={() => {
                            NEAR.stepOneAction(utils.format.parseNearAmount(allowanceInput.data.value)!)
                        }}
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
            refresh[4] ??= new Refresh(
                () =>
                    Promise.all([
                        NEAR.getWnearBalanceOnRef(),
                        NEAR.getStnearBalanceOnRef(),
                        NEAR.getStnearBalance(),
                        NEAR.getNativeNearBalance()
                    ]).then(res => {
                        NEAR.wNEARBalanceOnRef = res[0]
                        NEAR.stNEARBalanceOnRef = res[1]
                        NEAR.stNEARBalance = res[2]
                        NEAR.nativeNEARBalance = res[3]
                        return true
                    }),
                0
            )
            // Define Values
            const rows = [
                {
                    location: "Ref-Finance",
                    link: `https://app.ref.finance/account`,
                    amount: NEAR?.wNEARBalanceOnRef,
                    unit: "wNEAR",
                    noline: true
                },
                {
                    location: "",
                    link: `https://app.ref.finance/account`,
                    amount: NEAR?.stNEARBalanceOnRef,
                    unit: "stNEAR"
                },
                {
                    location: "NEAR wallet",
                    link: `https://wallet.near.org/`,
                    amount: NEAR?.nativeNEARBalance,
                    unit: "NEAR",
                    noline: true
                },
                {
                    location: "",
                    link: `https://wallet.near.org/`,
                    amount: NEAR?.stNEARBalance,
                    unit: "stNEAR"
                }
            ]
            return <LocateComponent rows={rows} />

        default:
            return <TitleComponent title="Something went wrong" />
    }
}

export function APY() {
    const [percentage, setPercentage] = useState("...")
    useEffect(() => {
        async function getPercentage() {
            let percentage = (await getFarmAPR())?.ref_oct_st_near_apr
            if (isNaN(percentage) || percentage === 0) {
                percentage = "..."
            }
            setPercentage(percentage)
        }
        getPercentage()
    }, [percentage])
    return <span>{percentage !== "..." ? Math.round(Number(percentage)) + "%" : "..."}</span>
}
