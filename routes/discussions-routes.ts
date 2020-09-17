import {decodePagination, joiIdRule, readQueryValidator} from "./routing-utils";
import {discussionController} from "../model-controllers/discussion-controller";
import * as joi from '@hapi/joi'
import {PostTypes} from "../model/discussion-entity";
import {enum2array} from "../lib/arrays";

export const discussionRoutes = [
    {
        method: 'GET',
        path: '/api/discussion/{rootEntityId}',
        config: {
            validate: joi.object({
                params: joi.object({
                    rootEntityId: joiIdRule
                }).required(),
                query: readQueryValidator(100, 'body', 'type', 'touched', 'typeSpecificFields', 'title', '_created', '_lastUpdate', {
                        pName: 'posted-by',
                        limit: 1,
                        in: false,
                        projection: ['name', 'pictureUrl', 'gender']
                    }
                ).required()
            }).required(),
            description: `read a discussion posts`,
            tags:
                ['api', 'discussion', 'posts', 'pagination']
        },
        handler: async (request, tk) => {
            return tk.handle(discussionController, discussionController.load, decodePagination(request.query), request.params.rootEntityId)
        }
    },
    {
        method: 'GET',
        path: '/api/discussion/communityDiscussionRootId',
        config: {
            validate: joi.object({}).required(),
            description: `return root id for general community discussions`,
            tags:
                ['api', 'discussion', 'rootid']
        },
        handler: async (request, tk) => {
            return tk.handle(discussionController, discussionController.getCommunityDiscussionRootId)
        }
    },
    {
        method: 'POST',
        path:
            '/api/discussion',
        config:
            {
                validate: joi.object({
                    payload: {
                        rootEntityId: joiIdRule,
                        title: joi.string().max(30),
                        body: joi.string().max(280),
                        type: joi.allow(...enum2array(PostTypes)).default('Normal'),
                        extra: joi.object({})
                    }
                }).required(),
                description: `read a discussion posts`,
                tags:
                    ['api', 'discussion', 'posts', 'pagination']
            }
        ,
        handler: async (request, tk) => {
            const rp = request.payload;
            return tk.handle(discussionController, discussionController.post, rp.rootEntityId, rp.title, rp.body, rp.type, rp.extra)
        }
    }
    ,
]