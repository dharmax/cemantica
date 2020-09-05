declare global {
    interface Array<T> {
        last: <T>(n: any) => T;
        first: <T>() => T;
    }
}
/**
 * TypeScript enum to array of strings
 * @param e the enum
 */
export declare function enum2array(e: any): string[];
