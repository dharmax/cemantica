import dispatcher from "../lib/dispatcher";
import {prettyJSON} from "../lib/utils";

export class Message {
    message
    type
    options: IAlertOptions
    time
}

export class AlertQueue {
    alerts: Message[] = []
}

export const alertQueue = new AlertQueue()

export interface IAlertOptions {
    duration?: number
    persist?: boolean
    modal?: boolean
    class?: string
}

export function Alert(message, type = 'error', options: IAlertOptions = {}) {
    if (typeof message == 'object')
        message = prettyJSON(message)
    alertQueue.alerts.push({message, type, options, time: Date.now()})
    if (!console[type]) {
        type = 'error'
        message += ' and wrong Alert message type'
    }
    console[type](message)

    dispatcher.trigger('alert-service', 'alert:fired', alertQueue.alerts)

}

export function Info(message, options: IAlertOptions = {}) {
    Alert(message, 'info', options)
}

const OLD_AGE = 4000

// house clean
setInterval(() => {
    const now = Date.now()
    let filtered = alertQueue.alerts.filter((a: Message) => {
        if ((now - a.time) < (a.options.duration || OLD_AGE))
            return true
        return a.options.persist;
    })

    if (filtered.length !== alertQueue.alerts.length) {
        alertQueue.alerts = filtered
        dispatcher.trigger('alert-service', 'alert:cleared', alertQueue.alerts)
    }
}, 1000)

