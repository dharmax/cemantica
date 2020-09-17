import {AbstractEntity, User} from "./abstract-and-user-entities";
import {createPredicate, predicatesBetween} from "./model-manager";

export interface IFlaggableMix<T extends AbstractEntity> {
    flag?: (user: User, type?: string, reason?: string) => Promise<boolean>

}

export function FlaggableMix<T extends AbstractEntity>(entity: T): IFlaggableMix<T> & T {

    return {
        ...entity,
        flag: flag.bind(entity)
    }

    async function flag(user: User, type = '', reason = ''): Promise<boolean> {

        const self = <T><unknown>this
        const previous = await predicatesBetween(user, this, false, 'flagged')
        if (previous.length)
            return false

        const res = await self.update({}, false, false, {
            $inc: {flags: 1}
        })
        await createPredicate(user, 'flagged', self, {type, reason})

        return true
    }
}