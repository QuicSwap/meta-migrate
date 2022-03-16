import { getFarmingStake } from "../../services/near"

const OLD_POOL_ID = 47
const NEW_POOL_ID = 1889

async function getOldFarmingStake(): Promise<string> {
    const stake_shares: string = await getFarmingStake(OLD_POOL_ID)
    return stake_shares
}

async function getNewFarmingStake(): Promise<string> {
    const stake_shares: string = await getFarmingStake(NEW_POOL_ID)
    return stake_shares
}

export { getOldFarmingStake, getNewFarmingStake }
