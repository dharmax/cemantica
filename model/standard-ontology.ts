import {PermissionGroup} from "./generic-entities/permission-group";
import {User} from "./generic-entities/user-entity";
import {Notification} from "./generic-entities/notification-entity";
import {IRawOntology} from "./raw-ontology";
import {PredicateDcr} from "./predicate-descriptor";
import {Discussion} from "./generic-entities/discussion-entity";
import {ConfigurationEntity} from "./generic-entities/configuration-entity";
import {UserFeedback} from "./generic-entities/user-feedback";

export const standardOntology: IRawOntology = {
    entityDcrs: [PermissionGroup, User, Notification, Discussion, ConfigurationEntity, UserFeedback],
    predicateDcrs: [
        // for the authorization system
        new PredicateDcr('has-role-in'),
        new PredicateDcr('contains'),
        new PredicateDcr('parent-of'),
        // for subscription
        new PredicateDcr('subscribes-to'),
        // for notification and messaging
        new PredicateDcr('got-notification'),
        new PredicateDcr('relates-to'),
        new PredicateDcr('discusses', undefined, {source: ['touched']}),
        new PredicateDcr('posted-by'),
        // for voting and flagging
        new PredicateDcr('flagged'),
        new PredicateDcr('rated'),
    ]
}
