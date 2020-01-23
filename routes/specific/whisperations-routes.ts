import {whisperationController} from "../../model-controllers/specific/whisperations-controller";
import * as joi from '@hapi/joi'
import {joiIdOrSelfRule, joiIdRule, ReadQueryValidator} from "../routing-utils";

export const whisperationRoutes = [
    {
        method: 'GET',
        path: '/api/whisperations/featured',
        config: {
            description: `return currently active whisperations`,
            tags: ['api', 'whisperations', 'active']
        },
        handler: async (request, tk) => {

            return tk.handle(whisperationController, whisperationController.getFeatured)

        }
    }, {
        method: 'GET',
        path: '/api/whisperations/by-writer/{writerId}',
        config: {
            validate: {
                params: {
                    writerId: joiIdOrSelfRule.required()
                }
            },
            description: `return writer created whisperations`,
            tags: ['api', 'whisperations', 'writer']
        },
        handler: async (request, tk) => {

            const wid = request.params.writerId;
            return tk.handle(whisperationController, whisperationController.getByWriter,
                wid == 'self' ? null : wid)

        }
    },
    {
        method: 'POST',
        path: '/api/whisperations',
        config: {
            validate: {
                payload: {
                    items: joi.array().items(joi.string().max(40)),
                }
            },
            description: `create a new whisperations`,
            tags: ['api', 'whisperations', 'create']
        },
        handler: async (request, tk) => {

            return tk.handle(whisperationController, whisperationController.create, request.payload.items)

        }
    },
    {
        method: 'GET',
        path: '/api/whisperations/{wid}',
        config: {
            validate: {
                params: {
                    wid: joiIdRule
                }
            },
            description: `get a single whisperation`,
            tags: ['api', 'whisperations', 'create']
        },
        handler: async (request, tk) => {

            return tk.handle(whisperationController, whisperationController.get, request.params.wid)

        }
    },
    {
        method: 'GET',
        path: '/api/whisperations',
        config: {
            validate: {
                query: new ReadQueryValidator(10)
            },
            description: `load whisperations`,
            tags: ['api', 'whisperations', 'pagination']
        },
        handler: async (request, tk) => {

            return tk.handle(whisperationController, whisperationController.load, request.query)

        }
    },

    {
        method: 'DELETE',
        path: '/api/whisperations/{wid}',
        config: {
            validate: {
                params: {
                    wid: joiIdRule
                }
            },
            description: `delete a whisperation`,
            tags: ['api', 'whisperations', 'delete']
        },
        handler: async (request, tk) => {

            return tk.handle(whisperationController, whisperationController.remove, request.params.wid)

        }
    },
    {
        method: 'POST',
        path: '/api/whisperations/flag',
        config: {
            validate: {
                payload: {
                    id: joiIdRule,
                    type: joi.string().max(15),
                    reason: joi.string().max(140)
                }
            },
            description: `flag a whisperation`,
            tags: ['api', 'whisperations', 'flag']
        },
        handler: async (request, tk) => {

            const rp = request.payload;
            return tk.handle(whisperationController, whisperationController.flag, rp.id, rp.type, rp.reason)

        }
    },
    {
        method: 'PUT',
        path: '/api/whisperations/{wid}',
        config: {
            validate: {
                params: {
                    wid: joiIdRule
                },
                payload: {
                    adultOnly: joi.boolean()
                }
            },
            description: `change whisperation fields`,
            tags: ['api', 'whisperations', 'edit']
        },
        handler: async (request, tk) => {

            const rp = request.payload;
            return tk.handle(whisperationController, whisperationController.update, request.params.wid, rp)

        }
    },


]