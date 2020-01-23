import {AbstractEntity} from "./abstract-entity";
import {createPredicate} from "../model-manager";
import {User} from "./user-entity";

/**
 * Discussion and a discussion post are the same entity type. It is simply a DAG structure
 */
export class Discussion extends AbstractEntity {

    static async addPost(user: User, rootEntity: AbstractEntity, data: any): Promise<Discussion> {
        const discussion = await this.createNew(Discussion, data) as Discussion

        await createPredicate(discussion, 'posted-by', user)
        await createPredicate(discussion, 'discusses', rootEntity)
        // @ts-ignore
        rootEntity.touch && rootEntity.touch()
        return discussion
    }

    static initCollection(col) {

        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex({touched: -1})
    }

    getWriter(): Promise<User> {
        return this.outgoingPreds('posted-by', {peerType: 'User'}).then(ps => ps[0].peer) as Promise<User>
    }

    async getInterestedParties(eventType: string): Promise<User[]> {

        const parties = await super.getInterestedParties(eventType) as User[]
        return parties.concat(await this.getWriter())
    }


    async getContainers(): Promise<AbstractEntity[]> {
        return [await this.getParent() || await this.getRootEntity()]
    }

    async getRootEntity(): Promise<AbstractEntity> {

        return this.outgoingPreds('discusses').then(ps => ps[0].getTarget())
    }

    async touch() {
        this.update({touched: new Date()})
        const re = await this.getRootEntity()
        // @ts-ignore
        return re.touch && re.touch()
    }

    static getTemplate() {
        return {
            title: '',
            body: '',
            touched: () => new Date(),
            type: PostTypes['Normal'],
            typeSpecificFields: {}
        }
    }

}

export enum PostTypes {
    Normal, Objection, Confirmation, Inquiry, Statement
}