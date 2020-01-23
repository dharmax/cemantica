import {startApplication} from "./lib/generic-server";
import {AccessType} from "./services/generic/privilege-service";
import {Whisperation} from "./model/specific-entities/whisperation-entity";
import {Piece} from "./model/specific-entities/piece-entity";
import {IRawOntology} from "./model/raw-ontology";
import {PredicateDcr} from "./model/predicate-descriptor";
import {QueryDictionary} from "./services/generic/storage";
import SendPeriodUpdatesJob from './jobs/periodic-update-job'

const roleDictionary = {
    'Piece-Visitor': [AccessType.ShallowRead],
    'Piece-User': [AccessType.Vote, AccessType.Comment],
    'Whisperation-Visitor': [AccessType.ShallowRead],
    'Notification-Container': [AccessType.Delete, AccessType.DeepRead]
}
const whisperationOntology: IRawOntology = {
    entityDcrs: [Whisperation, Piece],
    predicateDcrs: [
        new PredicateDcr('written-by'),
        new PredicateDcr('proposed-by'),
        new PredicateDcr('inspired-by'),
    ]
}

const queryDictionary: QueryDictionary = {
    recent: params => {
        /**
         works on either originalPublishDate or a field of your choosing;
         you provide the "since" date.
         *
         */
        const fieldName = params['fieldName'] || 'originalPublishDate'
        const since = new Date(params['since'])
        return {
            $or: [
                {[fieldName]: {$gte: since}},
                {$and: [{[fieldName]: {$exists: false}}, {_created: {$gte: since}}]}
            ]
        }
    }
}

console.info({
    SendPeriodUpdatesJob
})

// noinspection JSIgnoredPromiseFromCall
startApplication(whisperationOntology, roleDictionary, queryDictionary, 'dharmax@gmail.com')