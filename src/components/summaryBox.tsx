import { useState, useEffect } from "react"
import Box from "@mui/material/Box"
import { Grid, useTheme, Icon } from "@mui/material"
import OctopusLogo from "../public/octopus_logo.png"
// const NoCorsProxy = require("no-cors-proxy")
// const port = 3000
// const host = "localhost"
const url = "http://app.ref.finance/farms"

export default function SummaryBox(props: { page: number }) {
    const theme = useTheme() as any
    const [percentage, setPercentage] = useState(29)

    async function getFarmAPR(): Promise<string> {
        const narwalletsResponse: Response = await fetch(
            "https://validators.narwallets.com/metrics_json"
        )
        const jsonResponse = await narwalletsResponse.json()
        const apr = jsonResponse.ref_oct_st_near_apr
        console.log(apr)
        return jsonResponse.ref_oct_st_near_apr
    }
    useEffect(() => {
        async function getPercentage() {
            try {
                let percentage = Number(await getFarmAPR())
                if (isNaN(percentage) || percentage == 0) {
                    percentage = 25
                }
                setPercentage(percentage)
            } catch (ex) {
                alert("Error")
            }
        }
        getPercentage()
    }, [percentage])
    return props.page > 0 ? (
        <></>
    ) : (
        <Grid
            className="title"
            sx={{
                fontFamily: "Inter",
                fontStyle: "normal",

                textAlign: "center",

                color: "#000000",
                justifyContent: "center"
            }}
        >
            <Box sx={{ fontWeight: 800, fontSize: "63px", lineHeight: "75px" }}>
                Go from 0% to {11 + percentage}% APY
            </Box>
            <Box sx={{ fontWeight: "normal", fontSize: "28px" }}>
                <Box>Get now 11% by stNEAR and </Box>
                <Box>{percentage}% extra in the Farm!</Box>
            </Box>
            <Box component="span">
                <Box
                    sx={{
                        fontWeight: "bold",
                        fontSize: "30px",
                        lineHeight: "36px",
                        verticalAlign: "middle"
                    }}
                    component="span"
                >
                    The Octopus’ new Farm!{" "}
                </Box>
                <Box
                    component="span"
                    sx={{
                        paddingTop: 5,
                        justifyContent: "center",
                        verticalAlign: "middle"
                    }}
                >
                    <img src={OctopusLogo} alt=""></img>
                </Box>
            </Box>
        </Grid>
    )
}
