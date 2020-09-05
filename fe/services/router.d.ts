declare class Route {
    constructor();
    re: any;
    handler: any;
}
declare class RouterClass {
    routes: Route[];
    mode: 'history' | 'hash';
    root: string;
    config(options: any): this;
    getFragment(): string;
    clearSlashes(path: string): string;
    clearQuery(url: string): string;
    add(re: Function | RegExp, handler?: Function): this;
    remove(param: any): this;
    flush(): this;
    check(f?: any): this;
    listen(): this;
    navigate(path?: string): this;
}
export declare const Router: RouterClass;
export {};
