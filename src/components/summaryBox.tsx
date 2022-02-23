import { useState, useEffect } from "react"
import Box from "@mui/material/Box"
import { Grid, useTheme, Icon } from "@mui/material"
import OctopusLogo from "../public/octopus_logo.png"


export default function SummaryBox(props: { page: number }) {
    const theme = useTheme() as any
    const [percentage, setPercentage] = useState(29)
    useEffect(() => {
        async function getPercentage() {
            try {
                const requestMode: RequestMode = "no-cors"
                const getParams = {
                    mode: requestMode,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        Host: "app.ref.finance"
                    }
                }
                const refFarmsResponse: Response = await fetch(
                    "https://app.ref.finance/farms",
                    getParams
                )
                const html = await refFarmsResponse.text()
                var parser = new DOMParser()
                console.log(refFarmsResponse)
                var doc = parser.parseFromString(html, "text/html")
                const poolElement = doc.getElementById("1889")
                let percentage = 29
                if (poolElement) {
                    const percentageElement: HTMLElement =
                        poolElement.getElementsByClassName(
                            "text-xl"
                        )[1] as HTMLElement
                    alert(percentageElement.innerText)
                }
                alert(poolElement)
                setPercentage(40)
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
