import {PermissionGroup} from "../../model/generic-entities/permission-group";
import {userController} from "../../model-controllers/generic/user-controller";
import {hash} from "bcryptjs";
import {INITIAL_SUPERUSER_EMAIL, INITIAL_SUPERUSER_PW} from "../../config/deployment";
import {log} from "./logger";
import {User} from "../../model/generic-entities/user-entity";
import {setSuperUserId} from "./privilege-service";

/**
 * This little service simply populate whatever need to be populated in a clean installation
 */
export async function startupService(permanentSuperUserEmail) {

    // check if it is a new installation
    if (await isNewInstallation()) {
        log.info('This is a new installation...')

        try {
            await createSuperUser()
        } catch (e) {
            //
        }
    }

    await ensurePermanentSuperUserPrivileges(permanentSuperUserEmail)

}


async function createSuperUser() {

    const email = INITIAL_SUPERUSER_EMAIL,
        password = INITIAL_SUPERUSER_PW
    const user = await userController.addUserDirectly('system', {
        name: 'startup superuser',
        email,
        password: await hash(password, 10)
    })
    const adminGroup = await PermissionGroup.getAdminsGroup()
    await adminGroup.assignRole('Admin', user)
    log.info(`super user ${email} created with password ${password}.`)
    return user
}

async function isNewInstallation(): Promise<boolean> {

    // we check if there are any administrators

    const adminGroup = await PermissionGroup.getAdminsGroup()

    const permissionOwners = await adminGroup.getPermissionOwners()

    return permissionOwners.length === 0

}

async function ensurePermanentSuperUserPrivileges(permanentSuperUserEmail) {

    const user = await User.findByEmail(permanentSuperUserEmail)
    if (user)
        setSuperUserId(user.id)
    else {
        console.warn(`Superuser account ${permanentSuperUserEmail} isn't defined`)
    }
}