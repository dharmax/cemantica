export function buildUrl(url, options) {
    let queryString = [];
    let key;
    let builtUrl;

    if (url === null) {
        builtUrl = '';
    } else if (typeof (url) === 'object') {
        builtUrl = '';
        options = url;
    } else {
        builtUrl = url;
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
