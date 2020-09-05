export declare type ApplicationStateName = string;
export declare type ApplicationState = {
    name: ApplicationStateName;
    pageName: string;
    route: RegExp;
    mode?: string | string[];
};
declare class StateManager {
    private allStates;
    private appState;
    private previousState;
    private stateContext;
    constructor();
    getState(): ApplicationState;
    get previous(): any;
    get context(): any;
    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state: ApplicationStateName | [ApplicationStateName, any]);
    /** attempts to restore state from current url */
    restoreState(defaultState: ApplicationStateName): void;
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    setState(stateName: ApplicationStateName, context?: any): boolean;
    /**
     * Define an application state
     * @param name
     * @param pageName by default it equals the name (you can null it)
     * @param route by default it equals the pageName (ditto)
     * @param mode optional
     */
    addState(name: string, pageName?: string, route?: RegExp | string, mode?: string | string[]): void;
    registerStateByState(state: ApplicationState): void;
}
export declare const stateManager: StateManager;
export {};
