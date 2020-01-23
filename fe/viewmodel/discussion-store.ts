import {StoreApi} from "../lib/api-helper";
import dispatcher from "../lib/dispatcher";

class DiscussionStore extends StoreApi {

    constructor() {
        super('discussion')

        dispatcher.on('notification:discussion-post', (event, data) => {
            // TODO
        })
    }

}

export const discussionStore = new DiscussionStore()