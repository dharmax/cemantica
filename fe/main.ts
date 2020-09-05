// @ts-ignore
import * as riot from 'riot'
// @ts-ignore
import App from './components/specific/app.riot'
import {refsPlugin} from "./lib/riot-ext";
// @ts-ignore
import Style from './styling/styles.less'
// @ts-ignore
import Discussion from './components/generic/discussion.riot'

(function () {

    riot.install(component => refsPlugin(component))
    riot.register('discussion', Discussion)
    const mountApp = riot.component(App);
    const el = document.getElementsByClassName('app')[0]
    const app = mountApp(el, {});

    addStylesheets()

    // ...just so the bundling wouldn't throw out the styling
    app.styles = Style
    delete app.styles

})()

function addStylesheets() {
    const urls = ["https://fonts.googleapis.com/css?family=Cherry+Swash|Courgette&display=swap",
        "https://fonts.googleapis.com/icon?family=Material+Icons"
    ]
    for (let url of urls) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        document.head.appendChild(link)
    }
}