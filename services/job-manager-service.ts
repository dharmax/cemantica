import {Collection} from "./storage";

import {cancelJob, Job, scheduleJob} from "node-schedule"
import {journal, log} from "./logger";
import {AnySchema} from "@hapi/joi";
import {ConfigurationEntity} from "../model/generic-entities/configuration-entity";
import {User} from "../model/generic-entities";

class JobManagerService {
    private myUniqueId = Math.floor(Math.random() * 1000000)
    private scheduleCollection: Collection;

    readonly jobs: Job[] = []
    private activeControllers: { [jobId: string]: JobController } = {};

    constructor() {
        // noinspection JSIgnoredPromiseFromCall
        this.init()
    }


    /**
     * @return the id of the job in the database
     */
    async addJobToScheduler(cron: string, options: IJobOptions, jobPrototype: IJobPrototype, assigningUser: User): Promise<string> {

        const record: IJobRecord = {
            id: '' + Math.ceil(Math.random() * 1000000),
            cron,
            jobPrototypeName: jobPrototype.name,
            options,
            notes: `Assigned by ${await assigningUser.getField('email')} on ${new Date()}`,
            status: JobStatus.Inactive
        }
        const list = await this.readScheduleFromDatabase()
        list[record.id] = record
        await this.saveScheduleToDatabase(list)
        this.scheduleJob(record)

        return record.id
    }

    async readScheduleFromDatabase(): Promise<{ [x: string]: IJobRecord }> {
        const e = await ConfigurationEntity.getConfigurationEntity()
        const list: { [x: string]: IJobRecord } = await e.getField('scheduledJobs')
        return list
    }

    async saveScheduleToDatabase(scheduledJobs: Object) {
        const e = await ConfigurationEntity.getConfigurationEntity()
        await e.update({
            scheduledJobs,
            scheduleLastUpdate: {
                time: new Date(),
                by: this.myUniqueId
            }
        })
    }

    async findJobById(id): Promise<IJobRecord> {
        const list = await this.readScheduleFromDatabase()
        return list[id]
    }

    async init() {

        this.startWatcher()
        await this.loadSchedule()
    }


    async loadSchedule() {
        const records = await this.readScheduleFromDatabase().then(l => Object.values(l))
        this.clearJobLocalLookup()
        records.forEach(rec => this.scheduleJob(<IJobRecord>rec))
    }

    async removeJobByJob(job: Job) {
        this.jobs.splice(job['__index'], 1)
        // noinspection JSIgnoredPromiseFromCall
        const list = await this.readScheduleFromDatabase()
        const jobId = job['_record'].id
        delete list[jobId]
        this.touchDatabase()
        cancelJob(job)
    }

    async removeJobsById(jobIds: string[]) {
        return Promise.all(jobIds.map(jid => {
            const job = this.jobs.find(j => jid == j['_record'].id)
            const controller = this.activeControllers[jid]
            if (controller)
                controller.stop()
            return this.removeJobByJob(job)
        }))
    }

    clearJobLocalLookup() {
        this.jobs.forEach((j: Job) => cancelJob(j))
        this.jobs.length = 0
    }

    async readJobs() {
        return this.jobs.map(j => j['_record'])
    }

    async takeOwnershipOfJob(id: string) {
        // we mark the job as being handled for this specific period of time. If it is already marked, it means
        //  another instance of the application is handling it so we return false, in order to skip it
        const timeSlot = Math.round(Date.now() / 60000)
        const list = await this.readScheduleFromDatabase()
        const job = list[id]
        if (job.lastExec === timeSlot)
            return false
        job.lastExec = timeSlot
        await this.saveScheduleToDatabase(list)
        return true
    }

    async executeNow(jobId: string) {
        const jobRecord = await this.findJobById(jobId)
        return executeJob(jobRecord.jobPrototypeName, async jc => {
            jobRecord.status = jc.status
            await this.scheduleCollection.updateDocument(jobId, {status: jc.status})
            this.touchDatabase()
        })
    }

    private async touchDatabase() {
        const e = await ConfigurationEntity.getConfigurationEntity()
        return e.update({
            scheduleLastUpdate: {
                time: new Date(),
                by: this.myUniqueId
            }
        })
    }

    private startWatcher(): void {
        let lastTime = new Date()
        setInterval(async () => {
            const e = await ConfigurationEntity.getConfigurationEntity()
            const r: { time: Date, by: any } = await e.getField('scheduleLastUpdate')
            const {time, by} = r
            if (time && (time.getTime() > lastTime.getTime())) {
                lastTime = time
                // noinspection JSIgnoredPromiseFromCall
                if (by != this.myUniqueId)
                    this.loadSchedule()
            }
        }, 30000)

    }

    async removeJobsByPrototype(prototypeName: string) {
        for (let job of this.jobs) {
            if (job["_record"].jobPrototypeName === prototypeName)
                await this.removeJobByJob(job)
        }
    }

    private scheduleJob(jobRecord: IJobRecord) {
        const job = scheduleJob(jobRecord.cron, async () => {

            if (!await this.takeOwnershipOfJob(jobRecord.id)) // to prevent other app instances to run it
                return

            const controller = await executeJob(jobRecord.jobPrototypeName, async jc => {
                jobRecord.status = jc.status
                const list = await this.readScheduleFromDatabase()
                list[jobRecord.id].status = jc.status
                await this.saveScheduleToDatabase(list)
            })
            this.activeControllers[jobRecord.id] = controller
            // TODO  keep controller and handle multiple nodes...
            if (!jobRecord.options.recurring)
                this.removeJobByJob(job)
        });
        this.jobs.push(job)

        job ['__index'] = this.jobs.length - 1
        job['_record'] = jobRecord
        return job
    }
}


async function executeJob(jobPrototypeName: string, jobListener: (jc: JobController) => void): Promise<JobController> {

    const jobPrototype = await jobPrototypeManager.getPrototype(jobPrototypeName)
    if (!jobPrototype) {
        log.warn(`Job Prototype ${jobPrototypeName} is invoked, but isn't familiar to the system`)
        return null
    }

    const operation = JobOperation.registry[jobPrototype.operationName]

    if (!operation)
        throw new Error(`Unexpected missing operation ${jobPrototype.operationName}`)

    journal('scheduler', 'firing scheduled job', null, {jobPrototypeName})

    return operation.execute(jobPrototype.data, jobListener)
}

/**
 * Contains the list of job prototypes. For updating a prototype, just get it, modify it and call saveList.
 */
export const jobPrototypeManager = {


    async getPrototypes(): Promise<Map<string, Object>> {
        const e = await ConfigurationEntity.getConfigurationEntity()
        let list: Map<string, Object> = await e.getField('jobPrototypes')
        return list
    },
    async savePrototypes(list: Map<string, Object>): Promise<any> {
        const e = await ConfigurationEntity.getConfigurationEntity()
        await e.update({jobPrototypes: list})
        return list
    },
    async add(data: IJobPrototype): Promise<any> {

        const list = await this.getPrototypes()
        list[data.name] = data
        await this.savePrototypes(list);
        return list
    },

    async deletePrototype(prototypeName: string): Promise<any> {
        const list = await this.getPrototypes()
        delete list[prototypeName]
        await this.savePrototypes(list);
        return list
    },
    async getPrototype(jobPrototypeName: string): Promise<IJobPrototype> {
        const list = await this.getPrototypes()
        return list[jobPrototypeName]
    },
    execute(prototypeName: string) {
        return executeJob(prototypeName, jc => {
            console.log(jc)
        })
    }
}

export const jobManagerService = new JobManagerService()

export abstract class JobOperation {

    public static registry: { [name: string]: JobOperation } = {}

    constructor() {
        if (this.constructor.name !== 'JobOperation')
            JobOperation.registry[this.constructor.name] = this
    }

    get name() {
        return this.constructor.name
    }

    toString() {
        return `${this.name} ${this.description()}. \n Schema: ${JSON.stringify(this.dataSchema.describe(), null, 1)} `
    }

    protected abstract description(): string

    abstract get dataSchema(): AnySchema

    abstract execute(data, listener: (jc: JobController) => void): JobController

    abstract allowed(user: User): Promise<boolean>

}

export enum JobStatus {
    Inactive,
    Running,
    PauseRequested,
    Paused,
    Done,
    Failed,
    StopRequested,
    Stopped
}

export class JobController {

    public _error: any

    constructor(protected listener: (jc: JobController) => void) {
    }

    private _status = JobStatus.Inactive

    get status() {
        return this._status
    }

    set status(s: JobStatus) {
        this._status = s
        this.listener && this.listener(this)
    }

    private _progress = 0

    get progress() {
        return this._progress
    }

    set progress(p) {
        this._progress = p
        this.listener && this.listener(this)
    }

    stop(): void {
        this.status = JobStatus.StopRequested
    }

    canPause(): boolean {
        return false
    }

    pause(): void {
        this.status = JobStatus.PauseRequested
    }

    resume(): void {
    }

}

export interface IJobPrototype {
    name: string
    operationName: string
    data: any
    description: string
}


interface IJobRecord {
    lastExec?: number;
    id?: any
    options: IJobOptions
    cron: string
    jobPrototypeName: string
    notes: string
    status: JobStatus
}

export interface IJobOptions {
    recurring: boolean
}