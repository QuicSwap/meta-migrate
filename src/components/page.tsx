import { Grid, Paper } from "@mui/material"
import * as React from "react"
import { ReactNode } from "react"
import NavButtonComponent from "./navbuttons"
import StepComponent from "./step"
import TitleComponent from "./title"

function getContent(page: number): ReactNode | null {
    switch (page) {
        case 0:
            return (
                <>
                    <TitleComponent title="Remove Liquidity" />
                    <StepComponent
                        title="Remove liquidity from farm"
                        description="Remove liquidity from Ref-finance's OCT <-> wNEAR farm."
                        active={true}
                        // action={}
                    />
                    <StepComponent
                        title="Remove liquidity from pool"
                        description="Remove liquidity from Ref-finance's OCT <-> wNEAR pool."
                        active={true}
                        // action={}
                    />
                    <NavButtonComponent next />
                </>
            );

        case 1:
            return (
                <>
                    <TitleComponent title="Convert Assets" />
                    <StepComponent
                        title="wNEAR -> stNEAR"
                        description="Convert wNEAR to NEAR to stNEAR"
                        active={true}
                        // action={}
                    />
                    <NavButtonComponent next back />
                </>
            );

        case 2:
            return (
                <>
                    <TitleComponent title="reDeposit Funds" />
                    <StepComponent
                        title="Add liquidity to pool"
                        description="Deposit liquidity at OCT <-> stNEAR pool"
                        active={true}
                        // action={}
                    />
                    <StepComponent
                        title="Add liquidity to farm"
                        description="Deposit liquidity at OCT <-> stNEAR farm"
                        active={true}
                        // action={}
                    />
                    <NavButtonComponent next back />
                </>
            );

        case 3:
            return (
                <>
                    <TitleComponent title="DONE!1!1111!!" />
                </>
            );

        default:
            return (
                <StepComponent
                    title="Something went wrong"
                    description="Try to clear site data"
                    active={true}
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
