/**
 * This "hack" forces Typescript and node to "know" the User function/class, otherwise it can be optimized to nill.
 */
import {ISession} from "../services/session-service";
import {
    AccessType,
    checkPermissionInternal as _checkPermission,
    IPermissionManaged,
    isSuperUser,
    PrivilegeOwner
} from "../services/privilege-service";
import {journal, LoggedException} from "../services/logger";
import {RunMode, runMode} from "../config/run-mode";
import {User as _User} from "../model/generic-entities";

const User = _User

/**
 * check permission for the acting user. Throws an exception on error
 * @param _session
 * @param object the object the user attempt to access. null means system object
 * @param accessType what kind of access is requested
 * @throws PrivilegeViolationException
 */
export async function checkPermission(_session: ISession | string, object: IPermissionManaged, accessType: AccessType) {

    if (_session && (_session === 'tester' && runMode === RunMode.test || _session === 'system'))
        return true

    let session = <ISession>_session

    let privilegeOwner = new PrivilegeOwner(session.userId, session.isAdmin || isSuperUser(session.userId), User)

    return _checkPermission(privilegeOwner, object, accessType)
}

export async function checkPermissionForUserId(userId: string, object: IPermissionManaged, accessType: AccessType): Promise<boolean> {
    let privilegeOwner = new PrivilegeOwner(userId, isSuperUser(userId), User)
    try {
        // @ts-ignore
        await _checkPermission(privilegeOwner, object, accessType)
        return true
    } catch (e) {
        return false
    }
}

/**
 * like checkPermission, but returns boolean instead of throwing an exception
 * @param _session
 * @param object
 * @param accessType
 */
export async function softCheckPermission(_session: ISession | string, object: IPermissionManaged, accessType: AccessType): Promise<boolean> {

    try {
        // @ts-ignore
        await checkPermission(...arguments)
        return true
    } catch (e) {
        return false
    }
}


export async function setRole(on: boolean, clazz: Function, session: ISession, entityId: string, userId: string, roleName: string) {
    let entity = await clazz['createFromDB'](entityId)
    await checkPermission(session, entity, AccessType.ChangePermission)
    let user = await User.createFromDB(User, userId);
    if (!user)
        throw new LoggedException('No such user');
    let promise = on ? entity.assignRole(roleName, user) : entity.unassignRole(roleName, user)
    journal(session.userId, on ? 'assign-role' : 'unassign-role', entity, {roleName, userId: user.id}, promise)
    return {
        entityId: entityId,
        updateResult: await promise
    }
}

export async function deleteEntity(clazz: Function, session: ISession, entityId: string) {

    let entity = await clazz['createFromDB'](entityId)
    if (!entity)
        throw new LoggedException('No such entity')

    // it's enough if one container doesn't allow....
    let containers = await entity.getContainers()
    if (!containers || !containers.length)
        containers = [null] // if there are no containers - it means it is a system-level privilege.
    let permissionPromises = containers.map(c => checkPermission(session, c, AccessType.RemoveItem))
    await Promise.all(permissionPromises)

    let promise = entity.delete()
    journal(session.userId, 'delete', entity, null, promise)
    return {
        entityId,
        result: await promise
    }
}

