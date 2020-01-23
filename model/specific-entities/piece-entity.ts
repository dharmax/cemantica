import {AbstractEntity} from "../generic-entities/abstract-entity";
import {IPiece, PieceStatus, PieceType} from "../../lib/common-specific-types";
import {User} from "../generic-entities/user-entity";
import {createPredicate} from "../model-manager";
import {Whisperation} from "./whisperation-entity";
import {PermissionGroup} from "../generic-entities/permission-group";
import {IFriendship} from "../../lib/common-generic-types";
import {AccessType, IPermissionManaged, PrivilegeOwner} from "../../services/generic/privilege-service";
import {counterService} from "../../services/generic/counter-service";
import {log} from "../../services/generic/logger";

export class Piece extends AbstractEntity {
    constructor(id) {
        super(id)
    }

    // noinspection JSUnusedGlobalSymbols
    static getTemplate() {
        return <IPiece>{
            text: '',
            flags: 0,
            adultOnly: false,
            type: PieceType.poem,
            language: 'en',
            status: PieceStatus[PieceStatus.draft],
            title: '',
            averageScore: null,
            edited: new Date(),
            ratingCount: 0,
            originalPublishDate: null,
            viewsCount: 0,
            lastViewed: null
        }
    }


    async getContainers(): Promise<AbstractEntity[]> {
        return [
            await PermissionGroup.getAdminsGroup(),
            await this.getWriter()
        ]
    }

    static async create(author: User, whisperation: Whisperation, data: IPiece) {

        const piece = await this.createNew(Piece, data)

        await createPredicate(piece, 'written-by', author)
        await createPredicate(piece, 'inspired-by', whisperation)

        return piece
    }

    async getWriter(): Promise<User> {
        const preds = await this.outgoingPreds('written-by', {projection: ['name']})
        return preds[0].peer as User
    }

    async getInterestedParties(eventType: string): Promise<User[]> {

        const writer = await this.getWriter()
        switch (PieceEvents[eventType]) {
            case PieceEvents.commented:
            case PieceEvents.banned:
            case PieceEvents.flagged:
            case PieceEvents.rated:
                return [writer]
            case PieceEvents.published:
                // @ts-ignore
                return writer.getSubscribers()
            case PieceEvents['posted']:
                // @ts-ignore
                return [writer, await writer.getSubscribers()]
            default:
                log.warn(`Unknown Piece event ${eventType}`)
                return []
        }
    }

    async getWhisperation(): Promise<Whisperation> {
        const preds = await this.outgoingPreds('inspired-by', {peerType: 'Whisperation'})
        return preds.length ? <Whisperation>preds[0].peer : null
    }

    async customPermissionChecker(actor: PrivilegeOwner, entity: IPermissionManaged, accessType: AccessType): Promise<void | string> {
        const writer = await this.getWriter()
        const owner = (writer.id === actor.id)
        switch (accessType) {
            case AccessType.Admin:
            case AccessType.ChangePermission:
                return 'default'
            default:
                return owner ? undefined : 'default'
        }
    }


    async fullDto(options?: { sample: true }): Promise<Object> {
        const result: any = await super.fullDto()
        if (options && options.sample) {
            result.sampleText = result.text.substr(0, 300)
            delete result.text
        }

        const [writer, whisperation, views] = await Promise.all([
            this.getWriter(),
            this.getWhisperation().then(w => w && w.fullDto()),
            counterService.getViewsFor(this.id, "read")
        ])
        return {
            ...result,
            writer,
            whisperation,
            views
        }
    }

    static async getByWriter(writer: User) {
        const piecesDtos = await writer.incomingPreds('written-by', {peerType: 'Piece'})
            .then(res => res.map(p => {
                return p.peer.fullDto({sample: true})
            }))
        return Promise.all(piecesDtos)
    }

    static async getByWhisperation(whisperation: Whisperation) {
        const piecesDtos = await whisperation.incomingPreds('inspired-by', {peerType: 'Piece'})
            .then(res => res.map(p => {
                return p.peer.fullDto({sample: true})
            }))
        return Promise.all(piecesDtos)
    }

    static async isVisibleTo(p: IPiece, user: User, userCache) {
        switch (PieceStatus[p.status]) {
            case PieceStatus.published:
                return true
            case PieceStatus.banned:
            case PieceStatus.hidden:
            case PieceStatus.draft:
                return false
            case PieceStatus.private:
                return user && (await getFriendship(user.id)).friend
            case PieceStatus.limited:
                return user && (await getFriendship(user.id)).followed && (await getFriendship(user.id)).follows
        }
        return false

        async function getFriendship(writerId): Promise<IFriendship> {
            if (!userCache[writerId]) {
                const writer = <User>await User.createFromDB(User, writerId)
                const friendship = await writer.getFriendship(user.id)
                userCache[writerId] = writer
                writer['friendship'] = friendship
            }
            return userCache[writerId].friendship
        }
    }

    async changeStatus(status: PieceStatus) {

        if (status === PieceStatus.published) {
            if (await this.getField('originalPublishDate'))
                return this.update({status})
            return this.update({
                status,
                originalPublishDate: new Date()
            })
        }

        return this.update({status})
    }
}

export enum PieceEvents { rated, banned, flagged, commented, published, 'posted'}