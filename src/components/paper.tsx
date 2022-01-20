import { Paper } from "@mui/material";
import * as React from "react"
import { getPage } from "../utils/navigation";
import PageComponent from "./page"

export default function PaperComponent() {
    return (
        <Paper
            sx={{
                width: 1,
                height: 1
            }}
            elevation={2}
        >
            <PageComponent page={ getPage() } />
        </Paper>
    )
}
