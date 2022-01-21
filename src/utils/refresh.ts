window.REFRESHER = []

class Refresh {
    active: boolean | null = null

    constructor(query: () => Promise<boolean>, interval: number = 15000) {
        if (interval !== 0) {
            query()
                .then(res => (this.active = res))
                .then(window.FORCEUPDATE)
            setInterval(() => this.poll(query), interval)
        } else this.poll(query)
    }

    private poll(query: () => Promise<boolean>): void {
        this.active = null
        window.FORCEUPDATE()
        query()
            .then(res => (this.active = res))
            .then(window.FORCEUPDATE)
    }

    getResult(): boolean | null {
        return this.active
    }
}

export { Refresh }
