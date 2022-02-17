import * as React from "react"
import Box from "@mui/material/Box"
import { Grid, useTheme, Icon } from "@mui/material"
import OctopusLogo from "../public/octopus_logo.png"
export default function SummaryBox() {
    const theme = useTheme() as any
    return (
        <Grid
            sx={{
                fontFamily: "Inter",
                fontStyle: "normal",

                textAlign: "center",

                color: "#000000",
                justifyContent: "center"
            }}
        >
            <Box sx={{ fontWeight: 800, fontSize: "63px", lineHeight: "75px" }}>
                Do you want 21% APY?
            </Box>
            <Box sx={{ fontWeight: "normal", fontSize: "28px" }}>
                <Box>Get now 11% APY by stNEAR and </Box>
                <Box>10% extra in the Farm!</Box>
            </Box>
            <Box component="span">
                <Box
                    sx={{
                        fontWeight: "bold",
                        fontSize: "30px",
                        lineHeight: "36px"
                    }}
                    component="span"
                >
                    The Octopus’ new Farm!{" "}
                </Box>
                <Box
                    component="span"
                    sx={{ marginTop: 1, justifyContent: "inline" }}
                >
                    <img src={OctopusLogo} alt=""></img>
                </Box>
            </Box>
        </Grid>
    )
}
