import { ReactNode } from "react"
import * as MigrateToOCTFarm from "./migrate-to-oct-farm/content"

type recipe = {
    id: number,
    title: string,
    description: string,
    content: (page: number) => ReactNode | null
}

const recipes: recipe[] = [
    {
        id: 0,
        title: "Migrate wNEAR <-> OCT farm to stNEAR <-> OCT farm",
        description: "Get 35% APY!",
        content: MigrateToOCTFarm.getContent
    }
]

export { recipes }
