import {IReadOptions, StoreApi} from "../lib/api-helper";

class AdminStore extends StoreApi {

    constructor() {
        super('admin')
    }

    async loadOntology() {
        return this.get('ontology')
    }

    async xrayEntity(type: string, id: string) {
        return this.get(['xray', type, id])
    }

    async loadEntities(type: string, readOptions: IReadOptions) {
        return this.load(readOptions, 'browse', type)
    }

    async deleteEntity(type: string, id: string) {
        return this.remove(id, 'entity', type)
    }

    async changeEntity(type: string, id: string, fieldName: string, fieldValue: string) {
        return this.operation('changeEntity', {fieldValue, fieldName}, type, id)
    }
}

export const adminStore = new AdminStore()