import * as joi from '@hapi/joi'
import {taxonomyController} from "../../model-controllers/generic/taxonomy-controller";

export const taxonomy = [
    {
        method: 'GET',
        path: '/taxonomy/lookup/{locale}/{topic}',
        config: {
            validate: {
                query: {
                    string: joi.string().allow('').default(''),
                },
                params: {
                    locale: joi.string().required(),
                    topic: joi.string().required(),
                },
            },
            description: `perform a lookup of strings in the taxonomy`,
            notes: `the topic is the parent node in the taxonomy`,
            tags: ['api', 'general', 'lookup']
        },
        handler: async (request, reply) => {
            reply.handle(taxonomyController, taxonomyController.lookup, request.query.string, request.params.topic, request.params.locale)
        }
    },

]