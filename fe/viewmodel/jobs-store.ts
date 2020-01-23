import {StoreApi} from "../lib/api-helper";

class JobsStore extends StoreApi {
    constructor() {
        super('job-manager')
    }

    getSchedule() {
        return this.get('schedule', {})
    }

    getPrototypes() {
        return this.get('prototype')
    }

    getOperations() {
        return this.get('operations')
    }
}

export const jobsStore = new JobsStore()