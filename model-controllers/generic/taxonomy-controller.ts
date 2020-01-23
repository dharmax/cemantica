import {lookup} from "../../services/generic/taxonomy-service";

export const taxonomyController = {


    async lookup(session, string: string, topic: string, locale: string) {
        return {matches: lookup(locale, topic, string)}
    }
}
