import React from "react"
import ReactDOM from "react-dom/client"
import "destyle.css"
import "@/styles/globals.css"
import "@fontsource/ibm-plex-sans-jp/400.css"
import "@fontsource/ibm-plex-sans-jp/600.css"
import "@fontsource/ibm-plex-sans-jp/700.css"

import App from "@/App"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
