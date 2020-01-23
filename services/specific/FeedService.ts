import {User} from "../../model/generic-entities/user-entity";
import {queryJournal} from "../generic/logger";
import {Collection} from "../generic/storage";
import {AbstractEntity} from "../../model/generic-entities/abstract-entity";


class FeedService {
    private collection: Collection

    constructor() {
    }

    async getRecent(from: number, count: number) {

        const journalEntries = (await queryJournal({
            action: {
                $in: ['piece-created', 'whisperation-created', 'piece-published',
                    'subscribed-to', 'rated']
            }
        }))

        const userCache = {}

        return await Promise.all(journalEntries.map(async e => {

            const user = await getUser(e.userId)
            const targetUser = e.entityType === 'User' && await getUser(e.entityId)

            let targetName = targetUser.name || e.data.title;
            if (!targetName) {
                const entity: any = await AbstractEntity.createFromDB(e.entityType, e.entityId, 'title', 'name')
                targetName = entity.name || entity.title
            }
            return {
                actorPictureUrl: user.pictureUrl,
                actorId: user.id,
                actorName: user.name,
                actorGender: user.gender,
                operation: e.action,
                targetType: e.entityType,
                targetId: e.entityId,
                targetName,
                extra: e.action === 'rated' && e.data.rating,
                time: e.time
            }
        }))


        async function getUser(uid) {
            if (!userCache[uid]) {
                const user = <User>await User.createFromDB(User, uid, 'pictureUrl', 'name', 'gender')
                userCache[uid] = user
            }
            return userCache[uid]
        }

    }
}

export const feedService = new FeedService()


