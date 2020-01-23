import {ISession} from "../../services/generic/session-service";
import {IFriendship, IReadOptions, IReadResult} from "../../lib/common-generic-types";
import {Piece} from "../../model/specific-entities/piece-entity";
import {storage} from "../../services/generic/storage";
import {IPiece, PieceListingType, PieceStatus} from "../../lib/common-specific-types";
import {Whisperation} from "../../model/specific-entities/whisperation-entity";
import {User} from "../../model/generic-entities/user-entity";
import * as sanitizeHtml from 'sanitize-html'
import {checkPermission, softCheckPermission} from "../generic/controllers-utils";
import {AccessType} from "../../services/generic/privilege-service";
import {journal} from "../../services/generic/logger";
import {counterService} from "../../services/generic/counter-service";
import {FlaggableMix} from "../../model/generic-entities/flaggable-mix";
import {managedNotificationService} from "../../services/generic/managed-notification-service";
import Boom = require("boom");

export const piecesController = {

    async load(session: ISession, readOptions: IReadOptions, type: string): Promise<IReadResult> {

        const col = await storage.collectionForEntityType(Piece)

        let pieces: IPiece[]
        switch (PieceListingType[type]) {
            case PieceListingType.general:
                return col.load(readOptions).then(async r => {
                    for (let p of r.items) {
                        p.writer = await p.getWriter()
                        p.sampleText = p.text.slice(0, 300)
                        delete p.text
                    }
                    return r
                })
            case PieceListingType.SEO:
                return col.load(readOptions).then(async r => {
                    for (let p of r.items) {
                        p.writer = await p.getWriter()
                    }
                    return r
                })
            case  PieceListingType.subscriptions:
                const user = await session.getUser()
                const subscriptions = await user.getSubscriptions()
                const piecesBuckets = await Promise.all(
                    subscriptions.map((writer: User) =>
                        Piece.getByWriter(writer)
                            .then(writerPieces => writerPieces.map((p: IPiece) =>
                                Object.assign(p, {writer})))
                    )
                )
                // @ts-ignore
                pieces = piecesBuckets.flat()
                const totalFiltered = pieces.length
                pieces = pieces.slice(readOptions.from, readOptions.from + readOptions.count)
                return {
                    totalFiltered,
                    items: pieces,
                }
        }
    },

    async update(session: ISession, pid: string, fields: Partial<IPiece>) {

        const piece = <Piece>await Piece.createFromDB(Piece, pid, 'status', 'title')
        const originalStatus = piece['status'];
        if (fields.status && fields.status != originalStatus) {
            if (originalStatus === 'banned') {
                await checkPermission(session, piece, AccessType.Admin)
            } else
                await checkPermission(session, piece, AccessType.EditBasic)
            if (fields.status === 'published') {
                // noinspection ES6MissingAwait
                managedNotificationService.notify(piece, 'published', {by: await piece.getWriter()})
            }
        }
        if (fields.text)
            fields.edited = new Date()
        const resultP = piece.update(fields)
        journal(session, 'updated-piece', piece, {title: piece['title']}, resultP)

        return resultP
    },
    async getPiece(session: ISession, pid: string) {

        const piece = await Piece.createFromDB(Piece, pid) as Piece;
        if (!piece)
            return Boom.notFound('No such piece')
        const dto = await piece.fullDto()
        const admin = await softCheckPermission(session, piece, AccessType.Admin)
        if (dto['status'] === 'banned') {
            if ((await piece.getWriter()).id !== session.userId || !admin)
                return Boom.forbidden('This creation is banned')
        }
        dto['mayAdmin'] = admin
        dto['mayEdit'] = admin || dto['writer'].id === session.userId
        // noinspection JSIgnoredPromiseFromCall,ES6MissingAwait
        counterService.increaseCountUnique(piece, session, 'read')
        return dto
    },
    async deletePiece(session: ISession, pid: string) {

        const piece = await Piece.createFromDB(Piece, pid) as Piece
        await checkPermission(session, piece, AccessType.Delete)
        return piece.erase()
    },
    async getByWriter(session, wid: string) {

        wid = wid || session.userId
        const writer = <User>await User.createFromDB(User, wid)

        let pieces = await Piece.getByWriter(writer)

        if (!session.userId || wid != session.userId) {
            const friendship = session && await writer.getFriendship(session.userId)
            pieces = pieces.filter(createPieceFilter(friendship))
        }

        return pieces
    },
    async getByWhisperation(session, wid: string) {

        const whisperation = <Whisperation>await User.createFromDB(Whisperation, wid)

        const userCache = {}

        let pieces = await Piece.getByWhisperation(whisperation)
        const user: User = session && await session.getUser()
        pieces = await Promise.all(pieces.map(p => Piece.isVisibleTo(p as IPiece, user, userCache)
            .then(visible => visible ? p : null)))

        return pieces.filter(p => p)
    },

    async create(session: ISession, pid: string, piece: IPiece) {

        const writer = await session.getUser()

        if (await writer.isSuspended())
            return Boom.forbidden('User is currently suspended')

        const whisperation: Whisperation = await Whisperation.createFromDB(Whisperation, pid);

        sanitizePiece(piece)

        return Piece.create(writer, whisperation, piece).then(async p => {
            journal(writer.id, 'piece-created', p as Piece, {title: p['title']})
            // noinspection ES6MissingAwait
            managedNotificationService.notify(whisperation, 'used', {by: writer})
            return p
        })
    },

    async changePieceStatus(session: ISession, pid: string, statusName: string) {

        const piece = <Piece>await Piece.createFromDB(Piece, pid, 'status', 'title')
        const status = PieceStatus[statusName]
        if (status === PieceStatus.banned) {
            await checkPermission(session, piece, AccessType.Admin)
        } else {
            if ((await piece.getField('status')) == PieceStatus.banned) {
                await checkPermission(session, piece, AccessType.Admin)
            } else
                await checkPermission(session, piece, AccessType.EditBasic)
        }
        if (status === PieceStatus.published) {
            // noinspection ES6MissingAwait
            managedNotificationService.notify(piece, 'published', {by: await piece.getWriter()})
            journal(session, 'published-piece', piece, {title: piece['title']})
        }
        return piece.changeStatus(status)
    },
    async flag(session: ISession, pieceId: string, type: string, reason: string) {
        if (!session.userId)
            return Boom.unauthorized('You must be logged in for flagging creations.')
        const piece = <Piece>await Piece.createFromDB(Piece, pieceId)

        const res = await FlaggableMix(piece).flag(await session.getUser())

        if (res) {
            // noinspection ES6MissingAwait
            managedNotificationService.notify(piece, 'flagged')
            return piece.refresh()
        } else
            return Boom.forbidden('Already flagged')
    },
}

function sanitizePiece(piece: IPiece) {
    piece.title = sanitizeHtml(piece.title)
    piece.text = sanitizeHtml(piece.text,
        {
            allowedTags: ['b', 'i'],
            // allowedAttributes: {
            //     'a': [ 'href' ]
            // },

            // allowedIframeHostnames: ['www.youtube.com']
        })

    return piece
}

function createPieceFilter(friendship?: IFriendship) {
    return function (p: IPiece) {
        switch (PieceStatus[p.status]) {
            case PieceStatus.published:
                return true
            case PieceStatus.banned:
            case PieceStatus.hidden:
            case PieceStatus.draft:
                return false
            case PieceStatus.private:
                return friendship && friendship.friend
            case PieceStatus.limited:
                return friendship && friendship.followed && friendship.follows
        }
        return false
    }
}