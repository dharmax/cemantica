import {joiCronStringRule} from "../routing-utils";
import * as joi from '@hapi/joi'
import {jobManagerController} from "../../model-controllers/generic/job-manager-controller";
import * as Boom from "boom";

export const jobManagerRoutes = [
    {
        method: 'GET',
        path: '/api/job-manager/schedule',
        config: {
            validate: {},
            description: `Return all the scheduled jobs `,
            tags: ['api', 'admin', 'jobs', 'scheduling']
        },
        handler: async (request, h) => {
            return h.handle(jobManagerController, jobManagerController.readAllJobs)
        }
    },
    {
        method: 'POST',
        path: '/api/job-manager/schedule',
        config: {
            validate: {
                payload: {
                    prototypeName: joi.string().max(50).required(),
                    cron: joiCronStringRule,
                    once: joi.boolean().default(false),
                }
            },
            description: `Schedule job. Returns the job id. Uses cron timing syntax. It can be a recurring or run-once. `,
            notes: `Permissions are checked according to the specific operation's rules`,
            tags: ['api', 'admin', 'jobs', 'scheduling']
        },
        handler: async (request, h) => {
            const rp = request.payload;
            return h.handle(jobManagerController, jobManagerController.scheduleJob, rp.prototypeName, rp.cron, rp.once)
        }
    }, {
        method: 'POST',
        path: '/api/job-manager/prototype',
        config: {
            validate: {
                payload: {
                    name: joi.string().max(50).required(),
                    operation: joi.string().max(30).required(),
                    data: joi.object(),
                    description: joi.string().max(1024)
                }
            },
            description: `Add/modify a new job prototype.`,
            notes: `Admin only. The prototypeName is the key - if it doesn't exist it adds, if it does - it changes it`,
            tags: ['api', 'admin', 'jobs', 'prototype']
        },
        handler: async (request, h) => {
            const rp = request.payload;
            return h.handle(jobManagerController, jobManagerController.setPrototype, rp.name, rp.operation, rp.data, rp.description)
        }
    }, {
        method: 'GET',
        path: '/api/job-manager/prototype',
        config: {
            validate: {},
            description: `Get all job prototypes`,
            tags: ['api', 'admin', 'jobs', 'prototype']
        },
        handler: async (request, h) => {
            const rp = request.payload;
            return h.handle(jobManagerController, jobManagerController.getPrototypes)
        }
    }, {
        method: 'GET',
        path: '/api/job-manager/operations',
        config: {
            validate: {},
            description: `Get the job operations list`,
            tags: ['api', 'admin', 'jobs', 'prototype', 'operations']
        },
        handler: async (request, h) => {
            const rp = request.payload;
            return h.handle(jobManagerController, jobManagerController.getJobOperations)
        }
    }, {
        method: 'POST',
        path: '/api/job-manager/executeNow',
        config: {
            validate: {
                payload: {
                    jobId: joi.string().max(50),
                    prototypeName: joi.string().max(50),
                }
            },
            description: `Execute a job instantly, either from the scheduler or the prototype`,
            tags: ['api', 'admin', 'jobs']
        },
        handler: async (request, h) => {

            const rp = request.payload;
            if (!rp.jobId && !rp.prototypeName)
                return Boom.badData('you should specify either jobId or a prototype name')
            return h.handle(jobManagerController, jobManagerController.executeJob, rp.jobId, rp.prototypeName)
        }
    },
    {
        method: 'DELETE',
        path: '/api/job-manager/schedule/{jobId}',
        config: {
            validate: {},
            description: `Delete and cancels a scheduled job `,
            notes: `It is also used for changing a job - you delete and then schedule anew`,
            tags: ['api', 'admin', 'jobs', 'schedule']
        },
        handler: async (request, h) => {
            return h.handle(jobManagerController, jobManagerController.cancelJobs, request.params.jobId)

        }
    },
    {
        method: 'DELETE',
        path: '/api/job-manager/prototype/{prototypeName}',
        config: {
            validate: {},
            description: `Delete a prototype and scheduled jobs associated to it`,
            tags: ['api', 'admin', 'jobs', 'schedule', 'prototype']
        },
        handler: async (request, h) => {
            return h.handle(jobManagerController, jobManagerController.deletePrototype, request.params.prototypeName)

        }
    },


]