import {dictionaries} from "./dictionaries";


export type Language = 'he' | 'en' | 'fr' | 'ar' | 'sp'

setLanguage('en')

export function localize(orgString: string): string {

    if (!orgString)
        return ''
    if (typeof orgString === "number")
        return orgString
    if (!isNaN(parseInt(orgString)))
        return orgString

    let fields = {}

    // make orgString template-compatible and build re-placement table in fields
    const fieldsInSource = orgString.match(/#(.*?)#/g)
    for (let i in fieldsInSource) {
        let n = parseInt(i)
        let key = `#${n + 1}#`
        let str = fieldsInSource[n];
        fields[key] = str.substr(1, str.length - 2)
        orgString = orgString.replace(str, key)
    }

    // find the localization template and if not found, mark it and report it
    let localizedTemplate = dictionary()[orgString.toLowerCase()]
    if (!localizedTemplate) {
        // console.warn('String template without localization: ' + orgString)
        localizedTemplate = '!' + orgString
    }

    // render a new string from the template
    let localizedString = render('' + localizedTemplate, fields)
    return localizedString
}

function localizeTag(n: Element) {
    n.textContent = localize(n.textContent)
}

/**
 * Note that this function is good just for static stuff. Otherwise, do it dynamically (in JS)
 * @param root starting point to check
 */
export function localizeTags(root: Element = document.body) {

    let nodes: any = root.querySelectorAll("[localize]")
    nodes.forEach((n) => {
        localizeTag(n);
    })
}

function render(template, fields): string {
    let result = template
    if (fields) for (let fname of Object.keys(fields)) {
        const val = fields[fname]
        result = result.replace(fname, val)
    }
    return result
}

declare let window: any

function dictionary(): Object {
    window.currentLocale = window.currentLocale || "he"
    return dictionaries[window.currentLocale]
}

export function setLanguage(locale: Language) {
    if (Object.keys(dictionaries).indexOf(locale) == -1)
        throw new Error('Unknown locale')
    window.currentLocale = locale
    document.body.style.direction = locale == 'he' ? 'rtl' : 'ltr'
}
