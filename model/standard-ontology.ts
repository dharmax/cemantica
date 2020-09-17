import {PermissionGroup} from "./permission-group";
import {Notification} from "./notification-entity";
import {IRawOntology} from "./raw-ontology";
import {PredicateDcr} from "./predicate-descriptor";
import {Discussion} from "./discussion-entity";
import {ConfigurationEntity} from "./configuration-entity";
import {UserFeedback} from "./user-feedback";
import {User} from "./index";

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
