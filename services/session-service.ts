import {storage, StorageSession} from './storage'
import {userController} from "../model-controllers/user-controller";
import {journal, log, LoggedException} from "./logger";
import {PermissionGroup, User} from "../model/generic-entities";
import {getTemplate, notifyUser, sendEmail, sendSms} from "./user-notification-service";
import {deleteSessionByToken, findSessionByToken, refreshSession, storeSession} from "./session-storage";
import {AppConfig, forceAuthentication, runMode, RunMode} from "../config";
import {checkPermissionForUserId, SSOProviderName, stringHash, verifyFacebookAuthData} from "../lib";
import * as Boom from 'boom'
import {Socket} from "socket.io";
import {AccessType} from "./privilege-service";


const userId2sessionTokenLookup = {};

export async function startSignup(userInfo): Promise<string> {

    log.info('starting signup processPodUploadData for ' + userInfo.name)
    // check existence of such a user
    const exists = await checkIfAlreadyExists(userInfo)
    if (exists) {
        log.info(`aborting signup process for ${userInfo.name} (already exists)`)
        throw new LoggedException("already exists")
    }


    const entry = {
        date: Date.now(),
        token: '' + Math.floor(Math.random() * 10000000),
        emailCode: Math.floor(Math.random() * 9000) + 1000,
        smsCode: Math.floor(Math.random() * 9000) + 1000,
        userInfo
    }

    if (!AppConfig.dontConfirmEmail)
        sendEmailSignupCode(userInfo.email, entry.emailCode, userInfo.preferences.language)
    if (AppConfig.useSms)
        sendSmsSignupCode(userInfo.phone, entry.smsCode, userInfo.language, userInfo.country)

    await saveSignupEntry(entry)

    // random housekeeping
    if (Math.random() < 0.02)
        cleanObsoleteSignupEntries()

    return entry.token
}

export async function finalizeSignup(registrationtoken, signupCodes, force = false) {

    let entry = await findSignUpEntry(registrationtoken)
    if (!entry) {
        log.info(`Failed to finalize signup process (no valid token)`)
        throw "No such validation token"
    }
    log.info(`finalizing signup process for ${entry.name}`)

    if (!isTestUser(entry.userInfo)) {
        if (force && AppConfig.useSms) {
            if (entry.smsCode !== signupCodes.smsCode)
                throw "Bad phone code"
        }

        if (!force && "" + entry.emailCode !== signupCodes.emailCode)
            throw "Bad email code"
    } else {
        if (entry.userInfo.email == 'superuser@test.com') {
            if (runMode == RunMode.test) {
                entry.userInfo.isAdmin = true
                log.info('Signing up a test only superuser')
            } else {
                // noinspection ES6MissingAwait
                deleteSessionByToken(entry.token)
                throw 'Attempt to sign up a superuser in production. Ignored and logged.'
            }
        }
    }

    // noinspection ES6MissingAwait
    deleteSignUpEntry(entry.token)

    let user = await createNewUser(entry.userInfo)


    const newSession = await signInUserById(user.id)
    journal(newSession, 'joined', user, {})
    return newSession
}

export async function logout(sessionToken) {
    const session = await getSessionByToken(sessionToken)
    delete userId2sessionTokenLookup[session.userId]
    return deleteSessionByToken(sessionToken)
}

export async function getSessionByUser(userId: string) {
    const sessionToken = userId2sessionTokenLookup[userId]
    if (!sessionToken)
        return null
    return getSessionByToken(sessionToken)
}

export async function loginUser(sessionDummy: any, loginInfo: { email: string, password: string, applicationId?: string }): Promise<ISession | Boom> {
    let col = await storage.collectionForEntityType(User)
    let user = <User>await col.findOne({email: loginInfo.email}, ['_id', 'password', 'name', 'isAdmin', 'lastAction', 'email', 'profileFilled'])

    if (!user)
        return Boom.unauthorized('email not found')
    if (runMode === RunMode.production || forceAuthentication) {
        const dbPassword = await user.getField('password')
        if (dbPassword !== loginInfo.password)
            return Boom.unauthorized('bad password')
    }
    const session = await createUserSession(user, {applicationId: loginInfo.applicationId})
    // noinspection ES6MissingAwait
    user.update({lastActive: new Date()})
    journal(user.id, 'login', null, await user.getField('name'))
    // noinspection ES6MissingAwait
    AppConfig.sendLoginNotifications && notifyUser(user, getTemplate('LoginNotification'), {date: new Date()})
    return getSessionByToken(session.token)
}

//////////////////////////////////////////////////////////////
function sendEmailSignupCode(email, emailCode, language: string) {
    // noinspection JSIgnoredPromiseFromCall
    sendEmail(email, language, getTemplate('EmailAddressConfirmation'), {
        emailCode
    })
    return true
}

function sendSmsSignupCode(phone, smsCode, language: string, country: string) {
    // noinspection JSIgnoredPromiseFromCall
    sendSms(phone, country, language, getTemplate('PhoneNumberConfirmation'), {
        smsCode
    })
    return true
}

// ---------------------------------------------------------
// Database access section

const SignUpRequestMap = {}

async function checkIfAlreadyExists(userInfo) {
    for (let e of (<any>Object).values(SignUpRequestMap)) {
        if (userInfo.email == e.email || userInfo.phone && userInfo.phone == e.phone)
            return true
    }

    const exists = await storage.collectionForEntityType(User).then(col => col.findOne(
        userInfo.phone ? {$or: [{email: userInfo.email}, {phone: userInfo.phone}]} : {email: userInfo.email}))

    if (exists) {
        log.info(`aborting signup process for ${userInfo.name} (email/phone taken)`)
        throw "Email/phone already exists in our user base"
    }

    return false
}

async function saveSignupEntry(entry) {

    SignUpRequestMap[entry.token] = entry
    return entry.token
}

function cleanObsoleteSignupEntries() {

    const TTL = 1000 * 60 * 15

    for (let k in SignUpRequestMap) {
        const entry = SignUpRequestMap[k]
        if (entry.date - Date.now() > TTL)
            delete SignUpRequestMap[k]
    }
}

async function findSignUpEntry(validationToken: string) {
    return SignUpRequestMap[validationToken]
}

async function deleteSignUpEntry(token) {
    delete SignUpRequestMap[token]
}

async function createNewUser(userInfo) {
    return User.createNew(User, userInfo)
}

export async function getSessionByToken(token: string) {
    if (!token)
        return null
    const s = await findSessionByToken(token)
    if (!s)
        return null
    // populate the properties that isn't required to be kept in a database
    // noinspection ES6MissingAwait
    Object.assign(s, {
        apiVersion: AppConfig.apiVersion,
        sessionId: '' + stringHash(s.userId),
        getUser: async () => s.userId && User.createFromDB(User, s.userId.toString())
    })
    userId2sessionTokenLookup[s.userId] = s.token
    // update the lastAction time
    // noinspection JSIgnoredPromiseFromCall,ES6MissingAwait
    refreshSession(s)
    return s
}


async function createUserSession(user: User, data?: any): Promise<ISession> {
    let sessionToken = "" + Math.floor(Math.random() * 1000 * 1000 * 1000)
    const isAdmin = await checkPermissionForUserId(user.id, await PermissionGroup.getAdminsGroup(), AccessType.Manage)
    const session: ISession = {
        token: sessionToken,
        name: await user.getField('name'),
        userId: user.id,
        start: Date.now(),
        lastAction: Date.now(),
        apiVersion: "2.0.0",
        isAdmin,
        data,
        getUser: () => User.createFromDB(User, user.id.toString()) as Promise<User>
    }
    userId2sessionTokenLookup[user.id] = sessionToken
    // noinspection JSIgnoredPromiseFromCall,ES6MissingAwait
    storeSession(session)

    return session
}

async function signInUserById(userId, sessionData?): Promise<ISession> {
    const col = await storage.collectionForEntityType(User)
    const user = <User>await col.findById(userId, ['isAdmin'])
    if (!user)
        return null
    return createUserSession(user, sessionData);

}

// export async function handleFacebookLogin(facebookId, fbAccessToken, fbProfileData): Promise<ISession> {
//
//     // find the user using the facebook ID
//     let user: User = await userController.findUser({facebookId})
//     if (user) {
//         // user definitely exists, we log her in and keep the fbAccessToken in the session
//         let session = await createUserSession(user, {fbAccessToken})
//
//         // check and handle inconsistencies if there are any
//         let error = handleDataConsistency(fbProfileData, user)
//
//         if (error)
//             throw {errorType: 'ProfileInconsistency', error}
//
//         return session
//
//     } else {
//         // now we'll try to find the user by the email instead
//         user = await userController.findUser({email: fbProfileData.email})
//         if (user) {
//             if (await user.getField('facebookId')) {
//                 // if we're here, it means there's a mismatch between the current FB id and the one on our records
//                 return handleFacebookIdMismatch(facebookId, fbProfileData, user)
//             } else {
//                 // if we're here, it means we didn't have the facebook ID until now, so we'll keep it
//                 registerFacebookInfo(user, fbProfileData)
//
//                 // sign in the user and keeps the fb access token in the session, in case it would be needed
//                 return createUserSession(user, {fbAccessToken})
//             }
//         } else {
//             // if we're here, it means the user is new
//             return signupByFacebook(facebookId, fbAccessToken, fbProfileData)
//         }
//     }


export async function userByProviderId(provider: SSOProviderName, providerUserId) {
// find the user using the provider ID
    let user: User = await userController.findUser({[provider + 'Id']: providerUserId})
    return user;
}

// }
export async function handleSSOLogin(provider: SSOProviderName, providerUserId, providerAccessToken, providerProfileData): Promise<ISession> {
    let user = await userByProviderId(provider, providerUserId);
    if (user) {
        // user definitely exists, we log her in and keep the fbAccessToken in the session
        let session = await createUserSession(user, {[provider + 'AccessToken']: providerAccessToken})

        // check and handle inconsistencies if there are any
        let error = handleDataConsistency(provider, providerProfileData, user)

        if (error)
            throw {errorType: 'ProfileInconsistency', error}

        return session

    } else {
        // now we'll try to find the user by the email instead
        user = await userController.findUser({email: providerProfileData.email})
        if (user) {
            if (await user.getField(provider + 'Id')) {
                // if we're here, it means there's a mismatch between the current provider id and the one on our records
                return handleProviderIdMismatch(provider, providerUserId, providerProfileData, user)
            } else {
                // if we're here, it means we didn't have the facebook ID until now, so we'll keep it
                // noinspection JSIgnoredPromiseFromCall
                registerProviderInfo(provider, user, providerProfileData)

                // sign in the user and keeps the fb access token in the session, in case it would be needed
                return createUserSession(user, {[provider + 'AccessToken']: providerAccessToken})
            }
        } else {
            // if we're here, it means the user is new
            return signupByProvider(provider, providerUserId, providerAccessToken, providerProfileData)
        }
    }
}

async function signupByProvider(provider: SSOProviderName, providerId: string, providerAccessToken: string, profileData): Promise<ISession> {

    let user = await userByProviderId(provider, providerId)
    if (!user) {
        profileData [provider + 'Id'] = providerId
        user = await User.createNew(User, profileData)
    }
    return signInUserById(user.id)
}

// noinspection JSUnusedLocalSymbols
async function handleProviderIdMismatch(provider, providerId, providerProfileData, userRecord): Promise<ISession> {

    throw {
        errorType: 'IdMismatch',
        error: `Strange. There's already a user with that email, but with a different ${provider} account.`
    }

}

async function registerProviderInfo(provider: string, user: User, providerProfileData: any) {
    // let pictureUrl = await getUserPhoto(providerProfileData.id)
    return user.update({
        gender: providerProfileData.gender,
        [provider + 'Id']: providerProfileData.id,
        // pictureUrl
    })
}

// noinspection JSUnusedLocalSymbols
function handleDataConsistency(provider, providerProfileData, userRecord): string {
    // TODO
    return null
}


export interface ISession {
    ip?: string
    webSocketClient?: Socket
    sessionId?: string;
    token?: string
    isAdmin?: boolean
    name?: string
    userId?: string
    start?: number
    lastAction?: number
    profileFilled?: boolean
    data?: any
    apiVersion: string
    dbSession?: StorageSession
    getUser: () => Promise<User>
}

function isTestUser(user: any) {
    return user.email.includes('@test.com')
}

export async function clientDrivenFacebookLogin(authData: any) {

    await verifyFacebookAuthData(authData)

    const user = await userByProviderId('facebook', authData.id)

    return createUserSession(user, authData)


}
