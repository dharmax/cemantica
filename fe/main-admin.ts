// @ts-ignore
import * as riot from 'riot'
// @ts-ignore
import AppAdmin from './components/admin-components/app-admin.riot'
import {refsPlugin} from "./lib/riot-ext";
// @ts-ignore
import Styles from './styling/styles.less'

//////////////
(function () {

    riot.install(component => refsPlugin(component))
    const mountApp = riot.component(AppAdmin);
    const el = document.getElementsByClassName('app-admin')[0]
    const app = mountApp(el, {});

    // ...just so the bundling wouldn't throw out the styling
    app.style = Styles
    delete app.style
})()
