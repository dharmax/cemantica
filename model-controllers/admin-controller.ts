import {ISession} from "../services/session-service";
import {PermissionGroup} from "../model/generic-entities/permission-group";
import {AccessType} from "../services/privilege-service";
import {journal, queryClientLog, queryJournal} from "../services/logger";
import {IClientLogQuery, IReadOptions} from "../lib/common-generic-types";
import {getOntology, idAndType2entity} from "../model/model-manager";
import {storage} from "../services/storage";
import {AbstractEntity, User} from "../model/generic-entities/abstract-entity";
import {checkPermission} from "../lib/controllers-utils";
import Boom = require("boom");


export const adminController = {
    async queryJournal(session: ISession, from: Date, to: Date, query: Object) {

        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.ShallowRead)

        query['time'] = {$gte: from, $lt: to}
        return queryJournal(query)
    },

    async setAdminRole(session: ISession, userId: string, roleName: 'Admin' | 'SubAdmin', on: boolean): Promise<any> {

        let adminsGroup = await PermissionGroup.getAdminsGroup();
        await checkPermission(session, adminsGroup, AccessType.Admin)

        const user = <User>await User.createFromDB(User, userId)
        if (!user)
            return Boom.badData('user id not found')

        const res = await (on ? adminsGroup.assignRole(roleName, user) : adminsGroup.unassignRole(roleName, user))

        adminsGroup = await PermissionGroup.getAdminsGroup(true)
        journal(session.userId, on ? 'assign-role' : 'unassign-role', adminsGroup, {roleName, userId})

        return res

    },

    async queryClientLog(session: ISession, query: IClientLogQuery) {

        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.ShallowRead)

        return queryClientLog(query)
    },

    async deleteEntity(session: ISession, entityType: string, entityId: string) {
        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.Admin)

        const entity = await idAndType2entity(entityId, entityType)
        return entity.erase()
    },

    async queryEntity(session: ISession, e, depths: { iDepth: number, oDepth: number }) {
        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.Admin)

        const entity = await idAndType2entity(e.entityId, e.entityType)

        return entity.query(depths.iDepth, depths.oDepth)

    },

    async getOntology(session: ISession) {

        if (!session.userId)
            return Boom.unauthorized('Has to be logged in for that')

        const ontology = getOntology()
        return ontology
    },

    async browseEntities(session: ISession, entityType: string, readOptions: IReadOptions, query: Object) {
        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.DeepRead)

        const col = await storage.collectionForEntityType(getOntology().edcr(entityType).clazz)

        return col.load(readOptions, query)
    },

    async xrayEntity(session: ISession, entityType: string, entityId: string, readOptions: IReadOptions) {

        await checkPermission(session, await PermissionGroup.getAdminsGroup(), AccessType.DeepRead)

        const eDcr = getOntology().edcr(entityType)

        const col = await storage.collectionForEntityType(eDcr.clazz)

        const entity = await col.findById(entityId) as AbstractEntity

        readOptions.entityOnly = false
        const [incoming, outgoing] = await Promise.all([
            entity.incomingPredsPaging(null, {peerType: '*'}, readOptions),
            entity.outgoingPredsPaging(null, {peerType: '*'}, readOptions)])

        return {
            entity,
            incoming,
            outgoing
        }


    },

    async getAllAdmins(session) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.ShallowRead)

        return adminGroup.getPermissionOwners()
    },

    async changeEntity(session: ISession, e: { type, id }, data: { fieldName, fieldValue }) {


        const eDcr = getOntology().edcr(e.type)

        const col = await storage.collectionForEntityType(eDcr.clazz)

        const entity = await col.findById(e.id) as AbstractEntity

        await checkPermission(session, entity, AccessType.EditPrivate)

        const result = entity.update(null, true, false, {$set: {[data.fieldName]: eval(data.fieldValue)}})
        journal(session, 'direct-modify', entity, data, result)
        return result
    }
}


