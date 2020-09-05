import {AbstractEntity} from "./abstract-entity";
import * as joi from "@hapi/joi"
import {User} from "./user-entity";
import {createPredicate} from "../model-manager";
import {trimObject} from "../../lib/utils";

export class Notification extends AbstractEntity {

    constructor(id) {
        super(id)
    }

    async getContainers(): Promise<AbstractEntity[]> {
        return [(await this.getTarget())]
    }

    static async create(target: User, eventName: string, relatedEntities: { [role: string]: AbstractEntity } = {}, message = '', variables: Object = {}): Promise<Notification> {

        const fields = trimObject({
            eventName, message, variables
        });
        const notification = <Notification>await Notification.createNew(Notification, fields)
        await createPredicate(target, 'got-notification', notification)
        for (let [role, entity] of Object.entries(relatedEntities)) {
            await createPredicate(notification, 'relates-to', entity, {role})
        }
        return notification
    }

    getTarget(): Promise<User> {
        return this.incomingPreds('got-notification', {peerType: 'User'})
            .then(ps => ps[0].peer as User)
    }

    static getTemplate() {
        return {
            eventName: joi.string(),
            message: joi.string().min(0).allow('').optional(),
            variables: null,
            read: false,
            sentInDigest: false
        }
    }

    // noinspection JSUnusedGlobalSymbols
    static initCollection(col) {

        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({_created: 1})
    }

    async fullDto<T>(options?: unknown): Promise<T> {
        const relatedEntitiesPreds = await this.outgoingPreds('relates-to', {projection: ['name', 'title']})
        const related = relatedEntitiesPreds.map(p => {
            return {
                role: p.payload.role,
                label: p.peer["title"] || p.peer["name"],
                entityId: p.targetId,
                entityType: p.targetType
            }

        })
        return {
            ...await super.fullDto(options) as T,
            related
        } as T;
    }

}


