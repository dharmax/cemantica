// @ts-ignore
import MainPage from './main-page.riot'
// @ts-ignore
import CreateWhisperation from './create-whisperation.riot'
// @ts-ignore
import Composer from './composer.riot'
// @ts-ignore
import PiecePage from './piece-page.riot'
// @ts-ignore
import PersonalPage from './personal-page.riot'
// @ts-ignore
import WriterPage from './writer-page.riot'
// @ts-ignore
import MyCreations from './my-creations.riot'
// @ts-ignore
import MyWhisperations from './my-whisperations.riot'
// @ts-ignore
import MyFellowship from './my-fellowship.riot'
// @ts-ignore
import MyActivities from './my-activities.riot'
// @ts-ignore
import PieceEditor from './piece-editor.riot'
// @ts-ignore
import WhisperationPage from './whisperation-page.riot'
// @ts-ignore
import WhisperationHelp from './whisperation-help.riot'
// @ts-ignore
import About from "./about.riot"
// @ts-ignore
import AllWhisperations from "./all-whisperations.riot"
// @ts-ignore
import Community from './community.riot'


import {stateManager} from "../../lib/state-manager";

export const components = {
    MainPage,
    CreateWhisperation,
    PersonalPage,
    Composer,
    PiecePage,
    WriterPage,
    MyCreations,
    MyWhisperations,
    MyFellowship,
    MyActivities,
    PieceEditor,
    WhisperationPage,
    WhisperationHelp,
    Community,
    About,
    AllWhisperations
}

export function initApplicationStates() {

    stateManager.addState('whisperation-help')
    stateManager.addState('new-piece', 'composer', 'new-piece/%', 'create')
    stateManager.addState('edit-piece', 'composer', 'edit-piece/%', 'edit')
    stateManager.addState('main', 'main-page', /main/)
    stateManager.addState('piece-zoom', 'piece-page', 'piece/%')
    stateManager.addState('personal', 'personal-page', /personal/)
    stateManager.addState('create-whisperation', 'create-whisperation', /create-whisperation/)
    stateManager.addState('writer', 'writer-page', 'writer/%')
    stateManager.addState('writer2', 'writer-page', 'user/%')
    stateManager.addState('my-creations', null, null, 'all');
    stateManager.addState('whisperation-page', null, 'whisperation/%');

    ['my-fellowship', 'my-whisperations', 'community', 'about',
        'all-whisperations']
        .forEach(name => stateManager.addState(name))

}