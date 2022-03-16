import { ReactNode } from "react"
import * as MigrateToOCTFarm from "./migrate-to-oct-farm/content"
import * as EnterStNEARMETAFarm from "./enter-stnear-meta-farm/content"
import * as EnterWNEARMETAFarm from "./enter-wnear-meta-farm/content"

type recipe = {
    id: number
    title: string
    description: string
    content: (page: number) => ReactNode | null
    steps: string[]
}

const recipes: recipe[] = [
    {
        id: 0,
        title: "Enter stNEAR <-> META farm",
        description: "Get 153% APY!",
        content: EnterStNEARMETAFarm.getContent,
        steps: EnterStNEARMETAFarm.steps
    },
    {
        id: 1,
        title: "Migrate wNEAR <-> OCT farm to stNEAR <-> OCT farm",
        description: "Get 35% APY!",
        content: MigrateToOCTFarm.getContent,
        steps: MigrateToOCTFarm.steps
    },
    {
        id: 2,
        title: "Enter wNEAR <-> META farm",
        description: "Get 27% APY!",
        content: EnterWNEARMETAFarm.getContent,
        steps: EnterWNEARMETAFarm.steps
    }
]

export { recipes }
