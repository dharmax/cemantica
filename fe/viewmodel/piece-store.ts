import {IReadOptions, StoreApi} from "../lib/api-helper";


class PieceStore extends StoreApi {
    constructor() {
        super('pieces')
    }

    load(opts: IReadOptions, type: string) {
        return super.load(opts, 'load', type)
    }

    getByWriter(writerId?: string) {
        return super.get(['by-writer', writerId || 'self'])
    }

    getByWhisperation(wId: string) {
        return super.get(['by-whisperation', wId])
    }

    changeStatus(id: string, newStatus: string) {
        return this.update(id, {status: newStatus})
    }

    flag(id: string) {
        return super.operation('flag', {id})
    }
}

export const pieceStore = new PieceStore()