import * as joi from "@hapi/joi"
import {storage} from "./services";
import {RunMode, runMode} from "./config";
import {Countries} from "./lib";
import {adminRoutes, jobManagerRoutes, sessionRoutes, userRoutes} from "./routes/generic";

// import { taxonomy } from "./routes/taxonomy-routes";

export const standardRoutes = [
    ...sessionRoutes,
    ...userRoutes,
    ...adminRoutes,
    ...jobManagerRoutes,
    ...systemRoutes(),
]


function systemRoutes() {
    return [
        {method: 'GET', path: '/status', handler: () => 'ok'},
        {
            method: 'GET',
            path: '/api/sys/data/countries',
            config: {
                description: 'returns list of all countries'
            },
            handler: () => {
                return Countries
            }
        },
        {
            method: 'POST',
            path: '/api/sys/purge-database',
            config: {
                validate: {
                    payload: joi.object({
                        code: joi.string().min(4).max(100).required()
                    }).required()
                },
                description: `purges the whole database. Works only in test`,
                tags: ['special', 'test', 'system']
            },
            handler: async request => {
                if (runMode === RunMode.test && request.payload.code === '87487965782') {
                    return storage.purgeDatabase()
                }
            }
        }
    ]

}