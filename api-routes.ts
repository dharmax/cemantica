import * as joi from "@hapi/joi"
import {sessionRoutes} from './routes/generic/session-routes'
import {userRoutes} from './routes/generic/users-routes'
import {storage} from "./services/generic/storage";
import {jobManagerRoutes} from "./routes/generic/job-manager-routes";
import {adminRoutes} from "./routes/generic/admin-routes";
import {RunMode, runMode} from "./config/run-mode";
import {whisperationRoutes} from "./routes/specific/whisperations-routes";
import {piecesRoutes} from "./routes/specific/pieces-routes";
import {feedRoutes} from "./routes/specific/feed-routes";
import {Countries} from "./lib/world-counties-data";
import {discussionRoutes} from './routes/generic/discussions-routes'

// import { taxonomy } from "./routes/taxonomy-routes";

export const routes = [
    ...sessionRoutes,
    ...userRoutes,
    ...adminRoutes,
    ...jobManagerRoutes,

    ...whisperationRoutes,
    ...piecesRoutes,
    ...feedRoutes,
    ...discussionRoutes,
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
                    payload: {
                        code: joi.string().min(4).max(100).required()
                    }
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