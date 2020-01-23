import dispatcher from "../lib/dispatcher"
// @ts-ignore
import * as SocketIO from 'socket.io-client'

let subscribed = false

export function subscribeToUserChannel(session) {
    if (subscribed)
        return
    subscribed = true

    let socket = SocketIO.connect()

    let heartBeat = 0
    let broadcastCounter = 0

    socket.emit('register', session.token)

    setInterval(() => {
        if (heartBeat && Date.now() - heartBeat > 4000) {
            // socket.disconnect()
            // socket.connect()
            // socket.emit('register', session.token)

        }
    })

    let counter = 1
    socket.on('heart-beat', (t, _counter) => {
        heartBeat = Date.now()
        counter++
    })

    socket.on('notification', (counter, eventData: {
        eventName,
        entityType,
        entityId,
        notificationId,
    }) => {
        if (counter <= broadcastCounter) {
            broadcastCounter = counter
            return
        }
        broadcastCounter = counter

        dispatcher.trigger('server', 'notification', eventData.eventName, eventData)
    })

    socket.on('error', e => console.error('-----', e))
}