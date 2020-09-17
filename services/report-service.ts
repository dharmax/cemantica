import {IReportRequestConf} from "../routes/routing-utils";

import {Transform} from 'json2csv'
import {getTemplate, sendEmail} from "./user-notification-service";
import {Readable} from "stream";
import {stream2string} from "../lib/stream2string";


/**
 * TODO this service better be separated to a different processPodUploadData if we want to handle big reports without blocking the IO flow
 */

class ReportService {


}

export const reportService = new ReportService()


async function generateReportFromData(reportName: string, reportOptions: IReportRequestConf, stream: Readable, emailTargets: string[]): Promise<string> {

    const transform = new Transform({
        fields: reportOptions.projection,
        flatten: true,

    })
    const csvStream = stream.pipe(transform)

    const content = reportOptions.copyToCaller ? await stream2string(csvStream) : csvStream

    // we send it async - not waiting for send result
    // noinspection JSIgnoredPromiseFromCall,ES6MissingAwait
    sendEmail(emailTargets, 'en', getTemplate('UserPeriodicUpdate'), {}, [{
        content
    }])

    return reportOptions.copyToCaller ? <string>content : null

}
