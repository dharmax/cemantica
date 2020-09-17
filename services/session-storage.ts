import {ISession} from "./session-service";
import {storage} from "./storage";


import NodeCache from "node-cache";
import {AppConfig} from "../config";

const cache = new NodeCache({stdTTL: 360})

{
    /**
     * This are house keeping operations related to sessions
     */

    setInterval(cleanObsoleteSessions, AppConfig.sessionTTLSeconds * 1000)
    setInterval(updateActiveUsersLastActiveField, 1000 * 60 * 30)
    setTimeout(updateActiveUsersLastActiveField, 5000)
}


async function getSessionCollection() {
    return storage.collection('activeSessions', col => {
        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex('token', {})
        // noinspection JSIgnoredPromiseFromCall
        col.ensureIndex('lastAction', {})


    })
}

// const ActiveSessions = null

export async function findSessionByToken(token): Promise<ISession> {

    let s = <ISession>cache.get(token)
    if (!s) {
        s = <ISession>await getSessionCollection().then(ss => ss.findOne({token}))
        cache.set(token, s)
    }

    return s
}

export async function storeSession(session: ISession) {
    const storedSession = {
        userName: session.name,
        userId: session.userId,
        token: session.token,
        start: session.start,
        lastActive: session.lastAction,
        data: session.data,
        isAdmin: session.isAdmin
    }

    getSessionCollection().then(ss => ss.append(storedSession))
    cache.set(session.token, storedSession)
}

export async function refreshSession(session: ISession) {
    getSessionCollection().then(ss => ss.updateDocumentUnsafe(session['_id'], {lastAction: Date.now()}))
}

export async function deleteSessionByToken(sessionToken: string) {
    cache.del(sessionToken)
    return getSessionCollection().then(ss => ss.deleteByQuery({sessionToken}))
}


async function cleanObsoleteSessions() {

    const col = await getSessionCollection()

    const threshold = Date.now() - AppConfig.sessionTTLSeconds * 1000

    // delete the inactive sessions
    const result = await col.deleteByQuery({
        lastAction: {$lt: threshold}
    })

    return result
}

async function updateActiveUsersLastActiveField() {

    const col = await getSessionCollection()
    const usersCollections = await storage.collectionForEntityType(this.constructor)
    const now = new Date()

    const sessions = await col.findGenerator({}, {projection: ['userId']})
    for await (const s of sessions)
        // noinspection ES6MissingAwait
        usersCollections.updateDocumentUnsafe(s['userId'], {lastActive: now})

}

