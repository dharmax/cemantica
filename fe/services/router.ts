class Route {
    constructor() {
    }
    re
    handler
}
class RouterClass {
    routes: Route[] = []
    mode: 'history' | 'hash'
    root = '/'

    config(options) {
        this.mode = options && options.mode && options.mode == 'history'
        && !!(history.pushState) ? 'history' : 'hash';
        this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
        return this;
    }

    getFragment() {
        let fragment = '';
        if (this.mode === 'history') {
            fragment = this.clearSlashes(decodeURI(location.pathname + location.search));
            fragment = this.clearQuery(fragment)
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
        } else {
            const match = window.location.href.match(/#(.*)$/);
            fragment = this.clearQuery(fragment)
            fragment = match ? match[1] : '';
        }
        return this.clearSlashes(fragment);
    }

    clearSlashes(path: string): string {
        return path.toString().replace(/\/$/, '').replace(/^\//, '');
    }

    clearQuery(url: string): string {
        if (url.indexOf('?') === -1)
            return url
        const a = url.split('?')
        const afterHash = a[1].split('#')
        if (!afterHash)
            return a[0]
        return `${a[0]}#${afterHash}`
    }

    add(re: Function | RegExp, handler?: Function) {
        if (typeof re == 'function') {
            handler = re;
            re = null;
        }
        this.routes.push({re: re, handler: handler});
        return this;
    }

    remove(param) {
        for (let i = 0, r; i < this.routes.length, r = this.routes[i]; i++) {
            if (r.handler === param || r.re.toString() === param.toString()) {
                this.routes.splice(i, 1);
                return this;
            }
        }
        return this;
    }

    flush() {
        this.routes = [];
        this.mode = null;
        this.root = '/';
        return this;
    }

    check(f?) {
        const fragment = f || this.getFragment();
        const matches = this.routes.filter((r: any) => fragment.match(r.re))
            .sort((r1, r2) => {
                    const [n1, n2] = [r1, r2].map(r => r.re.source.split('/'))
                    return n2 - n1
                }
            ).map(r => {
                return {r, match: fragment.match(r.re)}
            });
        if (!matches.length) {
            console.warn(`No routing found for ${fragment}`)
            return
        }

        const longestMatch = matches[0]
        longestMatch.match.shift()
        longestMatch.r.handler.apply({}, longestMatch.match)
        return this;
    }

    listen() {
        let current = this.getFragment();
        window.onhashchange = () => {
            if (current !== this.getFragment()) {
                current = this.getFragment();
                this.check(current);
            }
        }
        return this;
    }

    navigate(path?: string) {
        path = path ? path : '';
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.clearSlashes(path));
        } else {
            path = path.startsWith('#') ? path : '#' + path
            window.location.href = window.location.href.replace(/#(.*)$/, '') + path;
            this.check()
        }
        return this;
    }
}

export const Router = new RouterClass()