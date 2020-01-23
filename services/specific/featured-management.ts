import {FeaturingRole, IWhisperation, WhisperationStatus} from "../../lib/common-specific-types";
import {storage} from "../generic/storage";
import {Whisperation} from "../../model/specific-entities/whisperation-entity";


let FeaturedCache: IWhisperation[] = null,
    lastCheck = 0

export const FeaturedManagementService = {

    async getFeaturedWhisperations(): Promise<IWhisperation[]> {

        if (!FeaturedCache || Date.now() - lastCheck > 1000 * 360 || FeaturedCache.length < 3) {
            FeaturedCache = await getFeaturedWhisperations()
            lastCheck = Date.now()
        }
        return FeaturedCache
    }
}

async function getFeaturedWhisperations(): Promise<IWhisperation[]> {

    const col = await storage.collectionForEntityType(Whisperation)
    const now = Date.now()

    let currentlyFeatured: Whisperation[] = await col.findSome({status: WhisperationStatus.featured}, {projection: ['featuringAs', 'items']})
        .then(featured => Promise.all(featured.map((w: Whisperation) => w.populateAll() as Promise<Whisperation>)))

    // find expired featured
    const expired = await currentlyFeatured.filter((f_: Whisperation) => {
        const f = f_ as unknown as IWhisperation
        const age = (now - f.lastUsed.getTime()) / 1000 / 60 / 60
        const expiration = getExpirationForFeature(f_, f.featuringAs)
        return age > expiration
    })
    // return expired featured to the pool
    await Promise.all(expired.map((w: Whisperation) => w.update({status: WhisperationStatus.approved})))

    const missingImportantFeatures = [FeaturingRole.monthly, FeaturingRole.weekly, FeaturingRole.daily]
        .filter(f => !currentlyFeatured.find(w => w['featuringAs'] === f))
    const missingFeaturedWhisperations = await autoSelectFeaturedWhisperations(...missingImportantFeatures)

    const featured = currentlyFeatured.concat(<Whisperation><unknown>missingFeaturedWhisperations)

    return featured as unknown as IWhisperation[]
}

async function autoSelectFeaturedWhisperations(...featuringType: FeaturingRole[]): Promise<IWhisperation[]> {
    const col = await storage.collectionForEntityType(Whisperation)

    // we'd randomly choose whisperations from those who were use the farthest back in time
    const chunk: Whisperation[] = await col.findSome({status: {$in: [WhisperationStatus.approved, WhisperationStatus.new]}}, {
        projection: ['lastUsed', 'featuringAs', 'status'],
        sort: {lastUsed: -1},
        limit: featuringType.length
    })

    // if we don't have enough approved candidates, use new, unapproved ones as additional candidates
    let candidates = chunk.filter(w => w['status'] == WhisperationStatus.approved)
    if (candidates.length < featuringType.length) {
        const newOnes = chunk.filter(w => w['status'] == WhisperationStatus.new)
        const cut = Math.min(newOnes.length, featuringType.length - candidates.length)
        candidates = candidates.concat(newOnes.slice(0, cut))
    }

    const result: IWhisperation[] = []

    for (let ft of featuringType) {
        if (!candidates.length)
            break;
        const index = Math.round(Math.random() * (candidates.length - 1))
        let selectedWhisperation = candidates.splice(index, 1)[0]
        selectedWhisperation = await selectedWhisperation.update({
            featuringAs: ft,
            status: WhisperationStatus.featured,
            lastUsed: new Date()
        })
        result.push(await selectedWhisperation.fullDto() as IWhisperation)
    }

    return result
}


function getExpirationForFeature(whisperation: Whisperation, role: FeaturingRole): number {

    switch (role) {
        case FeaturingRole.daily:
            return 24
        case FeaturingRole.monthly:
            return 24 * 30
        case FeaturingRole.weekly:
            return 24 * 7
        case FeaturingRole.competition:
        case FeaturingRole.editor:
        case FeaturingRole.special:
            return 24 // temporary

    }

}