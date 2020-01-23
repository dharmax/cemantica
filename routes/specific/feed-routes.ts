import * as joi from '@hapi/joi'
import {feedController} from "../../model-controllers/specific/feed-controller";

export const feedRoutes = [
    {
        method: 'GET',
        path: '/api/feed/recent',
        config: {
            validate: {
                query: {
                    from: joi.number().integer().default(0),
                    count: joi.number().integer().default(100)
                }
            },
            description: `read recent feed items`,
            tags: ['api', 'feed']
        },
        handler: async (request, tk) => {
            return tk.handle(feedController, feedController.recent, request.query.from, request.query.count)
        }
    }
]