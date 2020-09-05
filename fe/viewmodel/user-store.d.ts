import { SortSpec, StoreApi } from "../lib/api-helper";
import { Language } from "../lib/locale";
interface ViewConfig {
    sort: SortSpec;
    filter: {
        languages: Set<Language>;
        followersOnly: boolean;
    };
}
declare class UserStore extends StoreApi {
    constructor();
    getMyProfile(): Promise<any>;
    getPublicProfile(shortLink: string): Promise<any>;
    updateMe(fields: any): Promise<any>;
    resetPassword(email: string): Promise<any>;
    changePassword(token: string, password: string): Promise<any>;
    getViewConfig(): Promise<ViewConfig>;
    setFollow(writerId: string, follow: boolean): Promise<any>;
    getFriendship(sourceId: string, targetId: string): Promise<{
        follow: boolean;
        follows: boolean;
        friend: boolean;
    }>;
    getFellowship(userId?: string): Promise<any>;
    getRatingForEntity(entityId: string, entityType: string, userId?: string): Promise<any>;
    rateEntity(entityId: string, entityType: string, value: any, comment?: string): Promise<any>;
    isNewVisitor(): boolean;
    setNewVisitor(on: any): void;
    sendFeedback(fields: {
        type: string;
        text: string;
    }): Promise<any>;
    hasNotifications(): Promise<any>;
    getNotifications(includingUnread: boolean): Promise<any>;
    setRead(notificationId: string, isRead?: boolean): Promise<void>;
    deleteNotification(notificationId: string): Promise<any>;
}
export declare const userStore: UserStore;
export {};
