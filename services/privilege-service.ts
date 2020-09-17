import {PermissionGroup} from "../model/generic-entities/permission-group";
import {createPredicate, deletePredicate, findPredicates, getOntology, Predicate} from "../model/model-manager";
import {log, LoggedException} from "./logger";
import {AbstractEntity} from "../model/generic-entities/abstract-entity";

export enum AccessType {
    Vote,
    Message,
    Admin,
    ShallowRead,
    DeepRead,
    PrivateRead,
    EditBasic,
    EditPrivate,
    AddItem,
    AddItemAdvanced,
    RemoveItem,
    ChangeItem,
    Delete,
    Invite,
    Manage,
    ChangePermission,
    Activate,
    Join,
    Attach,
    Subscribe,
    Comment,
    OperationA,
    OperationB,
    OperationC,
    OperationD
}

let roleDictionary


export async function assignRole(roleName: string, user, entity: AbstractEntity) {

    if (!isRoleNameLegit(roleName))
        throw new LoggedException(`Role name ${roleName} nor it's derivatives aren't defined for ${entity.typeName()}`)

    let existingRolesPreds = <Predicate[]>await findPredicates(true, 'has-role-in', entity.id, {
        peerId: user.id
    })
    for (let p of existingRolesPreds) {
        if (p.payload == roleName) {
            log.info(`Attempting to re-assign a role. Nothing to do.`)
            return {
                entityId: entity.id,
                permissionOwners: await entity.getPermissionOwners(),
                result: 'nothing to do'
            }
        }
    }
    await createPredicate(user, 'has-role-in', entity, roleName, {roleName})
    return {
        entityId: entity.id,
        permissionOwners: await entity.getPermissionOwners(),
        result: 'ok'
    }
}

export async function unassignRole(roleName: string, user, entity: AbstractEntity) {

    let existingRolesPreds = <any[]>await findPredicates(true, 'has-role-in', entity.id, {
        peerId: user.id
    })
    for (let p of existingRolesPreds) {
        if (p.payload == roleName) {
            await deletePredicate(p)
            return {
                entityId: entity.id,
                userId: user.id,
                permissionOwners: await entity.getPermissionOwners(),
                roleName
            }
        }
    }
    return {
        entityId: entity.id,
        permissionOwners: await entity.getPermissionOwners(),
        result: 'Nothing to do'
    }
}


function isRoleNameLegit(roleName: string): boolean {

    if (roleDictionary[roleName])
        return true

    const entityNames = getOntology().edcrNames()
    for (let name of entityNames) {
        if (roleName === name + '-Visitor'
            || roleName === name + '-User'
            || roleName === name + '-Container')
            return true
    }
    return false
}

/**
 * There are the following special rules about role names: if the role name ends with -Visitor, it denotes its the
 * default set of privileges for anyone on that entity type. If it ends with "-User" it denotes its the default set of
 * privileged for logged-in users on this entity type
 *
 */
export type RoleDictionary = { [roleName: string]: AccessType[] }

export function initPrivilegesService(dictionary: RoleDictionary) {
    roleDictionary = {
        'Admin': [AccessType.Admin],
        'SubAdmin': [AccessType.DeepRead, AccessType.EditBasic, AccessType.Join, AccessType.Activate],
        ...dictionary
    }
}


export interface IPermissionManaged {
    id

    typeName(): string

    /**o
     * Implement this if you want to add custom permission logic for your entity.
     * @param actor the actor
     * @param entity the object
     * @param accessType the access type
     * @throws PrivilegeViolationException if the access was rejected
     * @return "default" if you want to use the default permission logic or void if permission granted
     */
    customPermissionChecker?: (actor: PrivilegeOwner, entity: IPermissionManaged, accessType: AccessType) => Promise<void | string>

    getRolesForActor(actor: PrivilegeOwner): Promise<string[]>

    getContainers(): Promise<IPermissionManaged[]>
}

export class PrivilegeViolationException extends Error {
    errorInfo;

    constructor(actor: PrivilegeOwner, object: IPermissionManaged | string, accessType: AccessType) {
        let errorInfo = {actor, object, accessType: AccessType[accessType]}
        super(`privilege violation ${actor.clazz.name}: ${actor.id} lacks ${errorInfo.accessType} on a ${object.constructor.name}`)
        this.errorInfo = errorInfo
    }
}

class Role {
    private allowances: Set<AccessType> = new Set<AccessType>()

    constructor(public readonly name: string, allowances: AccessType[]) {
        this.allowances = new Set(allowances)
    }

    may(op: AccessType, asContainer: boolean): boolean {

        let self: Role = this

        function hasAny(ats: AccessType[] = []) {
            ats.concat(AccessType.Admin)
            for (let at of ats)
                if (self.allowances.has(at))
                    return true
            return false
        }

        // noinspection FallThroughInSwitchStatementJS
        switch (op) {
            case AccessType.Admin:
                return hasAny([AccessType.Admin])
            case AccessType.Message:
                return hasAny([op, AccessType.Manage])
            case AccessType.ShallowRead:
                return hasAny([op, AccessType.DeepRead, AccessType.Manage, AccessType.EditBasic])
            case AccessType.DeepRead:
                return hasAny([op, AccessType.Manage, AccessType.ChangeItem, AccessType.EditBasic])
            case AccessType.EditBasic:
                return hasAny([op, AccessType.Manage, AccessType.EditPrivate])
            case AccessType.PrivateRead:
                return hasAny([op])
            case AccessType.EditPrivate:
                return hasAny([op])
            case AccessType.AddItem:
            case AccessType.RemoveItem:
                if (asContainer)
                    return hasAny([op, AccessType.ChangeItem])
            case AccessType.ChangeItem:
                if (asContainer)
                    return hasAny([op, AccessType.ChangeItem])
            case AccessType.Delete:
            case AccessType.Invite:
            case AccessType.ChangePermission:
            case AccessType.Join:
            case AccessType.Attach:
                return hasAny([op, AccessType.Manage]) || asContainer && hasAny([AccessType.ChangeItem])
            case AccessType.Manage:
            case AccessType.Subscribe:
            case AccessType.OperationA:
            case AccessType.OperationB:
            case AccessType.OperationC:
            case AccessType.OperationD:
            case AccessType.Activate:
                return (asContainer && hasAny([AccessType.Manage])) ||
                    hasAny([op])
            default:
                return hasAny([op])
        }
        return false
    }
}

export class PrivilegeOwner {
    constructor(public id: string, public isAdmin: boolean, public clazz: Function) {
    }
}

let permanentSuperUserId;

export function setSuperUserId(userId) {
    permanentSuperUserId = userId
}

export function isSuperUser(userId): boolean {
    return userId === permanentSuperUserId
}


/**
 * Throws a PrivilegeViolationException on violation
 * @param actor the actor
 * @param entity the object
 * @param accessType the operation requested
 * @param forceDefault use it in the custom authorization logic, in case you want to invoke the default logic from there
 * @returns void. It throws an exception instead
 * @throws PrivilegeViolationException
 */
export async function checkPermissionInternal(actor: PrivilegeOwner, entity: IPermissionManaged, accessType: AccessType, forceDefault = false): Promise<boolean> {

    if (actor.id === permanentSuperUserId)
        return true

    // no object means system level object
    if (!entity)
        throw new PrivilegeViolationException(actor, 'system', accessType)

    // let entity's custom permission logic do the checking, if such a logic is defined.
    let pm = !forceDefault && entity.customPermissionChecker
    if (pm) {
        const customResult = await pm.call(entity, actor, entity, accessType,)
        return customResult === "default" ? await defaultChecker(entity) : customResult
    }
    return defaultChecker(entity)

    // note that the obj is provided because we use recursion with it. Otherwise, it could have used the "entity" in the
    //  parameters.
    async function defaultChecker(obj?: IPermissionManaged, contained?: IPermissionManaged): Promise<boolean> {

        if (await isAdmin(actor))
            return true

        if (obj) {
            // does any of the "default" permission permit the operation?
            const visitorRoleName = obj.typeName() + "-Visitor"
            let roles: Role[] = [new Role(visitorRoleName, roleDictionary[visitorRoleName])]

            // does any of the default permissions for a logged in use permit it?
            if (actor.id) {
                const userRoleName = obj.typeName() + "-User"
                roles.push(new Role(userRoleName, roleDictionary[userRoleName]))
            }

            // does any of the default permissions for a logged in use permit it?
            if (contained) {
                const userRoleName = contained.typeName() + "-Container"
                roles.push(new Role(userRoleName, roleDictionary[userRoleName]))
            }

            for (let r of roles)
                if (r && r.may(accessType, !!contained))
                    return true

            // if not, does any of the roles assigned to the object for the actor allow the access type requested?
            const roleNames = await obj.getRolesForActor(actor)
            roles = roleNames.map(roleName => new Role(roleName, roleDictionary[roleName]))
            for (let r of roles)
                if (r.may(accessType, !!contained))
                    return true

            // if not, go to the object's containers (parents) and see if any of them allow the operation
            //  on its content
            let containers = await obj.getContainers() || []
            for (const c of containers) {
                try {
                    if (await defaultChecker(c, obj))
                        return true
                } catch (e) {
                    // ignore violations here, because it is enough that one container gives the permission we want
                    //  and only of none of them doesn't - throw an exception
                }
            }

            // if we reached here, it means the user has not the requested privilege
            throw new PrivilegeViolationException(actor, entity, accessType)
        }
        throw new PrivilegeViolationException(actor, entity, accessType)
    }

}


async function isAdmin(actor: PrivilegeOwner) {

    if (actor.isAdmin)
        return true

    const adminGroup = await PermissionGroup.getAdminsGroup()
    const roleNames = await adminGroup.getRolesForActor(actor)
    const roles = roleNames.map(roleName => new Role(roleName, roleDictionary[roleName]))
    for (let r of roles)
        if (r.may(AccessType.Admin, false))
            return true

    return false

}
