window.REFRESHER = []

class Refresh {
    active: boolean | null = null

    constructor(query: () => Promise<boolean>, interval: number = 15000) {
        if (interval !== 0) {
            window.nearInitPromise
                .then(query)
                .then((res: boolean) => (this.active = res))
                .then(window.updateApp)
            setInterval(() => this.poll(query), interval)
        } else window.nearInitPromise.then(() => this.poll(query))
    }

    private poll(query: () => Promise<boolean>): void {
        this.active = null
        window.updatePage()
        query()
            .then(res => (this.active = res))
            .then(window.updatePage)
    }

    getResult(): boolean | null {
        return this.active
    }
}

export { Refresh }
