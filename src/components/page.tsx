import { Grid, Paper } from "@mui/material"
import * as React from "react"
import { ReactNode } from "react"
import { Refresh } from "../utils/refresh"
import NavButtonComponent from "./navbuttons"
import StepComponent from "./step"
import TitleComponent from "./title"
import { getOldFarmingStake } from "../services/near"

function getContent(page: number): ReactNode | null {
    getOldFarmingStake()
        .then(res => (window.oldFarmingStake = res))
        .then(window.FORCEUPDATE)

    switch (page) {
        case 0:
            return (
                <>
                    <TitleComponent title="Exit OCT <-> wNEAR" />
                    <StepComponent
                        title="Unstake from OCT <-> wNEAR farm"
                        description={`You currently have ${
                            window.oldFarmingStake ?? "..."
                        } staked shares`}
                        completed={
                            window.REFRESHER[0] ??
                            (() => {
                                window.REFRESHER[0] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            setTimeout(
                                                () => resolve(false),
                                                1000
                                            )
                                        )
                                )
                                return window.REFRESHER[0]
                            })()
                        }
                        // action={}
                    />
                    <StepComponent
                        title="Remove liquidity from pool"
                        description="Remove liquidity from Ref-finance's OCT <-> wNEAR pool."
                        completed={
                            window.REFRESHER[1] ??
                            (() => {
                                window.REFRESHER[1] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            setTimeout(
                                                () => resolve(false),
                                                5000
                                            )
                                        ),
                                    10000
                                )
                                return window.REFRESHER[1]
                            })()
                        }
                        // action={}
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
