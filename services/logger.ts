import * as bunyan from "bunyan";
import {AbstractEntity, User} from "../model/generic-entities/abstract-entity";
import {all} from 'bluebird'
import * as mongo from 'mongodb'

import {MongoStream} from "../lib/mongo-stream";
import {storageEventEmitter} from "./storage-event-emitter";
import {existsSync, mkdirSync} from "fs";
import {ISession} from "./session-service";
import {journalCollectionMaxSize, loggingFolder, MAX_JOURNAL_QUERY_RESULTS} from "../config/deployment";
import {IClientLogQuery, IClientLogQueryResultEntry} from "../lib/common-generic-types";


if (!existsSync(loggingFolder))
//@ts-ignore
    mkdirSync(loggingFolder, {recursive: true})

export class LoggedException extends Error {

    constructor(message?: string, object?: any) {
        const text = object ? message + ' ' + JSON.stringify(object) : message
        super(text)
        log.error(text)
        console.error(text)
    }
}

const loggers = {
    log: bunyan.createLogger({
        name: 'app-log',
        streams: [
            {
                type: 'rotating-file',
                path: loggingFolder + 'debug.log',
                period: '1d',   // daily rotation
                count: 2        // keep 3 back copies
            },
            {
                stream: process.stdout
            }]

    }),
    journal: bunyan.createLogger({
        name: 'journal',
        streams: [{
            path: loggingFolder + 'journal.log'
        }]
    }),
    clientLog: bunyan.createLogger({
        name: 'clientLog',
        streams: [
            {
                type: 'rotating-file',
                path: loggingFolder + 'client.log',
                period: '1d',   // daily rotation
                count: 2        // keep 3 back copies
            },
            {
                stream: process.stdout
            }]

    }),

}

const loggerCollections = new Map<string, mongo.Collection>()

export async function queryJournal(query: Object): Promise<any[]> {
    return loggerCollections.get('journal').find(query).limit(MAX_JOURNAL_QUERY_RESULTS).sort({time: -1}).toArray()
}

export async function queryClientLog(query: IClientLogQuery): Promise<IClientLogQueryResultEntry[]> {
    const col = loggerCollections.get('clientLog')


    // first, we find the headers relevant to the query

    const dbQuery: any = {};

    (query.reportRangeStart || query.reportRangeEnd) && (dbQuery.time = {})
    query.reportRangeStart && (dbQuery.time.$gte = query.reportRangeStart.toISOString())
    query.reportRangeEnd && (dbQuery.time.$lte = query.reportRangeEnd.toISOString())
    dbQuery.group = query.group
    dbQuery.userId = query.userId
    dbQuery.title = {$exists: true}

    const reportHeaders = await col.find(dbQuery).limit(query.limit / 8).toArray()

    let counter = query.limit

    // ... then, we create the results by querying the events per each user log report

    const results: IClientLogQueryResultEntry[] = []
    for (let r of reportHeaders) {
        const entry = {
            group: r.group,
            userId: r.userId,
            userEmail: r.userEmail,
            reportTime: r.writeTime,
            title: r.title,
            entries: undefined
        }
        results.push(entry)
        !query.justHeaders && (entry.entries = await col.find({group: r.group}).limit(counter).toArray())
        counter -= entry.entries.length
    }

    return results
}

/**
 * This method is called when the database is up. It connects the Journal with the database.
 */
storageEventEmitter.addListener('connected', async e => {

    const db = <mongo.Db>e.database;

    ['journal', 'clientLog'].forEach(addOutputStream)


    async function addOutputStream(name: string) {

        const options = {
            capped: true,
            size: journalCollectionMaxSize,
        }
        const collection = await db.createCollection(name, options)
        loggerCollections.set(name, collection)
        // noinspection JSIgnoredPromiseFromCall
        collection.createIndex({time: 1, user: 1})
        // noinspection JSIgnoredPromiseFromCall
        collection.createIndex({time: 1, action: 1})
        const stream = new MongoStream(collection, (doc: any) => {
            doc.time = new Date(doc.time)
            return doc
        })
        addLogStream(name, stream, 'mongo-' + name)
        console.info(`Added ${name} database stream`)
    }
})


function addLogStream(whichLog: string, stream, name) {
    const logger = loggers[whichLog]
    const oldStream = logger.streams.findIndex(s => s.name === name)
    if (oldStream >= 0)
        logger.streams.splice(oldStream, 1)

    logger.addStream({stream, name})
}

export const log = loggers.log
export const clientLog = loggers.clientLog

interface IEntitySpec {
    entityId: string,
    entityType: string
}

export function journal(who: string | ISession, action: string, entity: IEntitySpec | AbstractEntity, data: any, resultPromise?: PromiseLike<any>) {

    const userId = typeof who === 'string' ? who : who.userId

    // @ts-ignore
    const entityId = entity && (entity.id || entity.entityId)
    // @ts-ignore
    const entityType = entity && (entity.entityType || entity.typeName())
    if (!resultPromise)
        logIt(null, null)
    else {
        all([resultPromise]).timeout(3000, 'journal timeout').then(r => logIt(null, r)).catch(e => logIt(e, null))

    }

    function logIt(error, result) {
        if (error) {
            loggers.journal.error({userId, action, entityId, entityType, data, error})
            loggers.log.error({
                userId,
                action,
                entityId,
                entityType,
                data,
                error
            }, 'via journal')
        } else {
            loggers.journal.info({
                userId,
                action,
                entityId,
                entityType,
                data,
                result: 'ok'
            })
        }
    }
}

export async function addClientLogReport(user: User, data: { title: string, entries: Object[] }) {

    const writeDate = new Date()
    const group = writeDate.getTime().toString(36)
    const userEmail = await user.getField('email')
    const logHeader = {
        time: writeDate,
        group,
        title: data.title || 'log-header',
        userEmail,
        logLines: data.entries.length
    };
    clientLog.info(logHeader)
    data.entries.forEach(e => {
        clientLog.info(Object.assign({group, time: writeDate, userId: user.id}, e))
    })
    return logHeader
}