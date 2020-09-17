import {sendTheMail} from "./user-notification-service";
import {ISession} from "./session-service";
import {UserFeedback} from "../model/generic-entities/user-feedback";


export const FeedbackService = {

    async submit(session: ISession, type: string, text: string): Promise<UserFeedback> {
        const user = await session.getUser()

        const userFeedback = await UserFeedback.create(session, type, text)

        if (user) {
            const userName = await user.getField('name')
            await sendTheMail(process.env.SUPPORT_EMAIL || 'whisperation.app@gmail.com',
                `${type} feedback from ${userName} (${userFeedback.id})`,
                `User <a href="http://www.whisperation.org/#user/${user.id}">${userName} says: \n ${text}`,
                `${userName} says: \n ${text}`)
        }

        return userFeedback
    }
}