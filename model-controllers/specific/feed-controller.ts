import {ISession} from "../../services/generic/session-service";
import {feedService} from "../../services/specific/FeedService";

export const feedController = {

    async recent(session: ISession, from: number, count: number) {
        return feedService.getRecent(from, count)
    }

}