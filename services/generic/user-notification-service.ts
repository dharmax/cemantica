import {User} from "../../model/generic-entities/user-entity";
import {rootPath} from "../../root-path";

import {lstatSync, readdirSync, readFileSync} from "fs";
import {all, promisify} from "bluebird";
import {join} from "path";
import 'juice'
import {fromString} from 'html-to-text'
import * as nodeMailer from 'nodemailer'
import {log, LoggedException} from "./logger";
import * as Nexmo from 'nexmo'
import {applicationName} from "../../config/deployment";
import {Readable} from "stream";
import {Url} from "url";
import {dontSendMail, extraMessageTemplatesRoot} from "../../config/app-config";
import juice = require("juice");

// noinspection JSUnusedGlobalSymbols
export async function notifyUsers(userIds: string[], template: MessageTemplate, data: Object) {
    return all(userIds.map(uid => notifyUser(uid, template, data)))
}

export async function notifyUser(_user: string | User, template: MessageTemplate, data: Object, phone?: string): Promise<void> {
    if (!template)
        throw new LoggedException('No such template')
    let user = _user['_id'] ? <User>_user : await User.createFromDB(User, _user)
    return template.send(data, user, phone)
}

export async function sendEmail(email: string | string[], language: string, template: MessageTemplate, data: Object, attachments?: MailAttachment[]): Promise<void> {
    if (typeof email !== 'string') {
        email = [...(new Set(email)).values()]
    }
    return template.sendEmail(email, language, data, attachments)
}

export async function sendSms(phoneNumber: string, country: string, language: string, template: MessageTemplate, data: Object): Promise<void> {
    return template.sendSms(prefixPhone(phoneNumber, country), language, data)
}

class MessageTemplate {

    // configuration
    email: boolean = undefined
    sms: boolean = undefined
    push: boolean = undefined

    // cache
    private htmlTemplate: string
    private subjectTemplate: string;
    private smsTemplate: string;

    constructor(public readonly rootDir) {
    }

    /**
     * send the notification via the template's configured medias
     * @param data
     * @param user
     * @param phone
     */
    async send(data, user, phone?: string): Promise<void> {
        const language = (await user.getField('preferences'))['language'] || 'en'

        if (this.email !== false) {
            const userEmail: string = await user.getField('email')
            this.sendEmail(userEmail, language, data)
        }
        if (this.sms !== false) {
            const userPhone: string = phone || await user.getField('phone')
            if (userPhone) {
                const phoneNumber = prefixPhone(userPhone, await user.getField('country'))
                this.sendSms(phoneNumber, language, data)
            }
        }

    }

    async sendEmail(email: string | string[], language, data, attachments?: MailAttachment[]): Promise<void> {
        const {text, html, subject} = await this.renderEmail(language, data)
        return sendTheMail(email, subject, html, text, attachments)
    }

    sendSms(phoneNumber: string, language: string, data: Object): Promise<void> {
        let text = this.renderSms(language, data)
        return sendTheSms(phoneNumber, text)
    }

    renderSms(language: string, data: Object) {

        if (!this.smsTemplate) {
            let dir = this.templatePath('sms', language)
            try {
                let path = join(dir, 'sms.template.txt')
                this.smsTemplate = readFileSync(path, "utf-8")
            } catch (err) {
                throw err
            }
        }

        return this.smsTemplate.replace(/\{\{(.*?)\}\}/g, function (match, token) {
            return data[token];
        })
    }

    private getEmailTemplate(language): { htmlTemplate, subjectTemplate } {
        if (!this.htmlTemplate) {
            const folder = this.templatePath('email', language)
            try {
                const path = join(folder, 'html.template.html')
                this.htmlTemplate = readFileSync(path, "utf-8")
            } catch (err) {
                this.email = false
                log.error(err)
                throw err
            }
            try {
                this.subjectTemplate = readFileSync(join(folder, 'subject.template.txt'), "utf-8")

            } catch (err) {
                this.subjectTemplate = getDefaultSubject(language)
            }
        }
        return {
            htmlTemplate: this.htmlTemplate,
            subjectTemplate: this.subjectTemplate
        }
    }

    private renderEmail(language, data): { html: string, text: string, subject: string } {

        const {htmlTemplate, subjectTemplate} = this.getEmailTemplate(language)

        let html = htmlTemplate.replace(/\{\{(.*?)\}\}/g, function (match, token) {
            return data[token];
        })
        const subject = subjectTemplate.replace(/\{\{(.*?)\}\}/g, function (match, token) {
            return data[token];
        })
        html = juice(html)
        const text = fromString(html)
        return {html, text, subject}
    }

    private templatePath(media: string, language: string) {
        return join(this.rootDir, media, language)
    }
}

// @ts-ignore
const nexmo = new Nexmo({
    apiKey: process.env.NEXMO_API_KEY || '6385cd01',
    apiSecret: process.env.NEXMO_API_SECRET || '8bcfc62954b93e98'
}, {
    // If true, log information to the console
    debug: true,
    // append info the the User-Agent sent to Nexmo
    // e.g. pass 'my-app' for /nexmo-node/1.0.0/4.2.7/my-app
    appendToUserAgent: null,
    // Set a custom logger
    logger: log
});

// @ts-ignore
const nexmoSendSms: (...args) => Promise<any> = promisify(nexmo.message.sendSms)

function sendTheSms(phoneNumber: string, text: string): Promise<any> {
    return nexmoSendSms(applicationName, phoneNumber, text, {type: 'unicode'})

}

function getDefaultSubject(language) {
    let s = {
        he: 'הודעת מערכת',
        en: applicationName + ' Notification'
    }
    return s[language] || s['en']
}

const TransportConfig = {
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_TRANSPORT_USER,
        pass: process.env.EMAIL_TRANSPORT_PW,
    }
}
const transporter = nodeMailer.createTransport(TransportConfig);

export interface MailAttachment {
    /** String, Buffer or a Stream contents for the attachment */
    content?: string | Buffer | Readable;
    /** path to a file or an URL (data uris are allowed as well) if you want to stream the file instead of including it (better for larger attachments) */
    path?: string | Url;
    /** filename to be reported as the name of the attached file, use of unicode is allowed. If you do not want to use a filename, set this value as false, otherwise a filename is generated automatically */
    filename?: string | false;
}

export async function sendTheMail(userEmail: string | string[], subject: string, html: string, text: string, attachments?: MailAttachment[]): Promise<any> {

    if (!dontSendMail)
        return transporter.sendMail({
            from: TransportConfig.auth.user,
            to: userEmail,
            attachments,
            subject,
            text,
            html
        })
    else {
        console.group(`Would have emailed ${userEmail} on production:`)
        console.info(text)
        console.groupEnd()
        return {}
    }
}

export function prefixPhone(orgNumber: string, countyName: string) {
    const prefix = PhonePrefixes[countyName]
    if (orgNumber.startsWith(prefix))
        return orgNumber
    return prefix + (orgNumber.startsWith('0') ? orgNumber.substr(1) : orgNumber)
}

let PhoneNumberConfirmationLookup = new Map<number, any>()

export async function initializePhoneNumberChange(userId, phone): Promise<any> {
    let user = <User>await User.createFromDB(userId, ['country'])
    let country: string = await user.getField('country')
    let pin = Math.ceil(Math.random() * 1000)
    PhoneNumberConfirmationLookup.set(pin, {
        userId,
        phone,
        when: Date.now
    })
    if (Math.random() > 0.995) { // event 200 times, average
        let maxAge = Date.now() - 1000 * 60 * 10 // 10 minutes
        for (let [k, v] of PhoneNumberConfirmationLookup) {
            if (v.when < maxAge) {
                PhoneNumberConfirmationLookup.delete(k)
            }
        }
    }
    return notifyUser(user, getTemplate('PhoneNumberConfirmation'), {smsCode: pin}, prefixPhone(phone, country))
}

export async function confirmPhoneNumberChange(pin: number, phone: string) {
    const entry = PhoneNumberConfirmationLookup.get(pin)
    if (!entry || entry.phone != phone)
        throw new LoggedException('Bad PIN code')

    const user = await User.createFromDB(User, entry.userId)
    const res = user.update({phone: entry.phone})
    PhoneNumberConfirmationLookup.delete(pin)
    return res
}

const PhonePrefixes = {
    Israel: '972',
    USA: '1'
}


let templateDictionary: { [x: string]: MessageTemplate } = null

export function getTemplate(name): MessageTemplate {
    if (!templateDictionary) {
        initTemplates(join(rootPath, '..', 'message-templates'))
        extraMessageTemplatesRoot && initTemplates(extraMessageTemplatesRoot)
    }

    return templateDictionary[name]

    function initTemplates(baseFolder) {

        const directories = readdirSync(baseFolder)
            .map(name => [name, join(baseFolder, name)])
            .filter(pair => lstatSync(pair[1]).isDirectory())

        templateDictionary = {}
        for (const [name, dirName] of directories) {
            templateDictionary[name] = new MessageTemplate(dirName)
        }
    }
}


