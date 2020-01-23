import {RunMode, runMode} from "./run-mode";

export const webServerHost = process.env.HOSTNAME || 'localhost'
export const webServerPort = process.env.PORT && parseInt(process.env.PORT) || 3000
export const isUsingHttps = process.env.USE_HTTPS || runMode == RunMode.production
export const protocol = isUsingHttps ? 'https' : 'http'

export const getWebServerUrl = () => protocol + '://' + webServerHost + ':' + webServerPort
export const getWebServerUrlNoPort = () => protocol + '://' + webServerHost
