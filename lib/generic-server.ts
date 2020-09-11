import {Server, ServerRoute} from '@hapi/hapi'
import * as vision from '@hapi/vision'
import * as inert from '@hapi/inert'


import {standardRoutes} from '../api-routes';
import {journal, log} from "../services/generic/logger"
import {initPrivilegesService, RoleDictionary} from "../services/generic/privilege-service";
import {addAuthorizationStrategies, addHapiExtensions} from "./hapi-extentions";
import {webServerPort} from "../config/server-address";
import {initSemanticLayer} from "../model/model-manager";
import {startupService} from "../services/generic/startup-service";
import {IRawOntology} from "../model/raw-ontology";
import {initBroadcastService} from "../services/generic/managed-notification-service";
import {QueryDictionary, storage} from "../services/generic/storage";
import {configTemplateEngine} from "./ssr-template-init";

import {render} from "@riotjs/ssr";


require('@riotjs/ssr/register')()
// @ts-ignore
const MyComponent = require('../../ssr-fe/my-component.riot')

export interface IServerConfig {
    templateEngineFilesRoot: string
    ontology: IRawOntology,
    roleDictionary: RoleDictionary,
    queryDictionary: QueryDictionary,
    superuserEmail: string,
    frontEndPath: string,
    applicationRoutes: ServerRoute[],
    rootPath: string
}

export async function startApplication(conf: IServerConfig) {

////////////////////////////////////////////////////////////////////

    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
        log.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    })


    process.on('uncaughtException', err => {
        console.error(`Uncaught exception: ${err}`)
        log.error(`Uncaught exception: ${err}`)
    });

////////////////////////////////////////////////////////////////////


    initSemanticLayer(conf.ontology)
    initPrivilegesService(conf.roleDictionary);
    storage.setQueryDictionary(conf.queryDictionary)
    await startServer([...standardRoutes, ...conf.applicationRoutes])

    async function startServer(routes) {
        const server = new Server({
            port: webServerPort,
            routes: {
                files: {
                    relativeTo: conf.frontEndPath,
                },
                validate: {
                    failAction: (request, h, err) => {
                        throw err;
                    }
                }
            }
        })

        await server.register(inert)
        await server.register(vision)


        await configTemplateEngine(server, conf.templateEngineFilesRoot)


        server.route([
            {
                method: 'GET',
                path: '/{param*}',
                handler: {
                    directory: {
                        path: conf.frontEndPath,
                        showHidden: true
                    }
                }
            },
            {
                method: 'GET',
                path: '/ssr/one',
                handler: (r, tk) => {
                    return render('my-component', MyComponent, {})
                }
            },
        ])


        await addAuthorizationStrategies(server)

        await addHapiExtensions(server)

        server.events.on('log', (event, tags) => {

            if (tags.error) {
                console.log(`Server error: ${event.error ? event.error.toString() : 'unknown'}`);
            }
        });


        // Graceful shutdown
        process.on('SIGINT', async () => {
            await server.stop({timeout: 10000});
            return process.exit(0);
        });

        server.route(routes)

        try {
            await server.start()

            initBroadcastService(server)

            console.log('Server running at:', server.info.uri);
            journal('system', 'starting web-server', null, null)

            await startupService(conf.superuserEmail)

        } catch (err) {
            if (err) {
                throw err;
            }
        }


    }


}