import * as React from "react"
import { Button, Grid, Icon } from "@mui/material"
import { getPage, jumpTo } from "../utils/navigation"

export default function NavButtonComponent(props: {
    next?: boolean
    back?: boolean
}) {
    return (
        <Grid
            item
            sx={{
                mb: 4,
                width: 0.9,
                display: "flex",
                justifyContent: (props.next ? !props.back : props.back)
                    ? "space-between"
                    : "space-between"
            }}
        >
            {props.back ? (
                <Button
                    variant="outlined"
                    sx={{ borderRadius: "100px" }}
                    startIcon={<Icon>navigate_before</Icon>}
                    onClick={() => jumpTo(getPage() - 1)}
                >
                    BACK
                </Button>
            ) : (
                <div></div>
            )}
            {props.next ? (
                <Button
                    variant="outlined"
                    sx={{ borderRadius: "100px" }}
                    endIcon={<Icon>navigate_next</Icon>}
                    onClick={() => jumpTo(getPage() + 1)}
                >
                    NEXT
                </Button>
            ) : (
                <div></div>
            )}
        </Grid>
    )
}
