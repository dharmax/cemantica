import {getDockerHostIp} from "./docker-support";
import {RunMode, runMode} from "./run-mode";
import {AppConfig} from "./app-config";

// logging related
export const loggingFolder = `${(process.env.LOG_FOLDER || '/opt/logs')}/${AppConfig.applicationName}/${RunMode[runMode].toString()}/`
export const journalCollectionMaxSize = 1000000
export const MAX_JOURNAL_QUERY_RESULTS = 250


// authentication services
export const forceAuthentication = (process.env.FORCE_AUTHENTICATION === 'true')
export const facebookClientId = process.env.FB_CLIENT_ID
export const facebookClientSecret = process.env.FB_CLIENT_SECRET
export const googleClientId = process.env.GOOGLE_CLIENT_ID
export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

// misc
export const INITIAL_SUPERUSER_PW = process.env.INITIAL_SUPERUSER_PW || 'iinspire'
export const INITIAL_SUPERUSER_EMAIL = process.env.INITIAL_SUPERUSER_EMAIL || 'd.harmax@gmail.com'
// ------------------------------------------------

export async function getDatabaseUrl() {
    const url = process.env.DB_URL
        || `mongodb://${(process.env.DB_HOST || await getDockerHostIp() || 'localhost')}:${(process.env.DB_PORT || 27017)}/${getDatabaseName()}`
    return url
}

export function getDatabaseName() {
    const auto = process.env.DB_NAME == 'auto'
    return auto ? `${AppConfig.applicationName}-${RunMode[runMode].toString()}`
        : process.env.DB_NAME || ''
}

