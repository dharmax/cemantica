import {PredicateCollection, SEPARATOR, storage} from "../services/storage"
import {AbstractEntity} from "./abstract-and-user-entities";
import {IReadOptions, IReadResult} from "../lib/common-generic-types";
import {standardOntology} from "./standard-ontology";
import {IRawOntology} from "./raw-ontology";
import {PredicateDcr} from "./predicate-descriptor";
import {LoggedException} from "../services/logger";

let ontology: Ontology

export function getOntology(): Ontology {
    return ontology
}

export function initSemanticLayer(appOntology: IRawOntology) {

    const rawOntology = standardOntology
    rawOntology.entityDcrs.push(...appOntology.entityDcrs)
    rawOntology.predicateDcrs.push(...appOntology.predicateDcrs)
    ontology = new Ontology(rawOntology)
}

export class SemanticPackage {

    constructor(readonly name: string, readonly parent: SemanticPackage) {

    }
}

/**
 * Create an entity instance from a record and possibly from id only. If it is not an entity, it just returns the record unchanged.
 * @param clazz the entity class (the function)
 * @param id the id, if there's no id in the record
 * @param record the record by which to populate the entity
 */
export function makeEntity<T extends AbstractEntity>(clazz, id?, record?): T {
    if (!clazz) {
        id = id || record.id || record._id
        if (!id)
            throw new Error('Need at least a fully qualified ID')
        clazz = id.split(SEPARATOR)[1]
    }
    clazz = typeof clazz == 'string' ? ontology.edcr(clazz).clazz : clazz
    if (!clazz)
        return record
    const rType = record && (id || record._id).match(/^_(.*)_/)[1]
    if (rType && (rType !== clazz.name))
        throw `Requested entity type ${clazz.name} does not match entity's record of type ${rType}.`
    let e = new clazz(id)
    record && Object.assign(e, {id, _etype: clazz.name}, record)
    return e
}

export async function loadEntityById<T>(id: string, ...projection: string[]): Promise<T> {
    const entityTypeName = id.split(SEPARATOR)[1]
    const edcr = ontology.edcr(entityTypeName)
    if (!edcr)
        throw new Error(`No such entity type ${edcr}`)
    // @ts-ignore
    return edcr.clazz.createFromDB(edcr.clazz, id, ...projection)

}


// noinspection JSUnusedGlobalSymbols
export async function predicateById(pid: string) {
    const pcol: PredicateCollection = await pcollection()
    const record = <IPredicateRecord>await pcol.findById(pid, undefined)
    return new Predicate(record)

}

export async function createPredicate(source: AbstractEntity, pname: string, target: AbstractEntity, payload?: Object, selfKeys = {}): Promise<Predicate> {
    const pDcr = ontology.pdcr(pname)
    let pcol: PredicateCollection = await pcollection()
    let pred: IPredicateRecord = {
        predicateName: pname,
        sourceId: source.id,
        sourceType: source.constructor.name,
        targetId: target.id,
        targetType: target.constructor.name,
        payload: payload,
        timestamp: Date.now()
    }
    await addKeys()

    let pid = <string>await pcol.append(pred)
    pred['id'] = pred._id = pid
    return new Predicate(pred)

    async function addKeys() {

        await addKeyForEntity('target', target)
        await addKeyForEntity('source', source)

        // validate and assign self-keys
        const recordKeys = Object.keys(pred)
        Object.keys(selfKeys).forEach(k => {
            if (recordKeys.includes(k))
                throw new LoggedException(`Bad predicate self-key: ${k}`)
            pred[k] = selfKeys[k]
        })

        async function addKeyForEntity(sideName, e) {
            const fieldNames = pDcr.keys[sideName]
            if (!fieldNames || !fieldNames.length)
                return
            const fields = await e.getFields(...fieldNames)
            Object.entries(fields).forEach(([f, v]) => {
                pred[`_${sideName}_${f}`] = v
            })
        }


    }
}


export async function deletePredicate(predicate: Predicate) {
    let pId = predicate.id
    let pcol = await pcollection()
    return pcol.deleteById(pId)
}


export async function deleteAllEntityPredicates(entityId: string) {
    let pcol = await pcollection()
    return pcol.deleteByQuery({
        $or: [
            {sourceId: entityId},
            {targetId: entityId},
        ]
    })
}

/**
 * note that it is possible to specify peerType with empty array as the projection. It can be useful to filter the predicates by the peer type that way!
 */
export interface ISearchOptions {
    peerId?: string,
    peerType?: string | string[],
    projection?: string[],
}

/**
 * This is the method by which predicates are searched and paged through
 * @param {boolean} incoming specify false for outgoing predicates
 * @param {string} predicateName the name of the predicate
 * @param {string} entityId the entity id - it would be the source for outgoing predicates and the target for incoming
 * @param {ISearchOptions} opts
 * @returns {Promise<Object[]}
 */
export async function findPredicates(incoming: boolean, predicateName: string, entityId: string, opts: ISearchOptions = {}): Promise<Predicate[]> {
    // noinspection ES6MissingAwait
    return <Promise<Predicate[]>>loadPredicates(incoming, predicateName, entityId, opts, null)
}


/**
 * This is the method by which predicates are searched and paged through
 * @param {boolean} incomming specify false for outgoing predicates
 * @param {string} predicateName the name of the predicate
 * @param {string} entityId the entity id - it would be the source for outgoing predicates and the target for incoming
 * @param {ISearchOptions} opts
 * @param {IReadOptions} pagination parameters. Null will return an array instead of IReadResult
 * @returns {Promise<Object[] | IReadResult>}
 */
export async function pagePredicates(incomming: boolean, predicateName: string, entityId: string, opts: ISearchOptions = {}, pagination: IReadOptions): Promise<IReadResult> {
    // noinspection ES6MissingAwait
    return <Promise<IReadResult>>loadPredicates(incomming, predicateName, entityId, opts, pagination)
}


async function loadPredicates(incoming: boolean, predicateName: string, entityId: string, opts: ISearchOptions = {}, pagination: IReadOptions): Promise<Predicate[] | IReadResult | AbstractEntity[]> {

    const pcol: PredicateCollection = await pcollection()

    const predicateNames = expandPredicate(predicateName)
    let query: any = predicateNames ? {
        predicateName: {$in: predicateNames}
    } : {};
    const whichPeer = incoming ? 'source' : 'target'
    const whichSelf = !incoming ? 'source' : 'target'
    const selfId = whichSelf + 'Id'
    if (entityId) query[selfId] = entityId
    if (opts.peerType && opts.peerType != '*')
        query[whichPeer + 'Type'] = typeof opts.peerType == 'string' ? opts.peerType : {$in: opts.peerType}
    if (opts.peerId)
        query[whichPeer + 'Id'] = opts.peerId

    const fieldProjection = (pagination && pagination.projection || []).concat(opts.projection || [])
    pagination && (delete pagination.projection)

    if (pagination) {
        let rr: IReadResult = await pcol.load(pagination, query)
        rr.items = await enrich(<IPredicateRecord[]>rr.items)
        return rr
    } else {
        const predicates: IPredicateRecord[] = await pcol.findSome(query)
        return <Predicate[]>await enrich(predicates)
    }

    async function enrich(predicates: IPredicateRecord[]) {
        // if projection is specified or peer-type, we should populate the predicates with fields from the peer
        if (opts.projection || opts.peerType) {
            for (let pred of predicates) {
                const peerType = pred[whichPeer + 'Type']
                if (opts.peerType && opts.peerType != '*' && opts.peerType != peerType)
                    continue
                const f = ontology.edcr(peerType).clazz
                pred.peerEntity = await loadEntityById(pred[whichPeer + "Id"], ...fieldProjection)
                // pred.peerEntity = await f['createFromDB'](f, pred[whichPeer + "Id"], ...fieldProjection)
            }
        }
        return predicates.map(p => pagination && pagination.entityOnly ? p.peerEntity : new Predicate(p))
    }

}


async function pcollection() {
    return storage.predicateCollection('PredicatesMain', col => {
        col.ensureIndex({
            predicateName: 1,
            sourceId: 1,
            targetType: 1
        }, {})
        col.ensureIndex({
            predicateName: 1,
            targetId: 1,
            sourceType: 1
        }, {})
        col.ensureIndex({
            sourceId: 1,
            keys: 1
        }, {})
        col.ensureIndex({
            targetId: 1,
            keys: 1
        }, {})
        col.ensureIndex({
            sourceId: 1,
            targetId: 1,
            predicateName: 1
        }, {})
    })
}

function expandPredicate(pname: string) {
    if (!pname)
        return null
    const pdcr = ontology.pdcr(pname)
    let childrenNames = Object.keys(pdcr.children || {})
    return childrenNames.concat(pname)
}

/**
 * @param source either entity or its id
 * @param target either entity or its id
 * @param bidirectional check both directions of predicates
 * @return the list of predicates directly between these two entities
 */
export async function predicatesBetween(source: AbstractEntity | string, target: AbstractEntity | string, bidirectional: boolean, predicateName?: string): Promise<Predicate[]> {
    if (!source || !target)
        return []
    const predicates = await pcollection()
    const sourceId = source['id'] || source
    const targetId = target['id'] || target
    const query: any = {}
    if (bidirectional) {
        query.$or = [{sourceId, targetId},
            {targetId: sourceId, sourceId: targetId}]
    } else {
        query.sourceId = sourceId
        query.targetId = targetId
    }
    predicateName && (query.predicateName = predicateName)
    return (await predicates.findSome(query)).map((rec: IPredicateRecord) => new Predicate(rec))
}

export interface IPredicateRecord {
    predicateName: string
    sourceId: string
    sourceType: string
    targetId: string
    targetType: string
    payload: any
    _id?: string
    _created?
    peerEntity?: AbstractEntity
    peerIsSource?: boolean

    [peerKey: string]: any
}

export class Predicate implements IPredicateRecord {

    private _version: number
    readonly _id: string
    predicateName: string
    sourceId: string
    sourceType: string
    targetId: string
    targetType: string
    payload: any

    [peerKey: string]: any

    private sourceEntity: AbstractEntity
    private targetEntity: AbstractEntity

    constructor(record: IPredicateRecord) {
        this._id = record._id || record['id']
        delete record['id']
        Object.assign(this, record)
        this.sourceEntity = record.peerIsSource && record.peerEntity
        this.targetEntity = !record.peerIsSource && record.peerEntity
    }

    get id() {
        return this['_id']
    }

    get peer(): AbstractEntity {
        return this['peerEntity']
    }

    async getSource<T extends AbstractEntity>(...projection: string[]): Promise<T> {
        if (!this.sourceEntity) {
            const peerClass = ontology.edcr(this.sourceType).clazz
            let sCol = await storage.collectionForEntityType(peerClass)
            this.sourceEntity = <AbstractEntity>(await sCol.findById(this.sourceId, projection))
        }

        return <T><unknown>this.sourceEntity
    }

    async getTarget(...projection: string[]) {
        if (!this.targetEntity) {
            const peerClass = ontology.edcr(this.targetType).clazz
            let peerCollection = await storage.collectionForEntityType(peerClass)
            this.targetEntity = <AbstractEntity>(await peerCollection.findById(this.targetId, projection))
        }
        return this.targetEntity
    }

    async change(fields) {
        let pcol: PredicateCollection = await pcollection()
        return pcol.updateDocument(this._id, fields, this._version)
    }

    erase(): any {
        return deletePredicate(this)
    }
}


export class Ontology {
    private predicateDcrs: { [name: string]: PredicateDcr } = {}
    private entityDcrs: { [name: string]: { clazz: Function } } = {}

    constructor(readonly definitions: IRawOntology) {
        definitions.entityDcrs.forEach(e => this.entityDcrs[e.name] = {clazz: e})
        let allPdcrs = this.predicateDcrs
        process(definitions.predicateDcrs)

        function process(pdcrs: PredicateDcr[], parent: PredicateDcr = undefined) {
            for (let pd of pdcrs) {
                const e = allPdcrs[pd.name]
                if (e)
                    throw new LoggedException('Duplicate predicate descriptor: ' + pd.name)
                allPdcrs[pd.name] = pd
                if (pd.parent) {
                    if (parent)
                        throw new LoggedException(`Attempt to override predicate parent ${pd.parent}in descriptor ${pd.name}`)
                    parent = allPdcrs[pd.parent as string]
                    parent.children.push(pd)
                }
                pd.parent = parent
                pd.children && process(pd.children)
            }
        }
    }

    pdcr(name: string): PredicateDcr {
        const res = this.predicateDcrs[name]
        if (!res)
            throw new LoggedException('No such predicate descriptor ' + name)
        return res
    }

    edcr(name: string) {
        const res = this.entityDcrs[name]
        if (!res)
            throw new LoggedException('No such predicate descriptor ' + name)
        return res
    }

    edcrNames() {
        return Object.keys(this.entityDcrs)
    }
}

export async function idAndType2entity<T extends AbstractEntity>(id: string, type: string): Promise<T> {
    const edcr = getOntology().edcr(type)
    if (!edcr)
        throw new LoggedException(`Entity type ${type} isn't part of the system's ontology`)

    const entityClass = edcr.clazz
    return entityClass['createFromDB'](entityClass, id)

}
