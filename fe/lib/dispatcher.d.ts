interface IPubSubHandle {
    slot: any;
    key: number;
}
export declare class PubSubEvent {
    topic: string;
    verb: string;
    origin: string;
    data: any;
    toString(): string;
}
/**
 * You can add "!" in the beginning of a topic name to indicate you expect the message to be handled and if it doesn't
 * it means it's an error.
 *
 * If a callback return truthy, it means broadcasting should stop.
 *
 * Normally, you won't need to use this class, but only its default
 * instance, which is also the default export of this module.
 */
export declare class Dispatcher {
    readonly name: any;
    keyCounter: number;
    topics: any;
    constructor(name: any);
    set trace(on: boolean);
    get trace(): boolean;
    private on_;
    private once_;
    private off_;
    publish(origin: string, topic: string, verb: string, data?: any): void;
    private broadcast;
    private getSubscriptionsSlot;
    on(event: string, handler: (event: PubSubEvent, data: any) => boolean | void): IPubSubHandle;
    once(event: string, handler: (event: PubSubEvent, data: any) => boolean | void): void;
    off(subscription: any): void;
    triggerAsync(sender: string, eventOrTopic: string, dataOrVerb: string | any, data?: any): void;
    trigger(sender: string, eventOrTopic: string, dataOrVerb: string | any, data?: any): void;
}
declare const _default: Dispatcher;
export default _default;
