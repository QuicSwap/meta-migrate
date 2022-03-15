import { Box, Icon } from "@mui/material"
import { utils } from "near-api-js"
import * as React from "react"
import { ReactNode } from "react"
import { Refresh } from "../../utils/refresh"
import meme from "../../memes/2.gif"
import { Break, Description, LineSpacing, Loading, Note, Purple } from "../../components/description"
import { InputComponent, InputData } from "../../components/input"
import LocateComponent from "../../components/locate"
import NavButtonComponent from "../../components/navbuttons"
import StepComponent from "../../components/step"
import TitleComponent from "../../components/title"

let NEAR: {} = {}

let refresh: Refresh[] = []

export const steps: string[] = ["get wNEAR", "get META", "enter farm", "profit"]

export function getContent(page: number): ReactNode | null {
    switch (page) {
        case 0:
            // Define Inputs
            // -
            // Define Refresh
            refresh[0] ??= new Refresh(() => Promise.resolve(false))
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="NEAR -> wNEAR" step={1} />
                    <StepComponent
                        title={"Wrap NEAR"}
                        description={<Description>{}</Description>}
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
            refresh[1] ??= new Refresh(() => Promise.resolve(false))
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="wNEAR -> META" step={2} />
                    <StepComponent
                        title={"Buy META with wNEAR"}
                        description={<Description>{}</Description>}
                        completed={refresh[1]}
                        action={() => {}}
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 2:
            // Define Inputs
            // -
            // Define Refresh
            refresh[2] ??= new Refresh(() => Promise.resolve(false))
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="Enter wNEAR <-> META farm" step={3} />
                    <StepComponent
                        title={"Provide liquidity & farm."}
                        description={<Description>{}</Description>}
                        completed={refresh[2]}
                        action={() => {}}
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 3:
            // Define Inputs
            // -
            // Define Refresh
            refresh[3] ??= new Refresh(() => Promise.resolve(false))
            // Define Values
            // -
            return (
                <>
                    <TitleComponent title="Happy Farming!" />
                    <img src={meme} style={{ maxWidth: "50%" }} alt="meme" />
                    <NavButtonComponent back />
                </>
            )

        case 4:
            // Define Inputs
            // -
            // Define Refresh
            refresh[4] ??= new Refresh(() => Promise.resolve(false))
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
