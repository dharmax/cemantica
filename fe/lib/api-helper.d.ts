export declare const baseUrl: string;
export interface IReadOptions {
    from: number;
    count: number;
    entityOnly?: boolean;
    queryName?: string;
    queryParams?: Object;
    sort?: SortSpec;
    projection?: string[];
    requestNumber?: number;
}
export declare type SortSpec = {
    [fieldName: string]: 1 | -1;
};
export interface IReadResult {
    error?: string;
    items: any[];
    total?: number;
    totalFiltered: number;
    opts?: IReadOptions;
}
export declare function hashPassword(pw: string): string;
export declare function post(url: string, data: object, conf_?: any): Promise<any>;
export declare function remove(url: string, conf_?: any): Promise<any>;
export declare function put(url: string, data: object, conf_?: any): Promise<any>;
export declare function callApi(url: string, method?: 'post' | 'get' | 'delete' | 'put', conf_?: any): Promise<any>;
export declare class StoreApi {
    protected baseResourceUrl: string;
    constructor(baseResourceUrl: string);
    load(opt_: IReadOptions, ...pathParams: string[]): Promise<IReadResult>;
    remove(itemId: string | number, ...pathParams: string[]): Promise<any>;
    create(entity: Object, ...pathParams: string[]): Promise<any>;
    operation(operationName: string, data?: any, ...pathParams: string[]): Promise<any>;
    getEntity(id: string, opts?: Object, ...pathParams: string[]): Promise<any>;
    get(pathParams: string | string[], queryParams?: Object): Promise<any>;
    update(id: string, fields: Object, ...pathParams: string[]): Promise<any>;
}
