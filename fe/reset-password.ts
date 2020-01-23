// @ts-ignore
import * as riot from 'riot'
// @ts-ignore
import ResetPassword from './components/generic/reset-password.riot'
import {refsPlugin} from "./lib/riot-ext";
// @ts-ignore
import Styles from './styling/styles.less'
///////////
(function () {
    riot.install(component => refsPlugin(component))
    const mountApp = riot.component(ResetPassword);
    const el = document.getElementsByClassName('reset-password')[0]
    const app = mountApp(el, {});
    // ...just so the bundling wouldn't throw out the styling
    app.style = Styles
    delete app.style

})()
