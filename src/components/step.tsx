import * as React from "react"
import { Grid, Button, Box } from "@mui/material"
import { Call } from "../utils/call"

export default function StepComponent(props: {
    title: string
    description: string
    active: boolean
    action?: Call
}) {
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
            <Grid
                item
                xs={8}
            >
                <b>{ props.title }</b><br />
                {props.description}
            </Grid>
            <Grid item>
                <Button
                    variant="contained"
                    sx={{
                        borderRadius: "100px"
                    }}
                    disabled={!props.active}
                >
                    RUN
                </Button>
            </Grid>
        </Grid>
    )
}
