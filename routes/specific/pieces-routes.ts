import {decodePagination, joiIdOrSelfRule, joiIdRule, ReadQueryValidator} from "../routing-utils";
import {piecesController} from "../../model-controllers/specific/pieces-controller";
import * as joi from '@hapi/joi'
import {PieceListingType, PieceStatus} from "../../lib/common-specific-types";
import {enum2array} from "../../lib/arrays";

export const piecesRoutes = [
    {
        method: 'GET',
        path: '/api/pieces/load/{type}',
        config: {
            validate: {
                params: {
                    type: joi.allow(...enum2array(PieceListingType)),
                },
                query: new ReadQueryValidator(30, 'text', 'language', 'tags', 'title', '_created', '_lastUpdate')
            },
            description: `read a bunch of pieces. Instead of text, it returns shorter sampleText per item`,
            tags: ['api', 'pieces', 'pagination']
        },
        handler: async (request, tk) => {
            return tk.handle(piecesController, piecesController.load, decodePagination(request.query), request.params.type)
        }
    }, {
        method: 'GET',
        path: '/api/pieces/{id}',
        config: {
            validate: {
                params: {
                    id: joiIdRule.required()
                }
            },
            description: `read one piece with full data`,
            tags: ['api', 'pieces']
        },
        handler: async (request, tk) => {

            return tk.handle(piecesController, piecesController.getPiece, request.params.id)

        }
    }, {
        method: 'GET',
        path: '/api/pieces/by-whisperation/{wid}',
        config: {
            validate: {
                params: {
                    wid: joiIdRule.required()
                }
            },
            description: `read a whisperation inspired  pieces`,
            tags: ['api', 'pieces', 'whisperation']
        },
        handler: async (request, tk) => {

            const wid = request.params.wid;
            return tk.handle(piecesController, piecesController.getByWhisperation, wid)

        }
    }, {
        method: 'GET',
        path: '/api/pieces/by-writer/{wid}',
        config: {
            validate: {
                params: {
                    wid: joiIdOrSelfRule.required()
                }
            },
            description: `read writer's pieces`,
            tags: ['api', 'pieces']
        },
        handler: async (request, tk) => {

            const wid = request.params.wid;
            return tk.handle(piecesController, piecesController.getByWriter, wid == 'self' ? null : wid)

        }
    },
    {
        method: 'PUT',
        path: '/api/pieces/{pid}',
        config: {
            validate: {
                params: {
                    pid: joiIdRule.required()
                },
                payload: {
                    text: joi.string().min(20),
                    title: joi.string().min(2),
                    type: joi.allow('story', 'poem', 'article'),
                    language: joi.allow('en', 'he'),
                    adultOnly: joi.boolean(),
                    status: joi.allow('hidden', 'private', 'limited', 'draft', 'published', 'banned')
                }
            },
            description: `update a piece data`,
            tags: ['api', 'pieces', 'update', 'privilege']
        },
        handler: async (request, tk) => {

            const rp = request.payload;
            return tk.handle(piecesController, piecesController.update, request.params.pid, rp)

        }
    },

    {
        method: 'POST',
        path: '/api/pieces',
        config: {
            validate: {
                payload: {
                    whisperationId: joiIdRule.required(),
                    piece: joi.object({
                        text: joi.string().min(20).required(),
                        title: joi.string().min(2).required(),
                        type: joi.allow('story', 'poem', 'article').required(),
                        language: joi.allow('en', 'he'),
                        status: joi.allow(...enum2array(PieceStatus)),
                        adultOnly: joi.boolean().default(false)
                    })
                }
            },
            description: `read a bunch of pieces`,
            tags: ['api', 'pieces', 'pagination']
        },
        handler: async (request, tk) => {

            const rp = request.payload;
            return tk.handle(piecesController, piecesController.create, rp.whisperationId, rp.piece)

        }
    },
    {
        method: 'PUT',
        path: '/api/pieces/status/{pid}/{status}',
        config: {
            validate: {
                params: {
                    pid: joiIdRule.required(),
                    status: joi.allow(...enum2array(PieceStatus)).required()
                }
            },
            description: `change a piece status`,
            tags: ['api', 'pieces', 'status']
        },
        handler: async (request, tk) => {

            const rp = request.params;
            return tk.handle(piecesController, piecesController.changePieceStatus, rp.pid, rp.status)

        }
    },
    {
        method: 'DELETE',
        path: '/api/pieces/{pid}',
        config: {
            validate: {
                params: {
                    pid: joiIdRule.required(),
                }
            },
            description: `delete a piece`,
            tags: ['api', 'pieces', 'status']
        },
        handler: async (request, tk) => {

            const rp = request.params;
            return tk.handle(piecesController, piecesController.deletePiece, rp.pid)

        }
    }, {
        method: 'POST',
        path: '/api/pieces/flag',
        config: {
            validate: {
                payload: {
                    id: joiIdRule,
                    type: joi.string().max(15),
                    reason: joi.string().max(140)
                }
            },
            description: `flag a piece`,
            tags: ['api', 'piece', 'flag']
        },
        handler: async (request, tk) => {

            const rp = request.payload;
            return tk.handle(piecesController, piecesController.flag, rp.id, rp.type, rp.reason)

        }
    },
]