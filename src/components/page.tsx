import { Grid } from "@mui/material"
import * as React from "react"
import { ReactNode } from "react"
import { getOldFarmingStake, getOldPoolInfo, removeLiquidity, unstake } from "../services/near"
import { Refresh } from "../utils/refresh"
import NavButtonComponent from "./navbuttons"
import StepComponent from "./step"
import TitleComponent from "./title"
import { utils } from "near-api-js"

function getContent(page: number): ReactNode | null {

    switch (page) {
        case 0:
            return (
                <>
                    <TitleComponent title="Exit OCT <-> wNEAR" />
                    <StepComponent
                        title="1. Unstake from OCT <-> wNEAR farm"
                        description={`You have #${
                            window.oldFarmingStake
                                ? parseFloat(
                                        utils.format.formatNearAmount(
                                            window.oldFarmingStake
                                        )!
                                  ).toFixed(3)
                                : "..."
                        }# staked shares.`}
                        completed={
                            window.REFRESHER[0] ??
                            (() => {
                                window.REFRESHER[0] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getOldFarmingStake()
                                                .then(res => window.oldFarmingStake = res)
                                                .then(res =>
                                                    resolve(
                                                        BigInt(res) === BigInt("0")
                                                    )
                                                )
                                        ),
                                    0
                                )
                                return window.REFRESHER[0]
                            })()
                        }
                        action={() => unstake(window.oldFarmingStake)}
                    />
                    <StepComponent
                        title="2. Remove liquidity from OCT <-> wNEAR pool"
                        description={`You have #${
                            window.oldPoolInfo
                                ? parseFloat(
                                        utils.format.formatNearAmount(
                                            window.oldPoolInfo.user_shares
                                        )!
                                  ).toFixed(3)
                                : "..."
                        }# LP shares equal to #${
                            window.oldPoolInfo
                                ? parseFloat(
                                        utils.format.formatNearAmount(
                                            window.oldPoolInfo.min_amounts[0] + "000000"
                                        )!
                                  ).toFixed(3)
                                : "..."
                        }# $OCT and #${
                            window.oldPoolInfo
                                ? parseFloat(
                                        utils.format.formatNearAmount(
                                            window.oldPoolInfo.min_amounts[1]
                                        )!
                                  ).toFixed(3)
                                : "..."
                        }# $wNEAR.`}
                        completed={
                            window.REFRESHER[1] ??
                            (() => {
                                window.REFRESHER[1] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getOldPoolInfo()
                                                .then(res => window.oldPoolInfo = res)
                                                .then(res =>
                                                    resolve(
                                                        BigInt(res.user_shares) === BigInt("0")
                                                    )
                                                )
                                        )
                                )
                                return window.REFRESHER[1]
                            })()
                        }
                        action={() => removeLiquidity(
                            window.oldPoolInfo.user_shares, 
                            window.oldPoolInfo.total_shares, 
                            window.oldPoolInfo.min_amounts
                        )}
                    />
                    <NavButtonComponent next />
                </>
            )

        case 1:
            return (
                <>
                    <TitleComponent title="Convert Assets" />
                    <StepComponent
                        title="wNEAR -> stNEAR"
                        description="Convert wNEAR to NEAR to stNEAR"
                        completed={
                            window.REFRESHER[2] ??
                            (() => {
                                window.REFRESHER[2] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            setTimeout(() => resolve(false), 10)
                                        )
                                )
                                return window.REFRESHER[2]
                            })()
                        }
                        // action={}
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 2:
            return (
                <>
                    <TitleComponent title="reDeposit Funds" />
                    <StepComponent
                        title="Add liquidity to pool"
                        description="Deposit liquidity at OCT <-> stNEAR pool"
                        completed={
                            window.REFRESHER[3] ??
                            (() => {
                                window.REFRESHER[3] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            setTimeout(() => resolve(false), 10)
                                        )
                                )
                                return window.REFRESHER[3]
                            })()
                        }
                        // action={}
                    />
                    <StepComponent
                        title="Add liquidity to farm"
                        description="Deposit liquidity at OCT <-> stNEAR farm"
                        completed={
                            window.REFRESHER[4] ??
                            (() => {
                                window.REFRESHER[4] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            setTimeout(() => resolve(false), 10)
                                        )
                                )
                                return window.REFRESHER[4]
                            })()
                        }
                        // action={}
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 3:
            return (
                <>
                    <TitleComponent title="DONE!1!1111!!" />
                </>
            )

        default:
            return (
                <StepComponent
                    title="Something went wrong"
                    description="Try to clear site data"
                    completed={
                        window.REFRESHER[5] ??
                        (() => {
                            window.REFRESHER[5] = new Refresh(
                                () =>
                                    new Promise(resolve =>
                                        setTimeout(() => resolve(false), 10)
                                    )
                            )
                            return window.REFRESHER[5]
                        })()
                    }
                    // action={}
                />
            )
    }
}

export default function PageComponent(props: { page: number }) {
    return (
        <Grid
            container
            sx={{
                width: 1,
                height: 1,
                p: 4
            }}
            direction="column"
            justifyContent="space-evenly"
            alignItems="center"
            wrap="nowrap"
        >
            {getContent(props.page)}
        </Grid>
    )
}
