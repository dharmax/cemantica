import {localize} from "./locale";
import {callApi} from "./api-helper";

declare const window: any

export function enum2array(e) {
    return Object.entries(e).filter((en: any[]) => !isNaN(en[1])).map(en => en[0])
}

export function throttle(fn: (...args) => any, threshold: number = 250, scope?: any): (...args) => any {
    let last,
        timerHandle;

    return (...args) => {
        const context = scope

        const now = Date.now()
        if (last && now < last + threshold) {
            clearTimeout(timerHandle);
            timerHandle = setTimeout(function () {
                last = now;
                fn.apply(context, args);
            }, threshold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    }
}

export function createDateFunction(format?: Intl.DateTimeFormatOptions) {
    return date => localDate(date, format)
}

export function localDate(date: Date | string, format?: Intl.DateTimeFormatOptions) {
    if (!date)
        return 'not set'
    let d = typeof date == 'string' ? new Date(date) : date
    return d.toLocaleString(window.currentLocale, format)
}

export function getQueryParam(name: string, url?: string): string {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export function setQueryString(key: string, value, url?: string): string {
    if (!url) url = window.location.href;
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
        hash;

    if (re.test(url)) {
        if (typeof value !== 'undefined' && value !== null) {
            return url.replace(re, '$1' + key + "=" + value + '$2$3');
        } else {
            hash = url.split('#');
            url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
                url += '#' + hash[1];
            }
            return url;
        }
    } else {
        if (typeof value !== 'undefined' && value !== null) {
            var separator = url.indexOf('?') !== -1 ? '&' : '?';
            hash = url.split('#');
            url = hash[0] + separator + key + '=' + value;
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
                url += '#' + hash[1];
            }
            return url;
        } else {
            return url;
        }
    }
}

export function dateToHour(date: number | Date): String {
    date = typeof date == "object" ? date : new Date(date)
    let h = String(date.getHours())
    h = h.length < 2 ? '0' + h : h
    let m = String(date.getMinutes())
    m = m.length < 2 ? '0' + m : m
    return `${h}:${m}`
}

export function increaseDate(d: Date | string, hours: number) {
    d = typeof d == "string" ? new Date(d) : d
    return new Date(d.getTime() + hours * 60 * 60 * 1000)
}

export function reduceObject(o: Object, fields: string[]) {
    let res = {}
    fields.forEach(f => res[f] = o[f])
    return res
}

export function reduceObjectByElimination(o: any, fieldsToRemove: string[]) {

    if (o.map) {
        return o.map(e => reduceObjectByElimination(e, fieldsToRemove))
    } else {
        let result = Object.assign({}, o)
        fieldsToRemove.forEach(fieldName => delete result[fieldName])
        return result
    }
}

export async function lookupTaxonomy(topic: string, substring: string) {
    return callApi(`taxonomy/lookup/${window['currentLocale']}/${topic}?string=${substring}`).then(res => res.matches)
}

export function tempClasses(time: number, element: HTMLElement, classes: string[], conditionalClass) {
    // prevent multiple class additions
    if (element.className.includes(conditionalClass))
        return
    let org = element.className
    let s = ' '
    classes.forEach(c => s += c + ' ')
    element.className += s
    setTimeout(() => {
        element.className = org
    }, time)
}

export function stringHash(s) {
    try {
        return s.split('').reduce((a, c, i) => a ^ (c.charCodeAt(0) << (i * 3)) & 0xfffffff, 0)
    } catch (e) {
        console.error(e)
        return Math.floor(Math.random() * 20) + 1
    }
}

export const ALL_MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
export const ALL_MONTHS_LOCAL = ALL_MONTHS.map(m => localize(m))
export const DAYS_OF_WEEK_SHORT = {
    he: [
        'א',
        'ב',
        'ג',
        'ד',
        'ה',
        'ו',
        'ש'
    ], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
}
export const DAYS_OF_WEEK_LOCAL_SHORT = DAYS_OF_WEEK_SHORT[window.currentLocale]

export function month2Number(s, oneBase) {
    let i = ALL_MONTHS.indexOf(s)
    i = i === -1 ? ALL_MONTHS_LOCAL.indexOf(s) : i
    return i + (oneBase ? 1 : 0)
}

export function monthName(n) {
    return ALL_MONTHS_LOCAL[n];
}

export function time2seconds(t: { hour: number, minutes: number }): number {
    if (!t || typeof t.hour == 'undefined')
        return 0
    return t.hour * 60 * 60 + t.minutes * 60
}

export function seconds2time(s: number): { hour: number, minutes: number } {
    return {
        hour: Math.floor(s / 60 / 60),
        minutes: Math.floor(s / 60) % 60
    }
}

export class SimpleTime {
    hour: number
    minutes: number

    static fromSeconds(s: number) {
        let t = new SimpleTime()
        Object.assign(t, seconds2time(s))
        return t
    }

    static fromObject(o: { hour: number, minutes: number }) {
        let t = new SimpleTime()
        Object.assign(t, o)
        return t
    }

    static parse(s: string) {
        let t = new SimpleTime()
        let [hour, minutes] = s.split(':').map(str => parseInt(str))
        t.hour = hour;
        t.minutes = minutes
        return t
    }

    toString() {
        return `${this.hour}:${this.minutes}`
    }

    toAmPmString() {
        return `${this.hour % 12 + 1}:${this.minutes} ${this.hour > 12 ? 'PM' : 'AM'}`
    }

    toSeconds() {
        return time2seconds(this)
    }
}

export function prettyJSON(json: string | object): string {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });

    return `<pre class="json">${body}</pre>`
}

export const Invalid = Symbol('Invalid')

/**
 *
 * @param node start search node
 * @return array of elements that have the "ref" attribute
 */
export function refs(node: Element): HTMLInputElement[] {
    const nodes = node.querySelectorAll('[ref]')
    // @ts-ignore
    return (Array.of(...nodes) as HTMLInputElement[])
}

/**
 * @return elements map by the ref name
 * @param node
 */
export function refNodes(node: Element): { [ref: string]: HTMLInputElement } {

    const map = {}
    refs(node).reduce((a, c) => {
        a[c.getAttribute('ref')] = c
        return a
    }, map)
    return map
}

/**
 * Looks for elements with the "ref" attribute then returns a map with the values
 * inside those elements, with the string in the "ref" as the name.
 * It also mark invalid values with Invalid symbol.
 *
 * @return the fields and _errors field with the list of erroneous values
 * @param node start node to look within
 */
export function collectValues(node: Element, context?): { [k: string]: any } {

    const nodes = refs(node)
    const errors = {}

    const results: any = nodes.reduce((a, e) => {
        const fieldName = e.getAttribute('ref')

        const value = e.type == "select-multiple" ? getMultiSelect(e) :
            e.type == 'checkbox' ? e.checked :
                e.nodeValue || e.getAttribute('value') || e['value'] || e.textContent

        const customValidator = e.getAttribute('validator')
        let isValid = true
        if (customValidator) {
            const validationFunction = eval(customValidator.toString());
            isValid = validationFunction(value, context)
        } else
            isValid = !e.validity || e.validity.valid

        if (isValid)
            a[fieldName] = value
        else {
            a[fieldName] = Invalid
            errors[fieldName] = value
        }

        return a
    }, {})
    if (Object.keys(errors).length)
        results._errors = errors
    return results

    function getMultiSelect(e) {
        const values = []
        e.querySelectorAll('option:checked').forEach(n =>
            values.push(n.getAttribute('value')))
        return values
    }
}

/**
 * @returns elements screen coordinates
 * @param el
 */
export function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

//
// /**
//  * @return string representing time difference nicely
//  * @param t1 either the time or the base time
//  * @param t2 if not given, it assumes base time is present time.
//  * @param gross - either more accurate or more gross
//  * @param language
//  */
// export function relativeTime(t1: Date, t2?: Date, gross = true, language = 'en') {
//     if (!t2) {
//         t2 = new Date(t1)
//         t1 = new Date()
//     }
//     const diffInMinutes = (t1.getTime() - t2.getTime()) / 60000
//     const timeParts = [
//         {Year: Math.round(diffInMinutes / 60 / 24 / 30 / 12)},
//         {Month: Math.round(diffInMinutes / 60 / 24 / 30)},
//         {Week: Math.round(diffInMinutes / 60 / 24 / 7)},
//         {Day: Math.round(diffInMinutes / 60 / 24)},
//         {Hour: Math.round(diffInMinutes / 60)},
//         {Minute: Math.ceil(diffInMinutes / 5) * 5}
//     ]
//     let result = ''
//     let levels = 2
//     for (let v of timeParts) {
//         const timePartValue = Object.values(v)[0]
//         if (!timePartValue)
//             continue
//         let name = Object.keys(v)[0]
//         if (timePartValue > 1)
//             name += 's'
//         result += timePartValue + ' ' + name + ' '
//         if (gross || !--levels)
//             break
//     }
//     return result.length ? result + ' ago' : ''
// }