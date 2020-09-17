import * as Request from 'request-promise-native'
import * as mongo from "mongodb";
import {MongoClientOptions} from "mongodb";
import equal from 'fast-deep-equal';
import {getDatabaseName, getDatabaseUrl} from "../config/deployment";


export function compareObjects(result, expected, objectName) {

    let errors = 0
    for (let e of Object.entries(expected)) {
        const res = equal(result[e[0]], e[1])
        if (!res) {
            console.error(`In ${objectName}, ${e[0]} is ${result[e[0]]} while it was supposed to be ${e[1]} `)
            errors++
        }
    }
    return errors
}

export class Api {
    constructor(private baseUrl) {
    }


    async api(session, url, ...args) {
        url = this.baseUrl + url
        args[0] = args[0] || {}


        const headers: any = session ? {'session-token': session.token} : {}
        const json = args[0].json || true

        Object.assign(args[0], {
            json,
        }, {
            headers
        })
        try {
            // @ts-ignore
            const result = await Request.call(this, url, ...args)
            return result
        } catch (e) {
            console.error(e.toString())
            throw e
        }
    }

    async post(session, url: string, data: Object) {
        return this.api(session, url, {method: 'POST', json: data})
    }


    async put(session, url: string, data: Object) {
        return this.api(session, url, {method: 'PUT', json: data})
    }

    async remove(session, url: string, query?: Object) {
        return Request.delete(this.baseUrl + url, Object.assign({qs: query}, session && {
            headers: {'session-token': session.token}
        } || {}))
    }
}


export async function purgeDatabase() {
    const dbClient = await mongo.MongoClient.connect(await getDatabaseUrl(), <MongoClientOptions>{useNewUrlParser: true})
    await dbClient.db(getDatabaseName()).dropDatabase()
}

export function showDeltas(values: number[]) {
    let prev
    values.forEach(v => {
        if (!prev) {
            prev = v
            return
        }
        let delta = v - prev
        prev = v
        console.log(delta)
    })
}