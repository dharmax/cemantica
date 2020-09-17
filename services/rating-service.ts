import {createPredicate, Predicate, predicatesBetween} from "../model/model-manager";
import {AbstractEntity, User} from "../model/generic-entities/abstract-entity";
import {managedNotificationService} from "./managed-notification-service";
import {IRatable} from "../lib/common-generic-types";

class RatingService {


    async getUserRatingEntry(entityId: string, userId: string): Promise<Predicate> {
        const ps = await predicatesBetween(userId, entityId, false, 'rated')
        return ps.length ? ps[0] : null
    }

    async changeEntry(entity: AbstractEntity & IRatable, ratingEntry: Predicate, value, comment): Promise<AbstractEntity & IRatable> {

        entity = entity || await ratingEntry.getTarget('averageScore', 'comment') as unknown as AbstractEntity & IRatable
        const oldValue = ratingEntry.payload.value

        await ratingEntry.change({value, comment})

        if (oldValue != value) {
            const oldAverage: number = await entity.getField('averageScore') || 0
            const count: number = await entity.getField('ratingCount')
            if (count > 1) {
                let newScoreWithout = (oldAverage * count - oldValue) / (count - 1)
                const averageScore = (value + newScoreWithout * (count - 1)) / count
                entity = await entity.update({averageScore})
            } else {
                entity = await entity.update({averageScore: value})
            }
        }

        // @ts-ignore
        return entity
    }

    async rateEntity(user: User, entity: AbstractEntity & IRatable, value: number, comment: string): Promise<AbstractEntity> {

        const oldEntry = await this.getUserRatingEntry(entity.id, user.id)
        if (oldEntry) {
            entity = await this.changeEntry(entity, oldEntry, value, comment)
            if (Date.now() - oldEntry.timestamp < 1000 * 360)
                return entity
        } else {
            let ratingCount = entity.ratingCount || 0
            const averageScore = (entity.averageScore * ratingCount + value) / ++ratingCount

            entity = await entity.update({
                ratingCount,
                averageScore
            })

            await createPredicate(user, 'rated', entity, {value, comment})
            // noinspection ES6MissingAwait
            managedNotificationService.notify(entity, 'rating', {by: user, subject: entity}, comment, {value})
        }
        return entity
    }


}

export const ratingService = new RatingService()