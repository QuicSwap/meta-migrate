import * as React from "react"
import Timeline from "@mui/lab/Timeline"
import TimelineItem from "@mui/lab/TimelineItem"
import TimelineSeparator from "@mui/lab/TimelineSeparator"
import TimelineConnector from "@mui/lab/TimelineConnector"
import TimelineContent from "@mui/lab/TimelineContent"
import TimelineDot from "@mui/lab/TimelineDot"

export default function TimelineComponent() {
    return (
        <Timeline 
            sx={{
                alignItems: "end",
                "& > .MuiTimelineItem-root::before" : {
                    flex: 0
                }
            }}
            position="left"
        >
            <TimelineItem>
                <TimelineSeparator>
                    <TimelineDot color="primary"/>
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>Remove LP</TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelineSeparator>
                    <TimelineDot />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>Convert</TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelineSeparator>
                    <TimelineDot />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>Deposit</TimelineContent>
            </TimelineItem>
            <TimelineItem>
                <TimelineSeparator>
                    <TimelineDot />
                </TimelineSeparator>
                <TimelineContent>Done</TimelineContent>
            </TimelineItem>
        </Timeline>
    )
}
