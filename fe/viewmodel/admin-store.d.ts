import { IReadOptions, StoreApi } from "../lib/api-helper";
declare class AdminStore extends StoreApi {
    constructor();
    loadOntology(): Promise<any>;
    xrayEntity(type: string, id: string): Promise<any>;
    loadEntities(type: string, readOptions: IReadOptions): Promise<import("../lib/api-helper").IReadResult>;
    deleteEntity(type: string, id: string): Promise<any>;
    changeEntity(type: string, id: string, fieldName: string, fieldValue: string): Promise<any>;
}
export declare const adminStore: AdminStore;
export {};
