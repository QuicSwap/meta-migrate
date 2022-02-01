import * as React from "react"
import { Grid, Button, Icon, SxProps } from "@mui/material"
import { Refresh } from "../utils/refresh"

function getState(completed: boolean | null, denied?: boolean) {
    if (window?.account?.accountId === undefined) return "SIGN IN TO RUN"
    else if (completed === true) return <Icon>done</Icon>
    else if (denied !== undefined && denied) return <Icon>block</Icon>
    else if (completed === false) return "RUN"
    else return "..."
}

export default function StepComponent(props: {
    sx?: SxProps
    title: string
    description: any
    completed: Refresh
    denied?: boolean
    hide?: Refresh
    action?: () => void
}) {
    const completed = props.completed.getResult()
    const hide = props?.hide?.getResult() ?? false

    if (hide !== false) return <></>

    return (
        <Grid
            container
            item
            sx={{
                bgcolor: "background.default",
                borderRadius: "8px",
                flex: 1,
                mb: 4,
                ...props.sx
            }}
            direction="row"
            justifyContent="space-evenly"
            alignItems="center"
        >
            <Grid item xs={8}>
                <b>{props.title}</b>
                <br />
                {props.description}
            </Grid>
            <Grid item xs={1}>
                <Button
                    variant="contained"
                    sx={{
                        borderRadius: "100px"
                    }}
                    disabled={completed !== false || props.denied}
                    onClick={props?.action}
                >
                    {getState(completed, props.denied)}
                </Button>
            </Grid>
        </Grid>
    )
}
