import {AbstractEntity} from "./abstract-and-user-entities";
import {storage} from "../services/storage";


/**
 * This entity is a singleton-entity whose purpose is to keep system configuration stuff
 */
export class ConfigurationEntity extends AbstractEntity {
    private static configurationEntity = null;


    static async getConfigurationEntity(refresh = false): Promise<ConfigurationEntity> {
        if (refresh)
            this.configurationEntity = null
        if (!this.configurationEntity)
            this.configurationEntity = <ConfigurationEntity>(
                (await this.collection().then(col => col.findOne({name: 'MainConfigurationEntity'})))
                || await this.createNew(ConfigurationEntity, {}))

        return this.configurationEntity
    }

    static getTemplate() {
        return {
            name: 'MainConfigurationEntity',
            jobPrototypes: {},
            scheduledJobs: {},
            scheduleLastUpdate: {time: 0, by: null}
        }
    }

    async update<T extends AbstractEntity>(fieldsToUpdate: Object, superSetAllowed: boolean = false, cutExtraFields: boolean = false, rawOperations: {} = {}): Promise<T> {
        ConfigurationEntity.configurationEntity = null
        return super.update(fieldsToUpdate, superSetAllowed, cutExtraFields, rawOperations);
    }

    private static async collection() {
        return storage.collectionForEntityType(ConfigurationEntity)
    }

    async getContainers(): Promise<AbstractEntity[]> {
        return [];
    }
}