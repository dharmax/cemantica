import {createReadStream, readdirSync} from "fs";
import {join} from "path";
import {createInterface} from "readline";
import {all} from 'bluebird'
import {AppConfig} from "../config";

const MAX_RESULTS = 20;

export function lookup(locale: string, topic: string, substring: string = '') {

    if (!substring.length)
        return []

    let taxonomy: Taxonomy = Taxonomies[locale] || Taxonomies['he']
    return taxonomy.lookup(topic, substring).map(item => item.string)
}

const Taxonomies = {}

class TaxonomyItem {
    id
    string: string
    metaData: any;
}


class Taxonomy {
    private topics = {}


    lookup(topic: string, substring: string) {
        let items = this.topics[topic]

        let res = []
        for (let i = 0; i < items.length && res.length < MAX_RESULTS; i++) {
            let tItem = items[i]
            if (!tItem)
                continue
            if (tItem.string.indexOf(substring) > -1)
                res.push(tItem)
        }
        return res
    }

    defineTopic(topicName: any, items: Array<TaxonomyItem>) {
        this.topics[topicName] = items
    }
}

async function loadTaxomomies() {

    let locales = ['he']

    // noinspection ES6MissingAwait
    locales.forEach(async locale => {
        Taxonomies[locale] = await loadTaxonomy(locale)
    })

    async function loadTaxonomy(locale) {
        let basePath = `${AppConfig.rootPath}/taxonomy/${locale}`

        let dirList = readdirSync(basePath).filter(fn => fn.endsWith('.tax.txt'))

        let taxonomy = new Taxonomy()
        await all(dirList.map(fn => {
            return new Promise((resolve, reject) => {
                let lineReader = createInterface({
                    input: createReadStream(join(basePath, fn))
                })

                let lineCounter = 0
                let bucket = []
                let topicName
                lineReader.on('line', function (line) {
                    if (lineCounter++ == 0)
                        topicName = line
                    else {
                        if (line.length)
                            bucket.push(processLine(line, lineCounter, topicName))
                    }
                });

                lineReader.on('close', () => {
                    taxonomy.defineTopic(topicName, bucket)
                    resolve(taxonomy)
                })
            })
        }))
        return taxonomy

        function processLine(line: string, lineCounter: number, topic: string): TaxonomyItem {
            line = line.trim()
            let parts = line.split(',')
            let ti = new TaxonomyItem()
            ti.id = `${topic}:${lineCounter}`
            ti.string = parts[0]
            if (parts.length > 1) {
                ti.metaData = JSON.parse(ti[1])
            }
            return ti
        }
    }
}

loadTaxomomies()