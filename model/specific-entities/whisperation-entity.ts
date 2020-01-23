import {AbstractEntity} from "../generic-entities/abstract-entity";
import {IWhisperation, WhisperationStatus} from "../../lib/common-specific-types";
import {User} from "../generic-entities/user-entity";
import {createPredicate} from "../model-manager";


export class Whisperation extends AbstractEntity {
    constructor(id) {
        super(id)
    }

    static getTemplate() {
        return <IWhisperation>{
            comment: '',
            featuringAs: null,
            flags: 0,
            items: [],
            adultOnly: false,
            lastUsed: null,
            status: WhisperationStatus.new,
            averageScore: null,
            ratingCount: 0,
        }
    }


    async getContainers(): Promise<AbstractEntity[]> {
        return []
    }

    static async create(param: { creator: User; items: string[] }) {
        const w = await super.createNew(Whisperation, {items: param.items})

        await createPredicate(w, 'proposed-by', param.creator)

        return w
    }

    async getWriter(): Promise<User> {
        return this.outgoingPreds('proposed-by', {projection: ['name']}).then(preds => <User>preds[0].peer)
    }

    async fullDto(): Promise<Object> {
        const result = await super.fullDto()

        const writer = await this.getWriter()

        return {
            ...result,
            writer
        }
    }

    static async getByWriter(writer: User) {
        const whisperations = await writer.incomingPreds('proposed-by', {peerType: 'Whisperation'})
            .then(res => res.map(p => {
                return p.peer.fullDto()
            }))
        return Promise.all(whisperations)
    }

    async getInterestedParties(eventType: string): Promise<User[]> {
        return [await this.getWriter()]
    }
}

export enum WhisperationEvents { rating, banned, flagged, used}