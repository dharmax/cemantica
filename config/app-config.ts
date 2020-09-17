// notification related configuration
import {RunMode, runMode} from "./run-mode";

export const AppConfig = {
    useSms: false,
    dontSendMail: runMode !== RunMode.production && !process.env.FORCE_SEND_EMAIL,
    sendLoginNotifications: false,
    dontConfirmEmail: false,
    userListIsPublic: true,
    sessionTTLSeconds: 60 * 60 * 24 * 2,
    extraMessageTemplatesRoot: null,
    rootPath: '.',
    applicationName: '',
    apiVersion: '1.0.0',
    debugTimeOffset: 0
}