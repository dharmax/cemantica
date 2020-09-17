import {get as httpsGet} from 'https'
import {buildUrl} from "./build-url"
import {facebookClientId} from "../config/deployment";
import {LoggedException} from "../services/logger";
import {User} from "../model/generic-entities";

const defaultFacebookApiVersion = '3.2'

export function getFbDataRaw(accessToken: string, apiPath: string, query: Object = {}, facebookApiVersion?: string): Promise<string> {

    facebookApiVersion = facebookApiVersion || defaultFacebookApiVersion
    query['access_token'] = accessToken
    const options = {
        host: 'graph.facebook.com',
        port: 443,
        path: buildUrl(`${facebookApiVersion}/${apiPath}`, {queryParams: query}),
        method: 'GET'
    }

    return readUrl(options);
}

export function getFbDataJson(accessToken: string, apiPath: string, query: Object = {}, facebookApiVersion?: string): Promise<any> {
    // @ts-ignore
    return getFbDataRaw(...arguments).then(data => JSON.parse(data))
}

export async function getFriends(accessToken: string): Promise<User[]> {

    const response = await getFbDataJson(accessToken, '/me/friends', {fields: 'id'})
    const promiseArray: Promise<User>[] = response.data.map(entry => User.createFromFacebookId(entry.id))
    return Promise.all(promiseArray)
}

export async function getUserPhoto(fbId: string, type: string = 'normal'): Promise<string> {
    const res: any = await readUrl({
        host: 'graph.facebook.com',
        port: 443,
        path: `/${fbId}/picture?type=${type}&redirect=0`,
        method: 'GET'
    })
    return JSON.parse(res).data.url
}

function readUrl(options: { host: string; port: number; path: any; method: string }): Promise<string> {
    return new Promise((resolve, reject) => {
        let buffer = '';
        let request = httpsGet(options, function (result) {
            result.setEncoding('utf8');
            result.on('data', function (chunk) {
                buffer += chunk
            });

            result.on('end', function () {
                resolve(buffer)
            });
        });

        request.on('error', e => reject('error from facebook.getFbData: ' + e.message))
        request.end();

    })
}

export async function verifyFacebookAuthData(authData: any) {

    const fbIdByToken = await getFbDataRaw(authData.access_token, 'me', {fields: 'id'})
    const appId = await getFbDataJson(authData.access_token, 'app').then(r => r.id)

    if (fbIdByToken !== authData.id)
        throw new LoggedException('Facebook Id  not verified!')

    if (appId != facebookClientId)
        throw new LoggedException('Bad facebook app id!')
}