import { StoreApi } from "../lib/api-helper";
declare class JobsStore extends StoreApi {
    constructor();
    getSchedule(): Promise<any>;
    getPrototypes(): Promise<any>;
    getOperations(): Promise<any>;
}
export declare const jobsStore: JobsStore;
export {};
