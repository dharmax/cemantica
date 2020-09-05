import {StoreApi} from "../lib/api-helper";
import dispatcher from "../lib/dispatcher";


export interface IFeedItem {
    pictureUrl: string
    writerId: string
    writerName: string
    operation: string
    targetType: string
    targetId: string
    time: Date
}

class FeedStore extends StoreApi {

    private feedCache: IFeedItem[]
    private refreshTime: number = 0;

    constructor() {
        super('feed')
        // noinspection JSIgnoredPromiseFromCall
        this.refresh()

        dispatcher.on('feed:added', (e, data) => {
            this.feedCache.push(data)
            while (this.feedCache.length > 50)
                this.feedCache.shift()
            dispatcher.trigger('feed-store', 'feed-store:updated', this.feedCache)
        })
    }

    async refresh() {
        this.refreshTime = Date.now()
        return this.feedCache = await this.get('recent')
            .then(items => items.map(i => {
                if (i.targetType === 'Whisperation')
                    i.targetName = 'have a look'
                return i
            }))
    }

    async getFeed(): Promise<IFeedItem[]> {
        if (Date.now() - this.refreshTime > 5 * 60000)
            return this.refresh()
        return this.feedCache || this.refresh()
    }

}

export const feedStore = new FeedStore()