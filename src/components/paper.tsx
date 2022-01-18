import * as React from "react"
import { Grid, Paper, Button, Box } from "@mui/material";

export default function PaperComponent() {
    return (
        <Paper 
            sx={{
                width: 1,
                height: 1
            }}
            elevation={2}
        >
            <Grid
                container
                sx={{
                    width: 1,
                    height: 1,
                }}
                direction="row"
                justifyContent="space-evenly"
                alignItems="center"
                wrap="nowrap"
            >
                <Grid
                    container
                    sx={{
                        width: 1,
                        height: 1,
                    }}
                    direction="column"
                    justifyContent="space-evenly"
                    alignItems="center"
                    wrap="nowrap"
                >
                    <Grid 
                        item
                        xs={3}
                    >
                        <h1>TITLE</h1>
                    </Grid>
                    <Grid 
                        item
                        xs={5}
                        sx={{ 
                            overflowY: "scroll",
                            mb: 2
                        }}
                    >
                        <Box
                            sx={{
                                maxWidth: 0.5,
                                mx: "auto"
                            }}
                        >
                            A smol description or something like 
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                        </Box>
                    </Grid>
                    <Grid 
                        item
                        xs={2}
                    >
                        <Button
                            variant="contained"
                            sx={{
                                borderRadius: "100px"
                            }}
                        >
                            RUN
                        </Button>
                    </Grid>
                </Grid>
                <Grid
                    container
                    sx={{
                        width: 1,
                        height: 1,
                    }}
                    direction="column"
                    justifyContent="space-evenly"
                    alignItems="center"
                    wrap="nowrap"
                >
                    <Grid 
                        item
                        xs={3}
                    >
                        <h1>TITLE</h1>
                    </Grid>
                    <Grid 
                        item
                        xs={5}
                        sx={{ 
                            overflowY: "scroll",
                            mb: 2
                        }}
                    >
                        <Box
                            sx={{
                                maxWidth: 0.5,
                                mx: "auto"
                            }}
                        >
                            A smol description or something like 
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                            a smol description or something like
                        </Box>
                    </Grid>
                    <Grid 
                        item
                        xs={2}
                    >
                        <Button
                            variant="contained"
                            sx={{
                                borderRadius: "100px"
                            }}
                        >
                            RUN
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Paper>
    )
}
