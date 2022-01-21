import * as React from "react"
import { Grid } from "@mui/material"

export default function TitleComponent(props: { title: string }) {
    return (
        <Grid item xs={1}>
            <h1>{props.title}</h1>
        </Grid>
    )
}
