export declare function enum2array(e: any): string[];
export declare function throttle(fn: (...args: any[]) => any, threshold?: number, scope?: any): (...args: any[]) => any;
export declare function createDateFunction(format?: Intl.DateTimeFormatOptions): (date: any) => string;
export declare function localDate(date: Date | string, format?: Intl.DateTimeFormatOptions): string;
export declare function getQueryParam(name: string, url?: string): string;
export declare function setQueryString(key: string, value: any, url?: string): string;
export declare function dateToHour(date: number | Date): String;
export declare function increaseDate(d: Date | string, hours: number): Date;
export declare function reduceObject(o: Object, fields: string[]): {};
export declare function reduceObjectByElimination(o: any, fieldsToRemove: string[]): any;
export declare function lookupTaxonomy(topic: string, substring: string): Promise<any>;
export declare function tempClasses(time: number, element: HTMLElement, classes: string[], conditionalClass: any): void;
export declare function stringHash(s: any): any;
export declare const ALL_MONTHS: string[];
export declare const ALL_MONTHS_LOCAL: string[];
export declare const DAYS_OF_WEEK_SHORT: {
    he: string[];
    en: string[];
};
export declare const DAYS_OF_WEEK_LOCAL_SHORT: any;
export declare function month2Number(s: any, oneBase: any): number;
export declare function monthName(n: any): string;
export declare function time2seconds(t: {
    hour: number;
    minutes: number;
}): number;
export declare function seconds2time(s: number): {
    hour: number;
    minutes: number;
};
export declare class SimpleTime {
    hour: number;
    minutes: number;
    static fromSeconds(s: number): SimpleTime;
    static fromObject(o: {
        hour: number;
        minutes: number;
    }): SimpleTime;
    static parse(s: string): SimpleTime;
    toString(): string;
    toAmPmString(): string;
    toSeconds(): number;
}
export declare function prettyJSON(json: string | object): string;
export declare const Invalid: unique symbol;
/**
 *
 * @param node start search node
 * @return array of elements that have the "ref" attribute
 */
export declare function refs(node: Element): HTMLInputElement[];
/**
 * @return elements map by the ref name
 * @param node
 */
export declare function refNodes(node: Element): {
    [ref: string]: HTMLInputElement;
};
/**
 * Looks for elements with the "ref" attribute then returns a map with the values
 * inside those elements, with the string in the "ref" as the name.
 * It also mark invalid values with Invalid symbol.
 *
 * @return the fields and _errors field with the list of erroneous values
 * @param node start node to look within
 */
export declare function collectValues(node: Element, context?: any): {
    [k: string]: any;
};
/**
 * @returns elements screen coordinates
 * @param el
 */
export declare function getOffset(el: any): {
    left: any;
    top: any;
};
