import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import reportWebVitals from "./reportWebVitals"
import App from "./App"
import * as buffer from "buffer"
;(window as any).Buffer = buffer.Buffer // https://github.com/isaacs/core-util-is/issues/27#issuecomment-878969583

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root")
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
