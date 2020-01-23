Array.prototype['last'] = function (n = 0) {
    return this.length ? this[this.length - 1 - n] : undefined
}
Array.prototype['first'] = function () {
    return this.length ? this[0] : undefined
}

declare global {
    interface Array<T> {
        last: <T>(n) => T
        first: <T>() => T

    }
}

/**
 * TypeScript enum to array of strings
 * @param e the enum
 */
export function enum2array(e): string[] {
    return Object.entries(e).filter((en: any[]) => !isNaN(en[1])).map(en => en[0])
}