interface BuildUrlOptions {
    path?: string[]
    queryParams?: Object
    hash?: string
}

/**
 * An easy way to build URLs with parameters and everything
 */
export function buildUrl(urlOrOptions: string | BuildUrlOptions, options?: BuildUrlOptions) {
    let queryString = [];
    let key;
    let builtUrl;

    if (!urlOrOptions) {
        builtUrl = '';
    } else if (typeof (urlOrOptions) === 'string') {
        builtUrl = urlOrOptions;
    } else {
        builtUrl = '';
        options = urlOrOptions;
    }

    if (options) {
        if (options.path && options.path.length) {
            builtUrl += '/' + options.path.join('/');
        }

        if (options.queryParams) {
            for (key in options.queryParams) {
                if (options.queryParams.hasOwnProperty(key)) {

                    const value = options.queryParams[key];
                    if (value === null || value === undefined)
                        continue

                    queryString.push(key + '=' + value);
                }
            }
            builtUrl += '?' + queryString.join('&');
        }

        if (options.hash) {
            builtUrl += '#' + options.hash;
        }
    }

    return builtUrl;
}
