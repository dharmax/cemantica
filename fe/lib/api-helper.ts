import {buildUrl} from './build-url'
import {Alert} from "../services/alert-service";

export const baseUrl = window.location.origin

export interface IReadOptions {
    from: number
    count: number
    entityOnly?: boolean
    queryName?: string
    queryParams?: Object
    sort?: SortSpec
    projection?: string[]
    requestNumber?: number // created automatically
}

export type SortSpec = { [fieldName: string]: 1 | -1 }

export interface IReadResult {
    error?: string
    items: any[]
    total?: number
    totalFiltered: number
    opts?: IReadOptions
}

export async function post(url: string, data: object, conf_: any = {}) {
    return callApi(url, 'post', Object.assign(conf_, {
        body: JSON.stringify(data)
    }))
}

export async function remove(url: string, conf_: any = {}) {
    return callApi(url, 'delete')
}


export async function put(url: string, data: object, conf_: any = {}) {
    return callApi(url, 'put', Object.assign(conf_, {
        body: JSON.stringify(data)
    }))
}

const Spinner = {
    counter: 0,
    get spinner() {
        return document.body.getElementsByClassName('spinner')[0] as HTMLElement
    },
    show() {
        this.counter++
        const s = this.spinner
        if (s)
            s.style.visibility = 'visible'
    },
    hide() {
        if (--this.counter)
            return
        const s = this.spinner
        if (s)
            s.style.visibility = 'hidden'
    }
}

export async function callApi(url: string, method: 'post' | 'get' | 'delete' | 'put' = 'get', conf_: any = {}) {
    const conf: RequestInit = {
        ...conf_,
        method,
        mode: 'cors',
        headers: new Headers({
            'session-token': localStorage.sessionToken,
        })
    }
    try {
        Spinner.show()
        const response = await fetch(baseUrl + '/api/' + url, conf).then(r => r.json())
        if (response.error) {
            // noinspection ExceptionCaughtLocallyJS
            throw `${response.error} (${response.statusCode}): ${response.message}`
        }
        return response
    } catch (e) {
        console.warn(JSON.stringify(e))
        Alert(e.message || JSON.stringify(e))
        throw e
    } finally {
        Spinner.hide()
    }
}

let counter = 10000 * Math.trunc(Math.random() * 1000)

function enumerate() {
    return counter++
}

export class StoreApi {

    constructor(protected baseResourceUrl: string) {
    }

    load(opt_: IReadOptions, ...pathParams: string[]): Promise<IReadResult> {
        const opt = {...opt_}
        opt.queryParams && (opt.queryParams = JSON.stringify(opt.queryParams))
        return callApi(buildUrl(this.baseResourceUrl, {
            queryParams: opt,
            path: pathParams
        }))
    }

    remove(itemId: string | number, ...pathParams: string[]) {
        pathParams = pathParams || []
        return remove([this.baseResourceUrl, ...pathParams, itemId].join('/'))
    }

    create(entity: Object, ...pathParams: string[]) {
        return post(this.baseResourceUrl + ['', ...pathParams].join('/'), entity)
    }

    operation(operationName: string, data?: any, ...pathParams: string[]) {
        return post(this.baseResourceUrl + ['', operationName, ...pathParams].join('/'), data)
    }

    getEntity(id: string, opts?: Object, ...pathParams: string[]) {
        return callApi(buildUrl(`${this.baseResourceUrl}${id ? '/' + id : ''}`, {
            path: pathParams,
            queryParams: opts
        }))
    }

    get(pathParams: string | string[], queryParams?: Object) {
        return callApi(buildUrl(this.baseResourceUrl, {
            path: Array.isArray(pathParams) ? pathParams : [pathParams],
            queryParams: queryParams
        }))
    }

    update(id: string, fields: Object, ...pathParams: string[]) {
        return put(buildUrl(`${this.baseResourceUrl}${id ? '/' + id : ''}`, {
            path: pathParams
        }), fields)
    }
}
