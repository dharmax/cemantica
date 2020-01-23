import {AbstractEntity} from "./abstract-entity";
import {map} from 'bluebird'
import {storage} from "../../services/generic/storage";

/**
 * This entity is a generic permission group entity.
 */
export class PermissionGroup extends AbstractEntity {
    private static adminsGroup: PermissionGroup;

    constructor(id) {
        super(id)
    }

    static getTemplate() {
        return {
            name: '',
            description: '',
        }
    }

    static async getAdminsGroup(refresh = false): Promise<PermissionGroup> {
        if (refresh)
            this.adminsGroup = null
        if (!this.adminsGroup)
            this.adminsGroup = <PermissionGroup>(
                (await this.collection().then(col => col.findOne({name: 'admins'})))
                || await this.createNew(PermissionGroup, {
                    name: 'admins',
                    description: 'Standard administrators group'
                }))

        return this.adminsGroup
    }


    private static async collection() {
        return storage.collectionForEntityType(PermissionGroup, col => {
            // noinspection JSIgnoredPromiseFromCall
            col.ensureIndex({name: 1}, {
                unique: true, partialFilterExpression: {name: {$type: "string"}}
            })
        })
    }

    async getContainers(): Promise<AbstractEntity[]> {
        return map(this.incomingPreds('contains'), p => p.getSource())
    }
}

