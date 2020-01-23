import {getSessionByToken, handleSSOLogin, ISession} from "../services/generic/session-service";
import {log} from "../services/generic/logger";
import * as boom from "boom";
import {
    apiVersion,
    facebookClientId,
    facebookClientSecret,
    googleClientId,
    googleClientSecret,
} from "../config/deployment";
import * as Bell from '@hapi/bell'
import {PrivilegeViolationException} from "../services/generic/privilege-service";
import {getWebServerUrl, isUsingHttps} from "../config/server-address";
import {storage} from "../services/generic/storage";
import {Request, Server} from '@hapi/hapi'


function readIp(request: Request & { session: Partial<ISession> }) {
    const xFF = request.headers['x-forwarded-for']
    const ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress
    return ip;
}

function createGuestSession(request: Request & { session: Partial<ISession> }): ISession {
    const ip = readIp(request);
    return {
        ip,
        sessionId: ip,
        apiVersion: apiVersion,
        getUser: async () => null
    }
}

async function injectSessionToRequest(request: Request & { session: ISession }): Promise<ISession> {
    if (request.session)
        return request.session
    let session: ISession
    const sessionToken = request.headers['session-token'] || (request.payload && request.payload['_SessionToken'])
    if (sessionToken && sessionToken != 'undefined') {
        session = await getSessionByToken(sessionToken)
        session && (session.lastAction = Date.now())
        session && (session.ip = readIp(request))
    } else {
        session = createGuestSession(request)
    }
    return request.session = session
}

export async function addHapiExtensions(server) {
    /**
     * this plugin simply populate a session property in the request with the user's session object, if there is one
     * @type {{register: ((server, options, next)=>any)}}
     */
    await server.register({
        plugin: {
            register: async server => {
                server.ext('onPreAuth', async (request, h) => {
                    await injectSessionToRequest(request)
                    return h.continue
                })
            },

            name: 'mySessionPlugin',
            version: '1.0.0'
        },
        options: {message: 'mySessionPlugin installed'}
    })


    /**
     * This decoration add the method 'handle' to the toolkit object in the routing handle function. This decoration is to be
     * used instead the regular reply whenever relevant (which is - in most cases).
     * The signature of the handle method is as follows:
     *  reply.handle(<context object - normally the controller>, <method to call, normally controller.method>, ...<list of arguments for the method>)
     *
     *
     * It does the following:
     * 1. It automatically injects the session object (as the first argument in the called method)
     * 2. It gracefully propagate uncaught exceptions back to the API caller
     * 3. It creates a database session and insert it into the session
     * 4. It starts a database transaction if it is a POST, PATCH or PUT
     */
    await server.decorate('toolkit', 'handle', async function (context, func, ...args) {

        const userSession = await injectSessionToRequest(this.request)
        args.unshift(userSession)

        if (userSession) {
            if (['post', 'put', 'patch'].includes(this.request.method.toLowerCase())) {
                try {
                    userSession.dbSession = await storage.startSession()
                    userSession.dbSession.startTransaction()
                } catch (e) {
                    // console.error(e)
                }
            }
        }
        try {
            let res = context ? func.apply(context, args) : func(...args)
            try {
                res = await res
                // noinspection ES6MissingAwait
                await userSession && userSession.dbSession && userSession.dbSession.commitTransaction()
                return res
            } catch (e) {
                // noinspection ES6MissingAwait
                await userSession && userSession.dbSession && userSession.dbSession.abortTransaction()
                if (e instanceof PrivilegeViolationException) {
                    log.warn(e.toString())
                    return boom.unauthorized(e.toString())
                } else {
                    console.error(e)
                    log.error(e)
                    return boom.boomify(e, {message: e.toLocaleString(), statusCode: e.status || 500})
                }
            }
        } catch (e) {
            await userSession && userSession.dbSession && await userSession.dbSession.abortTransaction()
            return boom.boomify(e, {message: e.toLocaleString(), statusCode: e.status || 500})
        }
    })


}

export declare interface ResponseToolkit {
    handle(clazz: Object, method: Function, ...args: any[])
}

export async function addAuthorizationStrategies(server: Server) {

    await server.register(Bell)
    addFacebook()
    addGoogle()

    ////////////////////////

    function addGoogle() {
        if (!googleClientId || !googleClientSecret) {
            console.warn('No google authentication configured')
            return
        }
        server.auth.strategy('google', 'bell', {
            provider: 'google',
            password: 'gesh56536gesh56536gesh56536gesh56536gesh56536gesh56536',
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            isSecure: isUsingHttps
        })
        server.route([
            {
                method: ['GET', 'POST'],
                path: '/login/google',
                // @ts-ignore
                config: {
                    auth: 'google',

                },
                handler: async (request, h) => {
                    if (!request.auth.isAuthenticated)
                        return {error: 'Authentication failed due to: ' + request.auth.error.message}

                    let creds: any = request.auth.credentials
                    try {
                        let session = await handleSSOLogin('google', creds.profile.id, creds.token, creds.profile.raw)
                        return h.redirect(`/post-login.html?sessionToken=${session.token}`)
                    } catch (e) {
                        return h.redirect(`/post-login?errorType=${e.errorType}&error=${e.error}`)
                    }
                }
            }]
        )
    }

    function addFacebook() {
        if (!facebookClientId || !facebookClientSecret) {
            console.warn('No Facebook authentication configured')
            return
        }

        server.auth.strategy('facebook', 'bell', {
            provider: 'facebook',
            password: 'gesh56536gesh56536gesh56536gesh56536',
            clientId: facebookClientId,
            clientSecret: facebookClientSecret,
            location: getWebServerUrl(),
            isSecure: isUsingHttps,
            scope(request) {
                return ['public_profile', 'email', 'user_friends', 'user_birthday'];
            }
        });
        server.route([
            {
                method: ['GET', 'POST'],
                path: '/login/facebook',
                // @ts-ignore
                config: {
                    auth: 'facebook',
                },
                handler: async (request, h) => {
                    if (!request.auth.isAuthenticated)
                        return {error: 'Authentication failed due to: ' + request.auth.error.message}

                    let creds: any = request.auth.credentials
                    try {
                        let session = await handleSSOLogin('facebook', creds.profile.id, creds.token, creds.profile.raw)
                        return h.redirect(`/post-login.html?sessionToken=${session.token}`)
                    } catch (e) {
                        return h.redirect(`/post-login?errorType=${e.errorType}&error=${e.error}`)
                    }
                }
            }
        ])
    }
}