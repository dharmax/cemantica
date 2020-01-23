import * as path from 'path';

import {Server} from '@hapi/hapi'
import * as Lout from 'lout'
import * as Vision from '@hapi/vision'
import * as Inert from '@hapi/inert'

import {routes} from '../api-routes';
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


export async function startApplication(ontology: IRawOntology, roleDictionary: RoleDictionary, queryDictionary: QueryDictionary, superuserEmail) {

////////////////////////////////////////////////////////////////////

    process.on('unhandledRejection', (reason, p) => {
        log.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    })


    process.on('uncaughtException', err => {
        log.error(`Uncaught exception: ${err}`)
    });

////////////////////////////////////////////////////////////////////


    initSemanticLayer(ontology)
    initPrivilegesService(roleDictionary);
    storage.setQueryDictionary(queryDictionary)
    await startServer(routes)

    async function startServer(routes) {
        const server = new Server({
            port: webServerPort,
            routes: {
                files: {
                    relativeTo: path.join(__dirname, 'fe', 'dist'),
                },
                validate: {
                    failAction: (request, h, err) => {
                        throw err;
                    }
                }
            }
        })

        await server.register(Inert)
        await server.register(Vision)
        await server.register(Lout)

        await configTemplateEngine(server)

        server.route([
            {
                method: 'GET',
                path: '/{param*}',
                handler: {
                    directory: {
                        path: path.join(__dirname, '..', 'fe', 'dist'),
                        showHidden: true
                    }
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

            await startupService(superuserEmail)

        } catch (err) {
            if (err) {
                throw err;
            }
        }


    }


}