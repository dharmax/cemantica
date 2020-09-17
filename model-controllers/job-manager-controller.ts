import {jobManagerService, JobOperation, jobPrototypeManager} from "../services/job-manager-service";
import {ISession} from "../services/session-service";
import {AccessType} from "../services/privilege-service";
import {PermissionGroup} from "../model/generic-entities/permission-group";
import {journal} from "../services/logger";
import {checkPermission} from "../lib/controllers-utils";

/**
 * TODO permissions are now checked globally and do not use the JobOperation permission system support
 *
 */
export const jobManagerController = {


    async scheduleJob(session: ISession, prototypeName: string, cron: string, once: boolean): Promise<string> {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.Manage)
        const prototype = await jobPrototypeManager.getPrototype(prototypeName)
        if (!prototype)
            throw new Error('No such job prototype')
        const promise = jobManagerService.addJobToScheduler(cron, {recurring: !once}, prototype, await session.getUser())

        journal(session.userId, 'job-scheduled', null, {prototype}, promise)

        return promise
    },
    async setPrototype(session: ISession, prototypeName: string, jobOperation: string, data: Object, description: string) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.Manage)
        await jobPrototypeManager.add({
            name: prototypeName,
            operationName: jobOperation,
            data,
            description,
        })
    },
    async getPrototypes(session: ISession) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.ShallowRead)

        const p = await jobPrototypeManager.getPrototypes()
        return Object.values(p)
    },
    async getJobOperations(session: ISession) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.ShallowRead)
        return Object.values(JobOperation.registry).map(v => {
            return {
                name: v.name,
                description: v.toString()
            }
        })
    },
    async executeJob(session: ISession, jobId: string, prototypeName: string) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.Activate)
        if (jobId)
            return jobManagerService.executeNow(jobId)
        else
            return jobPrototypeManager.execute(prototypeName)
    },
    async cancelJobs(session: ISession, jobId: string) {

        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.Manage)
        return jobManagerService.removeJobsById([jobId])
    },

    async deletePrototype(session: ISession, prototypeName: string) {
        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.Manage)

        return jobPrototypeManager.deletePrototype(prototypeName)
    },

    async readAllJobs(session: ISession) {

        const adminGroup = await PermissionGroup.getAdminsGroup()
        await checkPermission(session, adminGroup, AccessType.ShallowRead)
        return jobManagerService.readJobs()
    }
}
