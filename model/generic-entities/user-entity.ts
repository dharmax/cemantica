import {AbstractEntity} from "./abstract-entity";
import {storage} from "../../services/generic/storage";
import {IReadOptions, ISubscriptionOptions} from "../../lib/common-generic-types";
import {AccessType, PrivilegeOwner, PrivilegeViolationException} from "../../services/generic/privilege-service";
import * as joi from '@hapi/joi'
import {createPredicate, findPredicates, Predicate, predicatesBetween} from "../model-manager";
import {Notification} from "./notification-entity";


export class User extends AbstractEntity {

    constructor(id) {
        super(id)
    }

    getContainers(): Promise<AbstractEntity[]> {
        return null
    }

    static async createFromFacebookId(facebookId): Promise<User> {
        let col = await storage.collectionForEntityType(User)
        return <User>await col.findOne({facebookId: facebookId}, ['name', 'pictureUrl'])
    }

    protected async makeName(): Promise<string> {
        return this.getField('email')
    }

    async customPermissionChecker(actor: PrivilegeOwner, entity: AbstractEntity, accessType: AccessType) {
        if (this.id !== entity.id)
            return "default"
        switch (accessType) {
            case AccessType.ShallowRead:
            case AccessType.DeepRead:
            case AccessType.PrivateRead:
            case AccessType.EditBasic:
            case AccessType.EditPrivate:
            case AccessType.ChangeItem:
            case AccessType.AddItem:
                return
            case AccessType.Admin:
            case AccessType.ChangePermission:
            case AccessType.Activate:
            case AccessType.Delete:
            case AccessType.Invite:
            case AccessType.Join:
                throw new PrivilegeViolationException(actor, entity, accessType)
            case AccessType.AddItemAdvanced:
            case AccessType.RemoveItem:
            case AccessType.Manage:
            case AccessType.Message:
            case AccessType.Attach:
            case AccessType.Subscribe:
            case AccessType.OperationA:
            case AccessType.OperationB:
            case AccessType.OperationC:
            case AccessType.OperationD:
                return "default"
        }
    }


    async isProfileFull(): Promise<boolean> {
        const mandatoryFields = ['phone', 'email', 'city', 'gender', 'birthday']
        await this.getFields(...mandatoryFields)
        return mandatoryFields.reduce((acc: true, item: any) => {
            return acc && item
        }, true)
    }

    async getManagedObjects(objectType: string, readOptions: IReadOptions) {
        return this.outgoingPredsPaging('has-role-in', {peerType: objectType}, readOptions)
    }

    static getTemplate() {
        return {
            name: null,
            realName: '',
            email: joi.string().email(),
            password: null,
            address: null,
            phone: null,
            city: null,
            country: 'USA',
            birthday: null,
            pictureUrl: null,
            generalBio: '',
            gender: 'female',
            isActive: true,
            lastActive: null,
            knownLanguages: ['en'],
            preferences: {
                useMetric: true,
                mainLanguage: "en",
                knownLanguages: ['en'],
                digestIntervalInDays: 1
            },
            suspensionStart: joi.date(),
            suspensionCause: joi.string(),
            suspensionEnd: joi.date(),
            adminComments: '',
            lastDigest: joi.date(),
            friends: [],
            isAdmin: false,
            joined: joi.date(),
        }
    }

    // noinspection JSUnusedGlobalSymbols
    static initCollection(col) {

        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({email: 1}, {unique: true})
        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({facebookId: 1},
            {
                unique: true,
                partialFilterExpression: {facebookId: {$type: "string"}}
            })

        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({lastActive: -1})

        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({googleId: 1},
            {
                unique: true,
                partialFilterExpression: {googleId: {$type: "string"}}
            })
    }

    async isSuspended() {

        /// check if the user is currently banned from posting. If we find that he was banned but the term was ended, we update the ban fields

        const fields = await this.getFields('suspensionEnd', 'suspensionStart')

        const endTime = fields.suspensionEnd as Date
        if (!endTime)
            return false
        if (endTime.getMilliseconds() < Date.now())
            return true

        await this.update({
            suspensionEnd: null,
            suspensionStart: null,
            suspensionCause: null
        })
        return false
    }

    async getFriendship(target: User | string, bidirectional = true) {

        const preds = await predicatesBetween(this, target, bidirectional)

        let followedPred = preds.find(p => p.predicateName === 'subscribes-to' && p.sourceId === this.id)
        let followsPred = preds.find(p => p.predicateName === 'subscribes-to' && p.targetId === this.id)
        return {
            follows: followsPred,
            followed: followedPred,
            friend: followsPred && followsPred.payload.friend
        }
    }

    async subscribe(target: AbstractEntity, options: ISubscriptionOptions = {getNotifications: true}) {
        return createPredicate(this, 'subscribes-to', target, options)
    }

    async unsubscribe(target: Predicate | AbstractEntity) {
        if (target instanceof AbstractEntity) {
            const preds = await findPredicates(false, 'subscribes-to', this.id, {peerId: target.id})
            if (preds && preds.length) {
                target = preds[0]
            } else
                return null
        }
        return target.erase()
    }

    async getSubscriptions(): Promise<AbstractEntity[]> {
        const preds = await this.outgoingPreds('subscribes-to', {projection: ['name', 'id', 'gender', 'pictureUrl']})
        return preds.map(p => p.peer)
    }

    async fullDto<T>(options?: unknown): Promise<T> {
        return {
            ...await super.fullDto(options),
            isSuspended: await this.isSuspended(),
            isProfileFull: await this.isProfileFull()
        } as unknown as T;
    }

    async getNotifications(includeUnread: boolean): Promise<Notification[]> {

        const notifications = await this.outgoingPreds('got-notification', {peerType: 'Notification'})
            .then(pList => pList.map(p => p.peer)) as Notification[]

        return includeUnread ? notifications : notifications.filter(n => !n["read"]);
    }

    static async findByEmail(email: string): Promise<User> {
        const col = await storage.collectionForEntityType(User)
        const user = await col.findOne({email}) as User
        return user
    }
}


