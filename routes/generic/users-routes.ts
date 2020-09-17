import {
    decodePagination,
    joiGenderRule,
    joiIdOrSelfRule,
    joiIdRule,
    joiLanguage,
    readQueryValidator,
    readQueryValidatorPlain
} from "../routing-utils";
import * as joi from '@hapi/joi'
import {userController} from "../../model-controllers/user-controller";
import * as Boom from "boom";
import {RESET_PASSWORD_API_PATH} from "../../services/reset-password-service";

/**
 * First, we have the generic user related APIs and after that, application specific user related APIs
 */
export const userRoutes = [
    {
        method: 'POST',
        path: '/api/users/search',
        config: {
            validate: {
                payload: joi.object({
                    string: joi.string().required(),
                    projection: joi.array().items(joi.string().max(30))
                }).required()
            },
            description: "search-user. search by user's name or email. Returns by default id, fullname, city, pictureUrl",
            tags: ['api', 'user', 'search']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.searchUsers, request.payload.string, request.payload.projection)
        }
    },
    {
        method: 'POST',
        path: '/api/users/new',
        config: {
            validate: {
                payload: joi.object({
                    email: joi.string().email().required(),
                    name: joi.string().min(4).max(25).trim().required(),
                    realName: joi.string().max(25).trim(),
                    password: joi.string().max(130).required(),
                }).required()
            },
            description: 'Administrative operation for directly adding users',
            tags: ['api', 'user', 'admin']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.addUserDirectly, request.payload)
        }
    },
    {
        method: 'POST',
        path: '/api/users/resetProfilePicture',
        config: {
            validate: {
                payload: joi.object({
                    source: joi.string().required()
                }).required()
            },
            description: "reset-user-picture. re-set the user's profile picture. If the source says 'facebook' then " +
                "it is read from the facebook profile, otherwise it is treated as a url to a picture",
            tags: ['api', 'user', 'photo', 'profile']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.resetProfilePicture, request.payload.source)
        }
    },
    {
        method: 'POST',
        path: '/api/users/log',
        config: {
            validate: {
                payload: joi.object({
                    title: joi.string().max(512),
                    entries: joi.array().items(joi.object()).required()
                }).required()
            },
            description: "write-client-log. write a long entry to the client log",
            tags: ['api', 'user', 'logging', 'debug', 'support']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.writeToLog, request.payload)
        }
    },
    {
        method: 'GET',
        path: '/api/users/myProfile',
        config: {
            description: "get-self-profile. Get the requesting user's his own full profile",
            tags: ['api', 'user', 'profile']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getSelfProfile)
        }
    },
    {
        method: 'GET',
        path: '/api/users/{userId}',
        config: {
            validate: {
                params: joi.object({
                    userId: joiIdRule.required()
                }).required()
            },
            description: "get-public-profile",
            tags: ['api', 'user', 'profile']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getPublicProfile, request.params.userId)
        }
    }, {
        method: 'GET',
        path: RESET_PASSWORD_API_PATH + '{token}',
        config: {
            validate: {
                params: joi.object({
                    token: joi.string().required()
                }).required()
            },
            description: "The second phase of the reset password call (from the email). Redirects to a new page",
            tags: ['api', 'user', 'password', 'reset']
        },
        handler: async (request, h) => {
            return h.redirect(`/reset-password-page.html?token=${request.params.token}`)
        }
    },
    {
        method: 'POST',
        path: '/api/users/changePassword/{token}',
        config: {
            validate: {
                params: joi.object({
                    token: joi.string().optional()
                }).required(),
                payload: joi.object({
                    newPassword: joi.string().min(6).max(130)
                }).required()
            },
            description: "change-password-final. The final phase of the reset password - set a new password",
            tags: ['api', 'user', 'password', 'reset']
        },
        handler: async (request, h) => {
            return userController.changePassword(null, request.params.token, request.payload.newPassword)
        }
    },
    {
        method: 'POST',
        path: '/api/users/resetPassword',
        config: {
            validate: {
                payload: joi.object({
                    email: joi.string().email().required()
                }).required()
            },
            description: "reset-password-start. Create a password reset mini-session (and sends email)",
            tags: ['api', 'user', 'password', 'reset']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.resetPasswordRequest, request.payload.email)
        }
    },
    {
        method: 'GET',
        path: '/api/users/friends',
        config: {
            description: "get-friends. Get the requesting user's list of friends",
            tags: ['api', 'user', 'profile', 'friends']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getFriends)
        }
    },
    {
        method: 'PUT',
        path: '/api/users/{userId}',
        config: {
            validate: {
                params: joi.object({
                    userId: joiIdOrSelfRule.required()
                }).required(),
                payload: joi.object({
                    name: joi.string().min(4).max(25).trim(),
                    realName: joi.string().max(25).trim(),
                    generalBio: joi.string().max(1024),
                    gender: joiGenderRule,
                    city: joi.string().max(30),
                    address: joi.string().max(40),
                    isActive: joi.boolean(),
                    birthday: joi.date(),
                    country: joi.string().allow('Israel', 'USA'),
                    preferences: joi.object({
                        useMetric: joi.boolean(),
                        knownLanguages: joi.array().items(joiLanguage),
                        preferredLanguage: joiLanguage,
                        digestIntervalInDays: joi.number().min(0.5).default(7)
                    })
                }).required()
            },
            description: "update-user. Update a user information. Privilege subjected",
            tags: ['api', 'user', 'profile', 'privilege']
        },
        handler: async (request, h) => {
            try {
                return h.handle(userController, userController.updateUserPersonalData, request.params.userId, request.payload)
            } catch (e) {
                return Boom.badData(e.message)
            }
        }
    },

    {
        method: 'POST',
        path: '/api/users/changePhoneNumber',
        config: {
            validate: {
                payload: joi.object({
                    newNumber: joi.string().regex(/^\+?[0-9()-]+$/),
                    userId: joiIdRule
                }).required()
            },
            description: "Update a user phone number: first phase",
            tags: ['api', 'user', 'profile', 'phone']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.updateUserPhoneNumber, request.params.userId, request.payload.newNumber)
        }
    },
    {
        method: 'POST',
        path: '/api/users/confirmPhoneNumberChange',
        config: {
            validate: {
                payload: joi.object({
                    pin: joi.number().required(),
                    phone: joi.string().required()
                }).required()
            },
            description: "Update a user phone number: confirmation phase",
            tags: ['api', 'user', 'profile', 'phone']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.confirmPhoneNumberChange, request.payload.pin, request.payload.phone)
        }
    }, {
        method: 'GET',
        path: '/api/users',
        config: {
            validate: {
                query: readQueryValidator(30, '').required()
            },
            description: 'read user list',
            notes: 'user list is censored ',
            tags: ['api', 'system', 'privilege']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getAllUsers, decodePagination(request.query))
        }
    },

    {
        method: 'GET',
        path: '/api/users/managed-objects/{userId}',
        config: {
            validate: {
                params: joi.object({
                    userId: joiIdRule.required()
                }).required(),
                query: joi.object({
                    objectType: joi.string().min(3).max(15).required()
                    , ...readQueryValidatorPlain(100)
                }).required()
            },
            description: 'Returns a list of all the objects of the given type the use has ANY EXPLICIT role at.',
            tags: ['api', 'pagination', 'roles']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getManagedObjects, request.params.userId, request.query.objectType, decodePagination(request.query))
        }
    },
    {
        method: 'POST',
        path: '/api/users/subscribe',
        config: {
            validate: {
                payload: joi.object({
                    user: joiIdRule.required(),
                    state: joi.boolean().required()
                }).required()
            },
            description: "Subscribe or unsubscribe to a user. Return friendship record (see get-friendship)",
            tags: ['api', 'user', 'subscription']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.subscribe, request.payload.user, request.payload.state)
        }
    },
    {
        method: 'GET',
        path: '/api/users/friendship',
        config: {
            validate: {
                query: joi.object({
                    sourceId: joiIdRule.required(),
                    targetId: joiIdRule.required(),
                }).required()
            },
            description: "Return {follows:boolean, followed:boolean, friend:boolean}",
            tags: ['api', 'user', 'subscription', 'friendship']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getFriendship, request.query.sourceId, request.query.targetId)
        }
    },
    {
        method: 'GET',
        path: '/api/users/subscriptions',
        config: {
            validate: {
                query: joi.object({
                    userId: joiIdRule,
                }).required()
            },
            description: "Return subscriptions and subscribers for a user (or self)",
            tags: ['api', 'user', 'subscription']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getSubscriptions, request.query.userId)
        }
    },
    {
        method: 'GET',
        path: '/api/users/rating',
        config: {
            validate: {
                query: joi.object({
                    userId: joiIdRule,
                    entityId: joiIdRule.required(),
                    entityType: joi.string().max(30),
                }).required()
            },
            description: "Return rating and comments for the entity given by the user",
            tags: ['api', 'user', 'rating', 'comments']
        },
        handler: async (request, h) => {
            const q = request.query;
            return h.handle(userController, userController.getUserRatingEntry, q.userId, q.entityId, q.entityType)
        }
    },

    {
        method: 'POST',
        path: '/api/users/rate',
        config: {
            validate: {
                payload: joi.object({
                    entityId: joiIdRule.required(),
                    entityType: joi.string().max(30).required(),
                    value: joi.number().min(1).max(10).required(),
                    comment: joi.string().max(8000).allow('')
                }).required()
            },
            description: "Rate an entity",
            tags: ['api', 'user', 'rating', 'comments']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.addRatingEntry, request.payload)
        }
    },
    {
        method: 'POST',
        path: '/api/users/feedback',
        config: {
            validate: {
                payload: joi.object({
                    type: joi.string().allow('Bug', 'Question', 'Suggestion', 'Other').required(),
                    text: joi.string().max(8000).required()
                }).required()
            },
            description: "feedback submission",
            tags: ['api', 'user', 'feedback']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.submitFeedback, request.payload)
        }
    }, {
        method: 'GET',
        path: '/api/users/notifications/count',
        config: {
            validate: {},
            description: 'get user unread notifications count',
            tags: ['api', 'user', 'notifications', 'count']

        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getNotificationsCount)
        }
    }, {
        method: 'GET',
        path: '/api/users/notifications',
        config: {
            validate: {
                query: joi.object({
                    includingUnread: joi.boolean().default(true)
                }).required()
            },
            description: 'get user pending notifications',
            tags: ['api', 'user', 'notifications']

        },
        handler: async (request, h) => {
            return h.handle(userController, userController.getNotifications, request.query.includingUnread)
        }
    }, {
        method: 'POST',
        path: '/api/users/notifications/read/{id}',
        config: {
            validate: {
                params: joi.object({
                    id: joiIdRule.required()
                }).required(),
                payload:
                    joi.object({
                        isRead: joi.boolean().default(true)
                    }).required()
            },
            description: 'set the read flag of a notification. Return new notification unread count. Emits notification:status-changed event',
            tags: ['api', 'user', 'notifications']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.setNotificationRead, request.params.id, request.payload.isRead)
        }
    },
    {
        method: 'DELETE',
        path: '/api/users/notifications/{id}',
        config: {
            validate: {
                params: joi.object({
                    id: joiIdRule.required()
                }).required()
            },
            description: 'delete a notification. Return new notification unread count. Emits notification:deleted event',
            tags: ['api', 'user', 'notifications']
        },
        handler: async (request, h) => {
            return h.handle(userController, userController.removeNotification, request.params.id)
        }
    }

]
