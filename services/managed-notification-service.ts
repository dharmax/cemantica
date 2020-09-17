import {AbstractEntity, User} from "../model/generic-entities/abstract-entity";
import {Notification} from "../model/generic-entities/notification-entity";
import {getSessionByToken, getSessionByUser, ISession} from "./session-service";
import {Server as HapiServer} from "@hapi/hapi";
import * as SocketIO from "socket.io";
import {Mutex} from "../lib/mutex";
import {log} from "./logger";

class ManagedNotificationService {

    async notify(subject: AbstractEntity, eventName: string, relatedEntities: { [role: string]: AbstractEntity } = {}, message?: string, variables?: Object) {

        const targets = await subject.getInterestedParties(eventName) as User[]
        for (let target of targets) {
            relatedEntities.subject = subject
            const notification = await Notification.create(target, eventName, relatedEntities, message, variables)

            // direct websocket notification
            const activeSession = await getSessionByUser(target.id)
            if (!activeSession)
                continue

            emitNotification(activeSession, eventName, subject, notification);
        }
    }
}

export const managedNotificationService = new ManagedNotificationService()

const socketMap: { [x: string]: SocketIO.Socket } = {}

export function initBroadcastService(serverToUse?: HapiServer) {
    const io = SocketIO(serverToUse.listener)
    const registerMutex = new Mutex()


    io.on('connection', function (client: SocketIO.Socket) {

            client.once('register', async sessionToken => {

                const session = await getSessionByToken(sessionToken)
                if (!session) {
                    log.warn('Attempt to register by an unknown session token')
                    return
                }

                registerSocket(sessionToken);

            })

            function registerSocket(sessionToken) {
                client['sessionToken'] = sessionToken
                socketMap[sessionToken] = client

                let counter = 1
                client['heartBeat'] = setInterval(() => {
                    client.emit('heart-beat', Date.now(), counter++)
                }, 2000)
            }

        }
    )

}

let broadcastCounter = 1

export interface IBroadcastMessage {
    eventName: string
    notificationType?: string
    entityType?: string
    entityId?: string
    notificationId?: string
    field?: string
    value?: any
    notificationCount?: number
    isRead?: boolean
}

export function emitMessage(session: ISession, topic: string, message: IBroadcastMessage) {
    const socket = socketMap[session.token]
    if (!socket) {
        log.error('Unexpected: No socket for session')
        return
    }
    socket.emit(topic, broadcastCounter++, message)
}

function emitNotification(session: ISession, notificationName: string, subject: AbstractEntity, notification) {

    const message: IBroadcastMessage = {
        eventName: 'created',
        notificationType: notificationName,
        entityType: subject.typeName(),
        entityId: subject.id,
        notificationId: notification.id,
    }
    emitMessage(session, 'notification', message);
}
