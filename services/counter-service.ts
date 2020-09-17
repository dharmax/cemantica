import {storage} from "./storage";
import {ISession} from "./session-service";
import {stringHash} from "../lib/utils";
import {AbstractEntity} from "../model/generic-entities/abstract-entity";


const UpdateOperationsDictionary = {
    read: (entity: AbstractEntity) => {
        return entity.update({lastViewed: new Date()}, undefined, undefined,
            {$inc: {viewsCount: 1}})
    }
}

class CounterService {


    private async getCollection() {
        return storage.collection('counting', c => {
            // noinspection JSIgnoredPromiseFromCall
            c.ensureIndex({key: 1}, {unique: true})
            // noinspection JSIgnoredPromiseFromCall
            c.ensureIndex({entityId: 1, operationName: 1}, {unique: false})

        })
    }

    async getViewsFor(entityId: string, operationName: string) {
        const col = await this.getCollection()
        return col.count({entityId, operationName})
    }

    async increaseCountUnique(entity: AbstractEntity, session: ISession, operationName: string) {
        const col = await this.getCollection()

        const key = stringHash(entity.id + session.sessionId + operationName)

        try {
            await col.append({
                key,
                entityId: entity.id,
                operationName,
                userId: session.userId

            })
            const updateFunction = UpdateOperationsDictionary[operationName]
            updateFunction && (await updateFunction(entity))

        } catch {
            // ignore
        }
    }
}

export const counterService = new CounterService()