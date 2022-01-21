export function getPage(): number {
    const params = new URLSearchParams(document.location.search)
    const page = params.get("p") ?? "0"
    return parseInt(page!)
}

export function jumpTo(page: number): void {
    console.log("jumping to", page)
    const url = new URL(window.location.href)
    url.searchParams.set("p", page.toString())
    window.history.replaceState(null, "", url)
    window.FORCEUPDATE()
}
