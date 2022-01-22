import * as React from "react"
import { Grid, Button, Icon } from "@mui/material"
import { Call } from "../utils/call"
import { Refresh } from "../utils/refresh"

function getState(completed: boolean | null) {
    if (completed === true) return <Icon>done</Icon>
    else if (completed === false) return "RUN"
    else return "..."
}

export default function StepComponent(props: {
    title: string
    description: string
    completed: Refresh
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
                mb: 4
            }}
            direction="row"
            justifyContent="space-evenly"
            alignItems="center"
        >
            <Grid item xs={8}>
                <b>{props.title}</b>
                <br />
                {props.description.split("#").map((t, i) => (
                    <span
                        style={
                            i % 2 === 1
                                ? { color: "#8542eb", fontWeight: "bold" }
                                : {}
                        }
                        key={i}
                    >
                        {t}
                    </span>
                ))}
            </Grid>
            <Grid item>
                <Button
                    variant="contained"
                    sx={{
                        borderRadius: "100px"
                    }}
                    disabled={completed !== false}
                    onClick={props?.action}
                >
                    {getState(completed)}
                </Button>
            </Grid>
        </Grid>
    )
}
