import {ISession} from "../../services/generic/session-service";
import {IWhisperation} from "../../lib/common-specific-types";
import {FeaturedManagementService} from "../../services/specific/featured-management";
import {Whisperation} from "../../model/specific-entities/whisperation-entity";
import {User} from "../../model/generic-entities/user-entity";
import {journal} from "../../services/generic/logger";
import {checkPermission, softCheckPermission} from "../generic/controllers-utils";
import {AccessType} from "../../services/generic/privilege-service";
import {FlaggableMix} from "../../model/generic-entities/flaggable-mix";
import {IReadOptions} from "../../lib/common-generic-types";
import {storage} from "../../services/generic/storage";
import Boom = require("boom");

export const whisperationController = {

    async getFeatured(session: ISession): Promise<IWhisperation[]> {

        return FeaturedManagementService.getFeaturedWhisperations()
    },

    async create(session: ISession, items: string[]) {

        if (!session.userId)
            return Boom.unauthorized('You must be logged in for adding whisperations.')

        const creator = await session.getUser()


        if (await creator.isSuspended())
            return Boom.forbidden('User is currently suspended')


        return Whisperation.create({creator, items}).then((w: Whisperation) => {
            journal(creator.id, 'whisperation-created', w, {})
            return w
            }
        )
    },

    async get(session: ISession, wid: string) {

        const whisperation = await Whisperation.createFromDB(Whisperation, wid)
        const mayEdit = await softCheckPermission(session, whisperation, AccessType.Delete)

        return {
            ...await whisperation.fullDto(),
            mayEdit
        }
    },
    async load(session: ISession, readOptions: IReadOptions) {
        const col = await storage.collectionForEntityType(Whisperation)

        return col.load(readOptions)

    },
    async remove(session: ISession, wid: string) {
        const whisperation = await Whisperation.createFromDB(Whisperation, wid)
        await checkPermission(session, whisperation, AccessType.Delete)

        return whisperation.erase()
    },
    async flag(session: ISession, wid: string, type: string, reason: string) {
        if (!session.userId)
            return Boom.unauthorized('You must be logged in for flagging whisperations.')
        const whisperation = <Whisperation>await Whisperation.createFromDB(Whisperation, wid)

        const res = await FlaggableMix(whisperation).flag(await session.getUser())
        if (res)
            return whisperation.refresh()
        else
            return Boom.forbidden('Already flagged')
    },
    async getByWriter(session: ISession, userId: string) {

        userId = userId || session.userId
        const writer = <User>await User.createFromDB(User, userId)

        return Whisperation.getByWriter(writer)
    },
    async update(session: ISession, wid: string, fields) {

        const whisperation = <Whisperation>await Whisperation.createFromDB(Whisperation, wid)

        await checkPermission(session, whisperation, AccessType.EditBasic)

        return whisperation.update(fields)
    }
}

