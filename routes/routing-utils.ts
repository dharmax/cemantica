import * as joi from '@hapi/joi'
import {Schema} from '@hapi/joi'

export type ProjectionPredicateItem = {
    pName: string
    in: boolean
    limit: number
    projection: ProjectionItem[]
}

export type ProjectionItem = string | ProjectionPredicateItem

export function readQueryValidator(pageSize: number, ...defaultProjection: ProjectionItem[]) {

    // @ts-ignore
    return joi.object(readQueryValidatorPlain(...arguments))
}

export function readQueryValidatorPlain(pageSize: number, ...defaultProjection: ProjectionItem[]) {

    defaultProjection = defaultProjection.map(i =>
        (typeof i === 'string' ? i : JSON.stringify(i).replace(/\,/g, '$$$'))
    )
    return {
        from: joi.number().default(0),
        count: joi.number().default(pageSize),
        queryParams: joi.string().max(200),
        queryName: joi.string().max(20),
        sort: joi.string().regex(/^(\w+:-?1,?)+$/),
        entityOnly: joi.boolean().default(true),
        projection: joi.string().default(defaultProjection.join(','))
    }
}


export function decodePagination(pagination) {

    let pp = pagination.projection
    if (pp) {
        pp = pp.split(',').map(fn => fn.trim()).filter(s => s.length)
            .map(i => {
                if (i.startsWith('{')) {
                    i = i.replace(/\$\$/g, ',')
                    i = JSON.parse(i)
                }
                return i
            })
        pagination.projection = pp.length ? pp : undefined

    }
    let ps = pagination.sort
    if (ps) {
        ps = ps.split(',').map(fn => fn.trim()).filter(s => s.length)
            .reduce((a, s) => {
                const [key, dir] = s.split(':')
                a[key] = parseInt(dir)
                return a
            }, {})
        pagination.sort = Object.keys(ps) ? ps : undefined
    }
    if (pagination.queryParams)
        pagination.queryParams = JSON.parse(pagination.queryParams)
    return pagination
}

export const activityTypes = ['run', 'cycling']

export const joiCronStringRule = joi.string().regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
export const joiIdRule: Schema = joi.string().regex(/\S*_\S+_\S+/).max(70)
export const joiIdOrSelfRule = joiIdRule.concat(joi.string().allow('self'))
export const joiGenderRule = joi.string().allow('male', 'female')
export const joiLanguage = joi.string().allow('en', 'he')

export class JoiRoleRule {

    entityId = joiIdRule.required()
    userId = joiIdRule.required()
    roleName
    set = joi.boolean().default(true)

    constructor(...allowedRoles: string[]) {
        this.roleName = joi.string().allow(...allowedRoles).required()
    }
}

export interface IReportRequestConf {
    projection?: string[]
    copyToCaller?: boolean
    startDate: Date
    endDate: Date
    sendToDefaultTargets?: boolean
    extraTargets: string[]
    limit: number
}

export class ReportRequestValidator {

    constructor() {
        Object.assign(this, {
            projection: joi.array().items(joi.string()),
            copyToCaller: joi.boolean().default(false),
            startDate: joi.date().required(),
            endDate: joi.date().default(new Date()),
            sendToDefaultTargets: joi.boolean().default(true),
            extraTargets: joi.array().items(joi.string().email()).default([]),
            limit: joi.number().default(10000)
        })
    }
}