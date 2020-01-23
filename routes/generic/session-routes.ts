import * as joi from '@hapi/joi'
import * as boom from 'boom'

import * as SessionService from '../../services/generic/session-service'

export const sessionRoutes = [
    {
        method: 'GET',
        path: '/api/is-alive',
        config: {
            validate: {
                query: {
                    code: joi.number().optional()
                }
            },
            description: 'checks if the application is alive',
            notes: 'bla',
            tags: ['api', 'system']
        },
        handler: (request, h) => {
            return `Hello ${request.query.code || ''}!`;
        }
    },
    {
        method: 'GET',
        path: '/api/session/{token}',
        config: {
            validate: {
                params: {
                    token: joi.string().required()
                }
            },
            description: `Returns the current session object for the token.
                If the session is not recognizes, return "unknown". `,
            tags: ['system', 'api', 'session']
        },
        handler: async (request, reply) => {
            let s = await SessionService.getSessionByToken(request.params.token)
            return s ? s : {error: 'no-session'}
        }
    },



    {
        method: 'POST',
        path: '/api/session/login',
        config: {
            validate: {
                payload: {
                    email: joi.string().email().required(),
                    password: joi.string().min(1).max(80).required(),
                }
            }
            ,
            description: `Creates a session for an existing user`,
            tags: ['system', 'api', 'session']
        },
        handler: async (request, h) => {
            return h.handle(null, SessionService.loginUser, request.payload)
        }
    }
    ,
    {
        method: 'POST',
        path: '/api/session/signup',
        config:
            {
                validate: {
                    payload: {
                        name: joi.string().min(5).max(20).required(),
                        password: joi.string().min(6).max(80).required(),
                        email: joi.string().email().required(),
                        phone: joi.string().regex(/^\+?[0-9()-]+$/),
                        language: joi.string().length(2).default('en'),
                        country: joi.string().allow('Israel', 'USA').default('USA').optional()
                    }
                },
                description: `Sign up a new user`,
                tags: ['system', 'api', 'session']
            }
        ,
        handler: async (request, reply) => {
            try {
                if (request.payload.language) {
                    request.payload.preferences = {
                        language: request.payload.language
                    }
                    delete request.payload.language
                }
                const validationToken = await SessionService.startSignup(request.payload)
                return {validationToken}
            } catch (e) {
                if (e.message == "already exists")
                    return boom.conflict(e.toString())
                else
                    return boom.internal(e.toString())
            }
        }
    }
    ,
    {
        method: 'POST',
        path: '/api/session/signup/confirm',
        config: {
            validate: {
                payload: {
                    validationToken: joi.string().required(),
                    emailCode: joi.string().max(5).required(),
                    smsCode: joi.string().max(5),
                }
            }
            ,
            description: `Sign up a new user`,
            tags: ['system', 'api', 'session']
        },
        handler: async (request) => {
            try {
                const session = await SessionService.finalizeSignup(request.payload.validationToken, request.payload)
                return {session}
            } catch (e) {
                return boom.expectationFailed(e)
            }
        }
    },
    {
        method: 'GET',
        path: '/api/session/logout/{token}',
        config: {
            validate: {
                params: {
                    token: joi.string().required()
                }
            },
            description: `terminates a session`,
            tags: ['system', 'api', 'session']
        },
        handler: async (request, reply) => {
            try {
                await SessionService.logout(request.params.token)
                return "done"
            } catch (e) {
                return boom.badData(e)
            }
        }
    }
]