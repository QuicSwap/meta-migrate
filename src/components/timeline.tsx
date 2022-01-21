import * as React from "react"
import Timeline from "@mui/lab/Timeline"
import TimelineItem from "@mui/lab/TimelineItem"
import TimelineSeparator from "@mui/lab/TimelineSeparator"
import TimelineConnector from "@mui/lab/TimelineConnector"
import TimelineContent from "@mui/lab/TimelineContent"
import TimelineDot from "@mui/lab/TimelineDot"
import { getPage, jumpTo } from "../utils/navigation"

function getColor(page: number): "grey" | "primary" | "success" {
    const currentPage = getPage()

    if (currentPage === page) return "primary"

    return "grey"
}

export default function TimelineComponent() {
    return (
        <Timeline
            sx={{
                alignItems: "end",
                "& > .MuiTimelineItem-root::before": {
                    flex: 0
                },
                "& > *": {
                    cursor: "pointer"
                }
            }}
            position="left"
        >
            <TimelineItem onClick={() => jumpTo(0)}>
                <TimelineSeparator>
                    <TimelineDot color={getColor(0)} />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>OLD POSITION</TimelineContent>
            </TimelineItem>
            <TimelineItem onClick={() => jumpTo(1)}>
                <TimelineSeparator>
                    <TimelineDot color={getColor(1)} />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>CONVERT</TimelineContent>
            </TimelineItem>
            <TimelineItem onClick={() => jumpTo(2)}>
                <TimelineSeparator>
                    <TimelineDot color={getColor(2)} />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>NEW POSITION</TimelineContent>
            </TimelineItem>
            <TimelineItem onClick={() => jumpTo(3)}>
                <TimelineSeparator>
                    <TimelineDot color={getColor(3)} />
                </TimelineSeparator>
                <TimelineContent>DONE</TimelineContent>
            </TimelineItem>
        </Timeline>
    )
}
