import {storage} from "./storage";
import {getTemplate, notifyUser} from "./user-notification-service";
import {getWebServerUrlNoPort} from "../config/server-address";
import {LoggedException} from "./logger";
import {User} from "../model/generic-entities";

export const RESET_PASSWORD_API_PATH = '/api/user/confirmResetPassword/';

const HOUSE_CLEAN_PERIOD = 1000 * 60 * 60 * 6

const ResetSessions: { [token: string]: { when: number, userId: any } } = {}

export async function startProcess(email: string) {

    let col = await storage.collectionForEntityType(User)
    let user = <User>await col.findOne({email}, ['email', 'name'])

    if (!user)
        throw new LoggedException('email not found')

    const token = Math.floor(Math.random() * 1000000000).toString(36)


    const resetUrl = getWebServerUrlNoPort() + RESET_PASSWORD_API_PATH + token

    await notifyUser(user, getTemplate('ResetPasswordMail'), {
        name: await user.getField('name'),
        token,
        resetUrl
    })
    await addSession(token, user)
    return {resetPassword: "started"}
}

export async function finalizeResetPassword(token: string, newPassword: string) {

    const resetSession = await getResetSession(token)
    if (!resetSession)
        throw new LoggedException('Bad token (perhaps expired?)')

    const col = await storage.collectionForEntityType(User)
    const user: User = <User>await col.findOne({_id: resetSession.userId}, ['password'])

    await notifyUser(user, getTemplate('PasswordChanged'), {
        name: await user.getField('name')
    })
    await user.update({password: newPassword})
    return {resetPassword: "done"}
}

function getResetSession(token) {
    return ResetSessions[token]
}

setInterval(cleanOld, HOUSE_CLEAN_PERIOD)

function cleanOld() {
    const now = Date.now()
    for (const [k, v] of Object.entries(ResetSessions)) {
        if (now - v.when > HOUSE_CLEAN_PERIOD)
            delete ResetSessions[k]
    }
}


function addSession(token, user) {
    ResetSessions[token] = {
        when: Date.now(),
        userId: user._id
    }
}

