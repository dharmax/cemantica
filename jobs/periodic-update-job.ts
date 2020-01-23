import {JobController, JobOperation, JobStatus} from "../services/generic/job-manager-service";
import {storage} from "../services/generic/storage";
import {User} from "../model/generic-entities/user-entity";
import {getTemplate, notifyUser} from "../services/generic/user-notification-service";
import {relativeTime} from "short-relative-time";
import {Piece} from "../model/specific-entities/piece-entity";
import {Whisperation} from "../model/specific-entities/whisperation-entity";
import {any, AnySchema} from "@hapi/joi";
import {PermissionGroup} from "../model/generic-entities/permission-group";
import {softCheckPermission} from "../model-controllers/generic/controllers-utils";
import {AccessType} from "../services/generic/privilege-service";
import {ISession} from "../services/generic/session-service";


class SendPeriodicUpdate extends JobOperation {

    get dataSchema(): AnySchema {
        return any()
    }

    protected description() {
        return 'sends email updates to all active users about their notifications and other site' +
            'related updates.'
    }

    execute(data, listener: (jc: JobController) => void): JobController {

        const controller = new JobController(listener)

        async function start() {

            const col = await storage.collectionForEntityType(User)
            const minIntervalDate = new Date(Date.now() - 1000 * 60 * 60 * 3)
            const query = {isActive: true, $or: [{lastDigest: {$exists: false}}, {lastDigest: {$lt: minIntervalDate}}]}
            const users = col.findGenerator(query, {projection: ['preferences', 'isActive', 'lastActive', 'gender', 'country', 'lastDigest', 'name']})
            const usersCount = await col.count(query)
            let userCounter = 0

            const now = new Date()

            for await (let _user of users) {
                const user = _user as User
                const requestedInterval = user['preferences'].digestIntervalInDays * 1000 * 60 * 60 * 24
                const lastDigest = new Date(user['lastDigest'])
                const interval = now.getTime() - lastDigest.getTime()
                controller.progress = 100 * userCounter / usersCount
                if (interval < requestedInterval)
                    continue

                if (controller.status === JobStatus.StopRequested) {
                    controller.status = JobStatus.Stopped
                    break
                }

                const updateData = await compileUserUpdate(user as User)

                await notifyUser(user, getTemplate('UserPeriodicUpdate'), updateData)

                await user.update({lastDigest: now})
            }
            controller.progress = 100
        }

        let error = null
        start().catch(e => {
            error = e;
            controller.status = JobStatus.Failed
        }).then(r => controller.status = JobStatus.Done)

        return controller
    }

    async allowed(user: User): Promise<boolean> {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        return softCheckPermission({userId: user.id} as ISession, adminGroup, AccessType.Manage)
    }
}

async function compileUserUpdate(user: User): Promise<Object> {

    /*
    the template:
        Hello {{realName}} !
        Last time you visited us was {{timeSinceLastVisit}} and since then you got {{numberOfNotifications}} notification and messages which you didn't see yet.

        Also, since the last time, {{numberOfNewPieces}} were written, {{numberOfNewWhisperations}} whisperations were contributed and {{numberOfNewMembers}}

     */
    const realName = await user.getField('name')
    const lastActive: Date = await user.getField('lastActive');
    return {
        realName,
        timeSinceLastVisit: relativeTime(lastActive),
        numberOfNotifications: await user.getNotifications(false).then(n => n.length),
        numberOfNewPieces: await (await createdSince(Piece))(),
        numberOfNewWhisperations: await (await createdSince(Whisperation))(),
        numberOfNewMembers: await (await createdSince(User))()
    }

    async function createdSince(entityType: Function): Promise<() => Promise<string>> {

        const col = await storage.collectionForEntityType(entityType)
        const since = lastActive
        return async function (): Promise<string> {
            const count = await col.count({_created: {$gt: since}})
            return count.toString()
        }

    }
}

export default new SendPeriodicUpdate()