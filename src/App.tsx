import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles"
import TimelineComponent from "./components/timeline"
import PaperComponent from "./components/paper"
import { Grid } from "@mui/material";

declare module "@mui/material/styles/createPalette" {
    interface Palette {
        type: string
    }
    interface PaletteOptions {
        type?: string
    }
}

const theme = createTheme({
    palette: {
        type: "light",
        primary: {
            main: "#8542eb",
            light: "#f6f2fd",
            dark: "rgba(133,66,235,0.4392156862745098)"
        },
        secondary: {
            main: "#4bc7ef"
        },
        background: {
            default: "#f8f9fa",
            paper: "#ffffff"
        },
        warning: {
            main: "#f9ba37"
        },
        success: {
            main: "#5ace84"
        },
        info: {
            main: "#4bc7ef"
        }
    },
    typography: {
        fontFamily: "Inter"
    },
    shape: {
        borderRadius: 12
    },
    spacing: 8
})

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Grid
                container
                sx={{
                    width: 1,
                    height: 1,
                }}
                direction="row"
                justifyContent="center"
                alignItems="center"
            >
                <Grid 
                    item
                    xs={2}
                >
                    <TimelineComponent />
                </Grid>
                <Grid
                    item 
                    xs={6}
                    sx={{
                        height: 0.5
                    }}
                >
                    <PaperComponent />
                </Grid>
                <Grid 
                    item
                    xs={2}
                />
            </Grid>
        </ThemeProvider>
    )
}