import {StoreApi} from "../lib/api-helper";

class WhisperationsStore extends StoreApi {

    constructor() {
        super('whisperations')
    }

    getFeatured(): Promise<Object[]> {
        return super.get('featured')
    }

    getByWriter(writerId?: string) {
        return super.get(['by-writer', writerId || 'self'])
    }

    flag(id: string) {
        return super.operation('flag', {id})
    }
}

export const whisperationStore = new WhisperationsStore()

