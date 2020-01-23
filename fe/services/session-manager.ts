import dispatcher from "../lib/dispatcher";
import {getQueryParam} from "../lib/utils";
import {callApi, post} from "../lib/api-helper";
import {Alert} from "./alert-service";
import {subscribeToUserChannel} from "./server-pubsub";

export class Session {
    token: string
    userId: string
}

let session: Session = null

/**
 * @return session if true
 */
export function isLoggedIn(): Session {
    return session
}

export async function getSession(reset?: boolean) {

    if (session && !reset)
        return session

    if (reset)
        ['sessionToken', 'username', 'password'].forEach((s) => localStorage.removeItem(s))

    let sessionToken = localStorage['sessionToken'] || getQueryParam('sessionToken')

    if (sessionToken) {
        session = await loadSession(sessionToken)
        if (!session.userId)
            localStorage.removeItem('sessionToken')
    } else {
        let [username, password] = getLocalCredentials()
        if (username) try {
            session = await passwordLogin(username, password)
        } catch (e) {
            if (e.indexOf('401') != -1) {
                delete localStorage.username
            }
        }
    }

    return rememberSession(session)
}

export async function logout() {
    session && session.token && await fetch(`/api/session/logout/${session.token}`)
    session = null
    dispatcher.trigger('logout()', 'session:dropped', null)
    return getSession(true)
}

export async function signup(details: any, remember: boolean): Promise<Session> {

    let serverReply: any = await post('session/signup', details)
    if (remember) {
        localStorage['username'] = details.email
        localStorage['password'] = details.password
    }
    if (!serverReply.validationToken)
        throw "Server error"

    return serverReply.validationToken
}

export async function finalSignupPhase(emailCode, smsCode, validationToken): Promise<Session> {

    let serverReply = await post('session/signup/confirm', {
        validationToken,
        emailCode,
        smsCode
    })
    if (serverReply.error) {
        Alert(serverReply.message || serverReply.error)
        return null
    }

    return rememberSession(serverReply.session)
}

export async function passwordLogin(email: any, password: any, rememberMe = true): Promise<Session> {
    const session: any = await post('session/login', {
        email,
        password
    })
    if (!session)
        return null
    if (rememberMe) {
        localStorage['password'] = password
        localStorage['username'] = email
    }
    // dispatcher.triggerAsync('session-manager', 'session', 'login')
    return rememberSession(session)
}

export function ssoLogin(provider, nextUrl) {
    localStorage.nextUrl = nextUrl
    window.location.href = '/login/' + provider
}


function rememberSession(_session) {
    session = _session
    if (_session) {
        localStorage['sessionToken'] = _session && _session.token
        subscribeToUserChannel(session)
        dispatcher.trigger("getSession", 'session:login', _session)
    } else
        delete localStorage['sessionToken']
    return _session
}

function getLocalCredentials() {
    return [localStorage['username'], localStorage['password']]
}

export async function loadSession(sessionToken: any): Promise<Session> {
    try {
        let s = await callApi(`session/${sessionToken}`)
        return rememberSession(s)
    } catch (e) {
        return rememberSession(null)
    }
}
