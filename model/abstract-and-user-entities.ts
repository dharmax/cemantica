import {
    AccessType,
    assignRole,
    IPermissionManaged,
    log,
    LoggedException,
    PrivilegeOwner,
    PrivilegeViolationException,
    StandardFields,
    storage,
    unassignRole
} from "../services";
import {
    createPredicate,
    deleteAllEntityPredicates,
    findPredicates,
    getOntology,
    ISearchOptions,
    makeEntity,
    pagePredicates,
    Predicate,
    predicatesBetween
} from "./model-manager";
import {all, map, props} from 'bluebird'
import {IReadOptions, IReadResult, ISubscriptionOptions, processTemplate} from "../lib";
import {ProjectionItem, ProjectionPredicateItem} from "../routes/routing-utils";
import * as joi from "@hapi/joi";
import {Notification} from "./notification-entity";


export abstract class AbstractEntity implements IPermissionManaged {

    readonly id
    private _version: number
    private permissionOwners
    protected parent

    /**
     *
     * Optional non default name for the entities associated collection
     */
    // static readonly collectionName = 'PodCollection'


    protected constructor(id) {
        this.id = id
    }

    // noinspection JSUnusedGlobalSymbols
    equals(entity: AbstractEntity): boolean {
        return this === entity || this.id === entity.id || this.id.toString() == entity.id.toString()
    }

    abstract getContainers(): Promise<AbstractEntity[]>

    typeName() {
        return this.constructor.name
    }

    get descriptor() {
        return getOntology().edcr(this.typeName())
    }

    get version() {
        return this._version
    }

    static async createFromDB<T extends AbstractEntity>(clazz: Function | string, entityId: any, ...projection: ProjectionItem[]): Promise<T> {
        if (typeof clazz === 'string')
            clazz = getOntology().edcr(clazz).clazz
        if (!entityId)
            throw new LoggedException('No entity id!')
        let e = makeEntity(clazz, entityId)
        return e.populate(...projection)
    }

    get template() {
        const t = this.constructor['getTemplate']
        return t && t() || null
    }

    async getAssociatedCollection() {
        return storage.collectionForEntityType(this.constructor)
    }

    async getPermissionOwners(): Promise<{ role, userId, userInfo }[]> {
        return map(findPredicates(true, 'has-role-in', this.id, {
            peerType: 'User',
            projection: ['name', 'pictureUrl', 'city']
        }), async p => {
            return {
                role: p.payload,
                userId: p.sourceId,
                userInfo: await p.getSource('name', 'email')
            }
        })
    }

    static async createNew<T extends AbstractEntity>(clazz: Function, fields: Object, superSetAllowed = false, cutExtraFields = true): Promise<T> {
        const templateMethod = clazz['getTemplate']
        const template = templateMethod && templateMethod()
        fields = processTemplate(template, fields, superSetAllowed, cutExtraFields, clazz.name)
        const record = fields
        const col = await storage.collectionForEntityType(clazz)
        let id = await col.append(record)
        return <T>makeEntity(clazz, id, record)
    }

    /**
     * Updates the specific fields-values of this entity in the memory and the database. Uses optimistic locking.
     * @param fieldsToUpdate the object with the field to change and their new values
     * @param superSetAllowed set to true if you allow inclusion of fields that aren't in the Entity's template
     * @param cutExtraFields in case superSetAllowed is false, it tells the method whether to fail in case of extra fields or to just warn.
     * @return the updated entity (this) or null on failure
     */
    async update<T extends AbstractEntity>(fieldsToUpdate: Object, superSetAllowed = false, cutExtraFields = false, rawOperations = {}): Promise<T> {
        const col = await this.getAssociatedCollection()
        const fields = processTemplate(this.template, fieldsToUpdate, superSetAllowed, cutExtraFields, this.typeName(), true)
        const res = await col.updateDocument(this.id, fields, this._version, rawOperations)
        if (res) {
            Object.assign(this, fields, {_version: this._version + 1})
            // @ts-ignore
            return this
        }
        return null
    }

    /**
     * @return the explicit roles given to the actor on this entity
     * @param actor the actor
     */
    async getRolesForActor(actor: PrivilegeOwner): Promise<string[]> {

        if (!actor.id)
            return []
        const preds = <any[]>await findPredicates(false, 'has-role-in', actor.id, {
            peerId: this.id,
            peerType: this.typeName()
        })
        // noinspection UnnecessaryLocalVariableJS
        const roleNames: string[] = preds.map(p => p.payload)
        return roleNames
    }

    /**
     * @return the  roles given to the actor on this entity explicitly and by heredity
     * @param actor the actor
     * @param roles used internally; caller shouldn't use it.
     */
    async getRolesForActorRecursive(actor: PrivilegeOwner, roles = new Map<AbstractEntity, string[]>()): Promise<Map<AbstractEntity, string[]>> {

        roles.set(this, await this.getRolesForActor(actor))

        const containers = await this.getContainers()
        for (let c of containers) {
            await c.getRolesForActorRecursive(actor, roles)
        }

        return roles
    }

    /**
     * populate and returns the specific field's value
     * @param field field name
     */
    async getField<T>(field: string): Promise<T> {
        await this.getFields(field)
        return this[field]
    }

    /**
     * populate with the specified fields and return their values
     * @param fields the list of fields or non, for the automatic usage of the fields mentioned in the entity's template.
     * @return a map of the values requested
     */
    async getFields(...fields: string[]): Promise<{ [name: string]: any }> {
        const missingFields = fields.filter(f => !this[f])
        const gt = this.template
        if (gt) {
            const templateFieldNames = new Set(Object.keys(gt))
            for (let f of fields) {
                if (!templateFieldNames.has(f) && !StandardFields.includes(f))
                    log.warn(`Field ${f} doesn't appear in the template of ${this.typeName()} entity`)
            }
        }
        await this.populate(...missingFields)
        const values = fields.reduce((a, f) => {
            a[f] = this[f]
            return a
        }, {})
        return values
    }

    async refresh<T extends AbstractEntity>() {

        // @ts-ignore
        const e = await this.constructor.createFromDB(this.constructor, this.id, ...Object.keys(this))
        Object.assign(this, e)
        return this
    }

    async assignRole(roleName: string, user) {
        return assignRole(roleName, user, this)
    }

    populateAll<T extends AbstractEntity>(): Promise<T> {
        return this.populate(...Object.keys(this.template))
    }

    async fullDto<T>(options?: unknown): Promise<T> {
        const data = await this.getFields(...Object.keys(this.template), '_created', '_lastUpdate')
        data.id = this.id
        data._entityType = this.typeName()
        return data as T;
    }

    protected async populate<E extends AbstractEntity>(...projection: ProjectionItem[]): Promise<E> {
        const col = await this.getAssociatedCollection()
        const self = this
        const predicateProjections = projection && projection.filter(p => typeof p === 'object') as ProjectionPredicateItem[]
        let fieldsProjection = projection && projection.filter(p => typeof p === 'string') as string[]
        let results: any = await props({
            data: await col.findById(this.id, fieldsProjection && fieldsProjection.length && fieldsProjection || undefined),
            permissionOwners: self.permissionOwners || await this.getPermissionOwners()
        })
        if (!results.data)
            return undefined
        Object.assign(this, results.data)
        this.permissionOwners = results.permissionOwnersen
        await this.populateRelated(predicateProjections)

        // @ts-ignore
        return this
    }

    private async populateRelated(predicateSpecs: ProjectionPredicateItem[]): Promise<AbstractEntity> {
        for (let ps of predicateSpecs) {
            const preds = ps.in ?
                await this.incomingPreds(ps.pName, {projection: ps.projection as string[]})
                : await this.outgoingPreds(ps.pName, {projection: ps.projection as string[]})
            this[ps.pName] = preds
        }
        return this
    }

    async unassignRole(roleName: string, user) {
        return unassignRole(roleName, user, this)
    }

    /**
     * Truly deletes an entity along with the predicates connected to it. Use with caution.
     * @returns {Promise<{entityId: any}>}
     */
    async erase() {
        let col = await this.getAssociatedCollection()
        let deleteEntity = col.deleteById(this.id)
        await all([
            deleteAllEntityPredicates(this.id),
            deleteEntity
        ])
        return {
            entityId: this.id,
        }
    }

    /**
     * This method is part of the notification logic. The notification service uses it to see to whom to notify about
     * something.
     * @return the id-s of users which are interesting in events that happens to this specific entity
     * @param eventType the event type
     */
    async getInterestedParties(eventType: string): Promise<User[]> {

        // this is the default logic: it returns all the permission holders on the entities, per any eventType

        let userIds = (await this.getPermissionOwners()).map(po => po.userId)

        let containers = await this.getContainers()
        containers && containers.forEach(async c => userIds.push(...(await c.getInterestedParties(eventType))))

        return Promise.all(userIds.map(uid => <Promise<User>>AbstractEntity.createFromDB('User', uid)))
    }

    async outgoingPreds(predicateName: string, opts: ISearchOptions = {}): Promise<Predicate[]> {
        return findPredicates(false, predicateName, this.id, opts)
    }

    async incomingPreds(predicateName: string, opts: ISearchOptions = {}): Promise<Predicate[]> {
        return findPredicates(true, predicateName, this.id, opts)
    }

    async outgoingPredsPaging(predicateName: string, opts: ISearchOptions = {}, pagination: IReadOptions): Promise<IReadResult> {
        return pagePredicates(false, predicateName, this.id, opts, pagination)
    }


    async incomingPredsPaging(predicateName: string, opts: ISearchOptions = {}, pagination: IReadOptions): Promise<IReadResult> {
        return pagePredicates(true, predicateName, this.id, opts, pagination)
    }

    /**
     * This is a sophisticated value inheritance support. If the value is an object, it allow inner-field-level value inheritance
     * @param fieldName
     * @param accumulate - should it accumulate inner-fields for object value ?
     * @param childVal - inner use only
     */

    async getFieldRecursive(fieldName: string, accumulate = false, childVal = {}) {
        let val = await this.getField(fieldName)
        if (accumulate) {
            const parent = await this.getParent()
            val = Object.assign(val, childVal)
            return parent ? await parent.getFieldRecursive(fieldName, accumulate, val) : val

        } else {
            if (val)
                return val

            const parent = await this.getParent()
            return parent ? await parent.getFieldRecursive(fieldName, accumulate) : undefined
        }

    }

    protected async getParent<T extends AbstractEntity>(): Promise<T> {
        return this.parent || this.incomingPreds('parent-of').then(p => p.length && p[0].getSource()).then(t => this.parent = <T>t || undefined)
    }

    protected async getAllAncestors<T extends AbstractEntity>(): Promise<T[]> {

        const parent: T = <T>await this.getParent()
        if (!parent)
            return []
        return [parent].concat(<T[]>await parent.getAllAncestors())
    }

    async unsetParent() {
        return this.incomingPreds('parent-of').then(preds =>
            preds && Promise.all(preds.map(p => p.erase())))
    }

    async setParent<T extends AbstractEntity>(parent: T) {

        await this.unsetParent()

        // prevent circularity
        const parentAncestors = await parent.getAllAncestors()
        parentAncestors.forEach(entity => {
            if (entity.id === this.id)
                throw new LoggedException('Circular retailer parenthood attempted')
        })

        return createPredicate(parent, 'parent-of', this)
    }

    async query(_iDepth, _oDepth) {

        await this.fullDto()
        return populateConnections(this, _iDepth, _oDepth)

        async function populateConnections(entity: AbstractEntity, iDepth, oDepth) {
            if (iDepth) {
                const predicates: Predicate[] = await entity.incomingPreds(undefined, {peerType: '*'})
                for (const p of predicates)
                    p['peerEntity'] = await populateConnections(p.peer, iDepth - 1, 0)

                entity['_incoming'] = predicates
            }
            if (oDepth) {
                const predicates: Predicate[] = await entity.outgoingPreds(undefined, {peerType: '*'})
                for (const p of predicates)
                    p['peerEntity'] = await populateConnections(p.peer, 0, oDepth - 1)

                entity['_outgoing'] = predicates
            }

            return entity
        }
    }

    async getSubscribers() {
        const preds = await this.incomingPreds('subscribes-to', {
            peerType: 'User',
            projection: ['name', 'id', 'gender', 'pictureUrl']
        })
        return preds.map(p => <User>p.peer)
    }

}


export class User extends AbstractEntity {

    constructor(id) {
        super(id)
    }

    static async createFromFacebookId(facebookId): Promise<User> {
        let col = await storage.collectionForEntityType(User)
        return <User>await col.findOne({facebookId: facebookId}, ['name', 'pictureUrl'])
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

    static async findByEmail(email: string): Promise<User> {
        const col = await storage.collectionForEntityType(User)
        const user = await col.findOne({email}) as User
        return user
    }

    getContainers(): Promise<AbstractEntity[]> {
        return null
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

    protected async makeName(): Promise<string> {
        return this.getField('email')
    }
}
