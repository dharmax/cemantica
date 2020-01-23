const throttleBuckets = new Map<any, { timerHandle: any }>()

/**
 * Makes sure a specific function/key pair is not called more than once in the given duration. Only the last
 * function withing the duration period will be called, eventually, and nothing will be called until there's
 * a "rest" period in the duration length, when no additional calls will be fired.
 * @param key the key could be, for example, entity-id+operation
 * @param minutes the duration
 * @param func the function to call
 */
export function throttleByKey(key: any, minutes: number, func) {

    let existingBucket = throttleBuckets.get(key)
    if (!existingBucket) {
        let fire = (key, func) => {
            return function () {
                func()
                throttleBuckets.delete(key)
            }
        }

        existingBucket = {
            timerHandle: setTimeout(fire(key, func), minutes * 1000 * 60)
        }
        throttleBuckets.set(key, existingBucket)
    } else {
        existingBucket.timerHandle.clear()
        throttleBuckets.delete(key)
        throttleByKey(key, minutes, func)
    }
}
