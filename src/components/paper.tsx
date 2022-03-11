import { Paper } from "@mui/material"
import * as React from "react"
import { getPage } from "../utils/navigation"
import PageComponent from "./page"

export default function PaperComponent() {
    return (
        <Paper
            sx={{
                width: 1,
                height: "fit-content",
                minHeight: 1,
                mb: 4,
                display: "flex",
                "& > *": {
                    height: "unset !important"
                }
            }}
            elevation={2}
        >
            <PageComponent page={getPage()} />
        </Paper>
    )
}
