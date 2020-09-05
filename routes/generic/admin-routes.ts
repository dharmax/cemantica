import * as joi from "@hapi/joi"
import {adminController} from "../../model-controllers/generic/admin-controller";
import {decodePagination, joiIdRule, readQueryValidator} from "../routing-utils";

export const adminRoutes = [
    {
        method: 'POST',
        path: '/api/admin/journal/query',
        config: {
            validate: {
                payload: joi.object({
                    from: joi.date(),
                    to: joi.date().default(new Date().getTime() + 5 * 60000), // this is the now, with the strange offset the logger write...
                    query: joi.object().default({})
                }).required(),
            },
            description: `query-journal. perform a query over the journal`,
            tags: ['api', 'journal', 'admin', 'query', 'log']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.queryJournal, new Date(request.payload.from), new Date(request.payload.to), request.payload.query)
        }
    },
    {
        method: 'POST',
        path: '/api/admin/client-log/query',
        config: {
            validate: {
                payload: joi.object({
                    reportRangeStart: joi.date(),
                    reportRangeEnd: joi.date(),
                    userId: joiIdRule,
                    eventRangeStart: joi.date(),
                    eventRangeEnd: joi.date(),
                    limit: joi.number().integer().positive().default(100),
                    group: joi.string().alphanum().max(10),
                    text: joi.string().max(40).optional()
                }).required(),
            },
            description: `query-client-log. perform a query over the the client report`,
            tags: ['api', 'client log', 'admin', 'query', 'log']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.queryClientLog, request.payload)
        }
    },
    {
        method: 'DELETE',
        path: '/api/admin/entity/{entityType}/{entityId}',
        config: {
            validate: {
                params: joi.object({
                    entityType: joi.string().alphanum().max(20).required(),
                    entityId: joiIdRule.required()
                }).required()
            },
            description: `delete-entity. Deletes an entity. Used mostly for admin and testing/debugging`,
            tags: ['api', 'system', 'admin', 'database', 'debug']
        },
        handler: async (request, h) => {

            return h.handle(adminController, adminController.deleteEntity, request.params.entityType, request.params.entityId)
        }
    },
    {
        method: 'GET',
        path: '/api/admin/entity/{entityType}/{entityId}',
        config: {
            validate: {
                params: joi.object({
                    entityType: joi.string().alphanum().max(20).required(),
                    entityId: joiIdRule.required(),
                }).required(),
                query: joi.object({
                    oDepth: joi.number().positive().integer().default(1),
                    iDepth: joi.number().positive().integer().default(1),
                }).required()
            },
            description: `get-entity. Get an entity. Used mostly for admin and testing/debugging`,
            tags: ['api', 'system', 'admin', 'database', 'debug']
        },
        handler: async (request, h) => {

            return h.handle(adminController, adminController.queryEntity, request.params, request.query)
        }
    }, {
        method: 'GET',
        path: '/api/admin/ontology',
        config: {
            description: `get-ontology. returns the ontology`,
            tags: ['api', 'db', 'admin', 'database', 'ontology']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.getOntology)
        }
    },
    {
        method: 'GET',
        path: '/api/admin/browse/{entityType}',
        config: {
            validate: {
                params: joi.object({
                    entityType: joi.string().max(40)
                }).required(),
                query: readQueryValidator(50).required(),
            },
            description: `browse-entities-simple. browse a specific entity Type`,
            tags: ['api', 'db', 'admin', 'database', 'ontology', 'pagination', 'query']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.browseEntities, request.params.entityType, decodePagination(request.query))
        }
    },
    {
        method: 'POST',
        path: '/api/admin/browse/{entityType}',
        config: {
            validate: {
                params: joi.object({
                    entityType: joi.string().max(40)
                }).required(),
                query: readQueryValidator(50).required(),
                payload: joi.object({
                    query: joi.object()
                }).required()
            },
            description: `browse-entities-query. browse a specific entity Type`,
            tags: ['api', 'db', 'admin', 'database', 'ontology', 'pagination', 'query']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.browseEntities, request.params.entityType, request.query, decodePagination(request.payload.query))
        }
    },
    {
        method: 'GET',
        path: '/api/admin/xray/{entityType}/{entityId}',
        config: {
            validate: {
                params: joi.object({
                    entityType: joi.string().max(40),
                    entityId: joiIdRule
                }).required(),
                query: readQueryValidator(50),
            },
            description: `xray-entity. xray a specific entity`,
            tags: ['api', 'db', 'admin', 'database', 'ontology', 'pagination', 'query']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.xrayEntity, request.params.entityType, request.params.entityId, decodePagination(request.query))
        }
    },

    {
        method: 'PUT',
        path: '/api/admin/set-admin-role/{roleName}/{userId}',
        config: {
            validate: {
                params: joi.object({
                    roleName: joi.allow('Admin', 'SubAdmin').required(),
                    userId: joiIdRule.required(),
                }).required(),
                payload: joi.object({
                    on: joi.boolean().default(true)
                }).required()
            },
            description: `Set or unset an admin role`,
            tags: ['api', 'admin', 'permissions']
        },
        handler: async (request, h) => {
            const rp = request.params;
            return h.handle(adminController, adminController.setAdminRole, rp.userId, rp.roleName, request.payload.on)
        }
    },
    {
        method: 'GET',
        path: '/api/admin/get-admins',
        config: {
            validate: {},
            description: `Get all members of admin group`,
            tags: ['api', 'admin', 'permissions']
        },
        handler: async (request, h) => {
            return h.handle(adminController, adminController.getAllAdmins)
        }
    },
    {
        method: 'POST',
        path: '/api/admin/changeEntity/{type}/{id}',
        config: {
            validate: {
                params: joi.object({
                    type: joi.string().max(30).required(),
                    id: joiIdRule.required(),
                }).required(),
                payload: joi.object({
                    fieldName: joi.string().max(40).required(),
                    fieldValue: joi.string().max(40000).required(),
                }).required()
            },
            description: `Modifies any entity`,
            tags: ['api', 'admin', 'modify', 'edit', 'change', 'entity']
        },
        handler: async (request, h) => {
            const rp = request.params;
            return h.handle(adminController, adminController.changeEntity, rp, request.payload)
        }
    },
]