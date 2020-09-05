export declare class Message {
    message: any;
    type: any;
    options: IAlertOptions;
    time: any;
}
export declare class AlertQueue {
    alerts: Message[];
}
export declare const alertQueue: AlertQueue;
export interface IAlertOptions {
    duration?: number;
    persist?: boolean;
    modal?: boolean;
    class?: string;
}
export declare function Alert(message: any, type?: string, options?: IAlertOptions): void;
export declare function Info(message: any, options?: IAlertOptions): void;
