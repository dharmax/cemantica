import {AbstractEntity, User} from "./abstract-entity";
import {string} from "@hapi/joi";
import {ISession} from "../../services/session-service";
import {createPredicate} from "../model-manager";

export class UserFeedback extends AbstractEntity {
    static async create(session: ISession, type: string, text: string): Promise<UserFeedback> {
        const entity = await this.createNew(UserFeedback, {type, text, ip: session.ip}) as UserFeedback
        const user = await session.getUser()
        if (user)
            await createPredicate(entity, 'posted-by', user)
        return entity
    }

    static getTemplate() {
        return {
            type: string(),
            text: string(),
            ip: string()
        }
    }

    async getContainers(): Promise<AbstractEntity[]> {
        return [];
    }

    async getReporter(): Promise<User | string> {
        const p = await this.outgoingPreds('posted-by', {peerType: 'User'})
        return p && p.length && p[0].peer as User
    }
}