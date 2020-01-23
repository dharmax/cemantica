import {SortSpec, StoreApi} from "../lib/api-helper";
import {Language} from "../lib/locale";

interface ViewConfig {
    sort: SortSpec
    filter: {
        languages: Set<Language>
        followersOnly: boolean

    }
}

class UserStore extends StoreApi {

    constructor() {
        super('users')
    }

    async getMyProfile() {
        return this.get('myProfile')
    }

    async getPublicProfile(shortLink: string) {
        return this.get(['publicProfile', shortLink])
    }

    async updateMe(fields) {
        return super.update('self', fields)
    }

    async resetPassword(email: string) {
        return super.operation('resetPassword', {email})
    }

    async changePassword(token: string, password: string) {

        return super.operation('changePassword', {newPassword: password, token},)
    }

    async getViewConfig(): Promise<ViewConfig> {
        const localSetting = localStorage.viewConfig;
        let viewConf
        try {
            viewConf = localSetting && JSON.parse(localSetting)
        } catch (e) {
            viewConf = null
        }
        if (!viewConf) {
            const profile = await this.getMyProfile()
            viewConf = profile.viewConfig || getDefaultViewConfig(profile)
            viewConf && (localStorage.viewConfig = JSON.stringify(viewConf))
        }
        return viewConf
    }

    async setFollow(writerId: string, follow: boolean) {
        return this.operation('subscribe', {user: writerId, state: follow})
    }

    async getFriendship(sourceId: string, targetId: string): Promise<{ follow: boolean, follows: boolean, friend: boolean }> {
        return this.get('friendship', {sourceId, targetId})
    }

    async getFellowship(userId?: string) {
        return this.get('subscriptions', userId ? {userId} : undefined)
    }

    getRatingForEntity(entityId: string, entityType: string, userId?: string) {
        return userId ? this.get('rating', {entityId, userId, entityType})
            : this.get('rating', {entityId, entityType})
    }

    rateEntity(entityId: string, entityType: string, value: any, comment: string = '') {
        return this.operation('rate', {entityId, value, comment, entityType})
    }

    isNewVisitor() {
        return !localStorage['oldVisitor']
    }

    setNewVisitor(on) {
        if (!on)
            localStorage['oldVisitor'] = true
        else
            delete localStorage['oldVisitor']
    }

    sendFeedback(fields: { type: string, text: string }) {
        return this.operation('feedback', fields)
    }

    hasNotifications() {
        return this.get(['notifications', 'count'])
    }

    async getNotifications(includingUnread: boolean) {
        return this.get('notifications', {includingUnread})
    }

    async setRead(notificationId: string, isRead = true) {
        const newCount = await this.operation('notifications', {isRead}, 'read', notificationId)
    }

    deleteNotification(notificationId: string) {
        return this.remove(notificationId, 'notifications')
    }
}

export const userStore = new UserStore()

function getDefaultViewConfig(profile: Object) {

    return {
        pageSize: 20
    }

}