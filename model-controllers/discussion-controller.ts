import {ISession} from "../services/session-service";
import {IReadOptions, IReadResult} from "../lib/common-generic-types";
import {loadEntityById} from "../model/model-manager";
import {AbstractEntity} from "../model/generic-entities/abstract-entity";
import {checkPermission} from "../lib/controllers-utils";
import {AccessType} from "../services/privilege-service";
import {Discussion} from "../model/generic-entities/discussion-entity";
import {journal} from "../services/logger";
import {managedNotificationService} from "../services/managed-notification-service";
import {ConfigurationEntity} from "../model/generic-entities/configuration-entity";

export const discussionController = {

    async load(session: ISession, readOptions: IReadOptions, rootEntityId: string): Promise<IReadResult> {

        const rootEntity: AbstractEntity = await loadEntityById(rootEntityId)

        await checkPermission(session, rootEntity, AccessType.ShallowRead)

        const discussions = await rootEntity.incomingPredsPaging('discusses', {peerType: 'Discussion'}, readOptions)
        discussions.items.forEach(i => {
                if (!i || !i['posted-by'] || !i['posted-by'].length)
                    return
                const peer = i['posted-by'][0].peerEntity
                i.postedBy = {
                    id: peer.id,
                    name: peer.name
                }
                delete i['posted-by']
            }
        )
        return discussions

    },
    async getCommunityDiscussionRootId(session) {
        const e = await ConfigurationEntity.getConfigurationEntity()
        return {id: e.id}
    },
    async post(session: ISession, rootEntityId, title, body, type, extra) {
        const rootEntity: AbstractEntity = await loadEntityById(rootEntityId)

        await checkPermission(session, rootEntity, AccessType.Comment)

        const user = await session.getUser();
        const newPostP = Discussion.addPost(user, rootEntity, {
            title,
            body,
            type,
            typeSpecificFields: extra
        })

        journal(session, 'posted', rootEntity, {title}, newPostP)
        const newPost = await newPostP
        // noinspection ES6MissingAwait
        managedNotificationService.notify(rootEntity, 'posted', {by: user, newPost}, "There's a new post")

        return newPost
    }
}