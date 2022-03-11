import { Icon } from "@mui/material"
import { useTheme } from "@mui/styles"

const Description = (props: { children: any }) => (
    <div
        style={{
            display: "flex",
            flexFlow: "row wrap",
            alignItems: "baseline",
            whiteSpace: "break-spaces"
        }}
    >
        {props.children}
    </div>
)

const Break = () => <div style={{ width: "100%" }} />

const LineSpacing = () => <div style={{ width: "100%", height: "0.5em" }} />

const Warning = (props: { children: any }) => {
    const theme = useTheme() as any
    return (
        <span
            style={{
                display: "flex",
                flexFlow: "row wrap",
                color: theme.palette.warning.main,
                fontWeight: "bold",
                marginTop: "8px"
            }}
        >
            <Icon>warning_amber</Icon> {props.children}
        </span>
    )
}

const Purple = (props: { children: any }) => {
    const theme = useTheme() as any
    return (
        <span
            style={{
                color: theme.palette.primary.main,
                fontWeight: "bold"
            }}
        >
            {props.children}
        </span>
    )
}

const Note = (props: { children: any }) => {
    return (
        <span
            style={{
                fontWeight: "lighter",
                fontSize: "small",
                opacity: 0.5,
                paddingTop: "8px"
            }}
        >
            {props.children}
        </span>
    )
}

const Loading = (
    condition: boolean,
    value: (string | undefined)[] | (string | undefined),
    apply: (s: string) => string = s => s
): string[] | string => {
    return typeof value === "object"
        ? value.map(v => condition && v ? apply(v) : "...")
        : condition && value ? apply(value) : "..." 
}

export { Description, Break, LineSpacing, Warning, Purple, Note, Loading }
