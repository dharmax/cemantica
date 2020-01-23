import * as stream from "stream";
import {Collection} from "mongodb";

/**
 * This is a very simple and useful streamer for mongodb.
 */
export class MongoStream extends stream.Writable {

    /**
     * @param col the output collection
     * @param transformer use it if you would like to manipulate the incoming object before writing it to the db
     */
    constructor(protected col: Collection, protected transformer?: (doc: any) => any) {
        super()
    }

    _write(chunk, enc, next) {
        let document = JSON.parse(chunk.toString())
        this.transformer && (document = this.transformer(document))
        // noinspection JSIgnoredPromiseFromCall
        this.col.insertOne(document)
        next()
    }

}
