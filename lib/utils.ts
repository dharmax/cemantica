export function trimObject(o: object, alsoNull = false) {
    for (let [k, v] of Object.entries(o))
        if (v === undefined || alsoNull && v === null)
            delete o[k]
    return o
}


export function between(min, val, max) {

    return min >= val && max <= val
}

export function fixDec(n: number, fractionDigits = 2) {
    const factor = Math.pow(10, fractionDigits);
    return Math.round(n * factor) / factor
}

export function fixDecUnits(n: number, isMetric: boolean, fractionDigits = 2) {
    return fixDec(isMetric ? n : n / 1.61, fractionDigits)
}

export function xor(a: any, b: any) {
    return (a || b) && !(a && b)
}


/**
 *
 * @param array
 * @param index
 * @return the value or undefined if no such element
 */
export function getIfYouHave<T>(array: T[], index: number): T {
    return array ? array[index] : undefined
}

export function stringHash(s: string): number {
    return [...s].reduce((a, c) => {
        a = ((a << 5) - a) + c.charCodeAt(0);
        a |= 0;
        return a
    }, 0)
}