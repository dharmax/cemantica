// notification related configuration
import {RunMode, runMode} from "./run-mode";

export const useSms = false
export const dontSendMail = runMode !== RunMode.production && !process.env.FORCE_SEND_EMAIL
export const sendLoginNotifications = false
export const dontConfirmEmail = false

export const userListIsPublic = true

export const sessionTTLSeconds = 60 * 60 * 24 * 2

export const extraMessageTemplatesRoot = null