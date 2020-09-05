import {storage} from '../../services/generic/storage'
import {AccessType, IPermissionManaged, PrivilegeViolationException} from '../../services/generic/privilege-service'
import {IRatable, IReadOptions, IReadResult} from "../../lib/common-generic-types";
import {User} from "../../model/generic-entities/user-entity";
import {getFriends, getUserPhoto} from "../../lib/facebook-api";
import {confirmPhoneNumberChange, initializePhoneNumberChange} from "../../services/generic/user-notification-service";

import * as resetPasswordService from '../../services/generic/reset-password-service'
import {addClientLogReport, journal, LoggedException} from "../../services/generic/logger";
import {PermissionGroup} from "../../model/generic-entities/permission-group";
import {ISession} from "../../services/generic/session-service";
import {checkPermission, softCheckPermission} from "./controllers-utils";
import {ratingService} from "../../services/generic/rating-service";
import {userListIsPublic} from "../../config/app-config";
import {FeedbackService} from "../../services/generic/feedback-service";
import {AbstractEntity} from "../../model/generic-entities/abstract-entity";
import {getOntology} from "../../model/model-manager";
import {Notification} from "../../model/generic-entities/notification-entity";
import {emitMessage} from "../../services/generic/managed-notification-service";
import Boom = require("boom");


export const userController = {

    /**
     * Note that opt.projection is overridden in the function
     * @param session
     * @param opt
     */
    async getAllUsers(session, opt: IReadOptions): Promise<IReadResult> {

        if (!userListIsPublic)
            await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.ShallowRead)
        const adminLevel = await softCheckPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.Manage)
        opt.projection = ['name', 'joined', 'pictureUrl', 'gender', 'country', 'lastActive']
        if (adminLevel)
            opt.projection.push('email', 'city', 'status.isActive', 'isAdmin')
        return (await storage.collectionForEntityType(User)).load(opt)
    },

    async findUser(query): Promise<User> {
        let _User = User
        let col = await storage.collectionForEntityType(_User)
        return <Promise<User>>col.findOne(query, ['_id', 'password', 'name', 'isAdmin', 'lastAction', 'email', 'profileFilled', 'facebookId', 'birthday', 'shortLink'])
    },

    async searchUsers(session, string: string, projection: string[]): Promise<Object> {

        if (!userListIsPublic && session !== 'tester' && (!session.userId))
            throw new PrivilegeViolationException(null, "user-list", AccessType.ShallowRead)

        let col = await storage.collectionForEntityType(User)

        const regex = new RegExp(string)
        let query = {
            $or: [
                {name: regex},
                {email: regex}
            ]
        };
        return col.findSome(query, {
            limit: 10,
            projection: projection || ['_id', 'name', 'pictureUrl', 'gender', 'country']
        })
    },

    async getSelfProfile(session) {
        if (!session.userId)
            return {}
        const projection = [
            "name", "email", "phone", "address", "city", "pictureUrl", "generalBio", "preferences",
            "friends", "joined", "birthday", "gender", 'country', 'isActive', 'realName']
        const user = await User.createFromDB(User, session.userId, ...projection)
        return user

    },


    async getPublicProfile(session: ISession, userId?: string) {
        const projection = ["name", "generalBio", "gender", 'pictureUrl', 'lastActive', '_created', 'country', 'birthday']
        const profile = await User.createFromDB(User, userId || session.userId, ...projection)
        profile['self'] = !userId || session && (session.userId === userId)
        return profile
    },

    async resetPasswordRequest(session, email: string) {
        return resetPasswordService.startProcess(email)
    },

    async updateUserPersonalData(session, userId, fields) {
        if (!userId || userId === "self")
            userId = session.userId
        let user = <User>await User.createFromDB(User, userId)
        if (session.userId && session.userId == userId) {
            const res = user.update(fields)
            journal(session.userId, "update-user", user, fields, res)
            return {
                userId,
                result: await res
            }

        } else
            throw new LoggedException('Attempt to modify another user!')
    },

    async updateUserPhoneNumber(session, userId, phone) {
        let user = <User>await User.createFromDB(User, userId || session.userId)
        if (session.userId && session.userId == user.id) {
            return initializePhoneNumberChange(user.id, phone)
        } else {
            return {
                error: "Attempt to modify another user's phone number!"
            }
        }
    },

    async confirmPhoneNumberChange(session, pin, phone) {
        return confirmPhoneNumberChange(pin, phone)
    },

    async getFriends(session) {
        if (session && session.data && session.data.fbAccessToken)
            return getFriends(session.data.fbAccessToken)
        else
            return {error: "No facebook access token"}
    },

    async resetProfilePicture(session, source: string) {
        let user = await User.createFromDB(session.userId, ['facebookId'])
        let pictureUrl
        if (source == 'facebook') {
            let fbId: string = await user.getField('facebookId')
            pictureUrl = await getUserPhoto(fbId)
        } else {
            pictureUrl = source
        }
        await user.update({pictureUrl})
        return {pictureUrl}
    },

    async changePassword(session, token: string, newPassword: string) {
        if (session && session.userId)
            return userController.updateUserPersonalData(session, "me", {password: newPassword})
        else
            return resetPasswordService.finalizeResetPassword(token, newPassword)
    },

    async getManagedObjects(session, userId: string, objectType: string, readOptions: IReadOptions): Promise<IReadResult> {

        const user = <User>await User.createFromDB(User, userId)

        if (user.id.toString() != session.userId.toString())
            // @ts-ignore
            await checkPermission(session, <IPermissionManaged>user, AccessType.DeepRead)

        return user.getManagedObjects(objectType, readOptions)
    },

    async writeToLog(session: ISession, data) {

        if (!session.userId)
            throw new LoggedException('Not logged in')

        return addClientLogReport(await session.getUser(), data)

    },

    async addUserDirectly(session, data) {

        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.AddItem)

        const newUser = <User>await User.createNew(User, data)
        return newUser
    },

    async subscribe(session: ISession, targetId: string, state: boolean): Promise<{ follows: boolean, followed: boolean, friend: boolean }> {

        if (!session.userId)
            throw Boom.unauthorized('Must be logged in in order to follow anything but your own tail')

        const user = await session.getUser()
        const target = <User>await User.createFromDB(User, targetId)
        const friendship = await user.getFriendship(target)
        const followedPred = friendship.followed
        if (state) {
            if (!followedPred) {
                const r1 = user.subscribe(target)
                journal(session, 'subscribed-to', target, {}, r1)
                await r1
            }

        } else {
            if (followedPred) {
                const r2 = user.unsubscribe(followedPred)
                journal(session, 'unsubscribed-to', target, {}, r2)
                await r2
            }
        }
        return user.getFriendship(target).then(f => {
            return {
                follows: !!f.follows,
                followed: !!f.followed,
                friend: f.friend
            }
        })
    },
    async getFriendship(session: ISession, sourceId: string, targetId: string) {

        if (!session.userId)
            return Boom.forbidden('must be logged in to ask that.')

        const sourceUser = <User>await User.createFromDB(User, sourceId)

        const friendship = await sourceUser.getFriendship(targetId)

        return {
            follows: !!friendship.follows,
            followed: !!friendship.followed,
            friend: friendship.friend
        }

    },
    async getSubscriptions(session: ISession, userId: string) {

        userId = userId || session.userId

        const user = <User>await User.createFromDB(User, userId)

        const [subscriptions, subscribers] = await Promise.all([user.getSubscriptions(), user.getSubscribers()])
        return {
            subscriptions,
            subscribers
        }

    },

    async getUserRatingEntry(session: ISession, userId: string | undefined, entityId: string, entityType: string) {

        userId = userId || session.userId
        const result = await ratingService.getUserRatingEntry(entityId, userId)
        return result || {}
    },

    async addRatingEntry(session: ISession, entry: {
        entityId: string,
        entityType: string,
        value: number,
        comment: string
    }) {
        if (!session.userId)
            throw Boom.unauthorized('Must be logged in in order to rate or comment')

        const entity = await AbstractEntity.createFromDB(getOntology().edcr(entry.entityType).clazz,
            entry.entityId, 'averageScore', 'ratingCount') as unknown as AbstractEntity & IRatable
        if (!entity)
            throw Boom.badData('No such entity')

        await checkPermission(session, entity, AccessType.Vote)
        const r = await ratingService.rateEntity(await session.getUser(), entity, entry.value, entry.comment)
        journal(session, 'rated', entity, {rating: entry.value, comment: entry.comment})

        return r
    },
    async submitFeedback(session: ISession, feedback: { type: string, text: string }) {
        const feedbackP = FeedbackService.submit(session, feedback.type, feedback.text)
        journal(session, 'sent-feedback', null, {}, feedbackP)
        return feedbackP
    },
    async getNotifications(session: ISession, includeUnread: boolean) {
        const user = await session.getUser() as User
        if (!user)
            throw Boom.badRequest('Must be logged in in order to read messages and notifications ')

        const notifications = await user.getNotifications(includeUnread)

        return Promise.all(notifications.map(n => n.fullDto()))
    },
    async getNotificationsCount(session: ISession) {
        const user = await session.getUser() as User
        if (!user)
            throw Boom.badRequest('Must be logged in in order to read messages and notifications ')

        const notifications = await user.getNotifications(false)
        return notifications.length

    },
    async setNotificationRead(session: ISession, id: string, isRead: boolean) {

        const notification = await Notification.createFromDB(Notification, id, "read")
        await checkPermission(session, notification, AccessType.DeepRead)
        await notification.update({read: isRead})
        const notificationCount = await this.getNotificationsCount(session)
        emitMessage(session, 'notification', {
            eventName: 'status-changed',
            entityId: id,
            notificationCount,
            isRead
        })
        return notificationCount
    },
    async removeNotification(session: ISession, id: string) {

        const notification = await Notification.createFromDB(Notification, id)
        await checkPermission(session, notification, AccessType.Delete)
        await notification.erase()
        const notificationCount = await this.getNotificationsCount(session)
        emitMessage(session, 'notification', {
            eventName: 'deleted',
            entityId: id,
            notificationCount
        })
        return notificationCount
    }
}

