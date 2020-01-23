import {Readable} from "stream";

export function stream2string(stream: Readable): Promise<string> {

    return new Promise((resolve, reject) => {
        const chunks = []

        stream.on('data', chunk => chunks.push(chunk))
        stream.on('error', error => reject({error, chunks}))
        stream.on('end', () => resolve(Buffer.concat(chunks).toString()))
    })
}