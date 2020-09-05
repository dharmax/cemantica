import {Server} from "@hapi/hapi";
import * as Handlebars from "handlebars";
import {number, object} from "@hapi/joi";

export function configTemplateEngine(server: Server, templateEngineFilesRoot: string) {

    // @ts-ignore
    server.views({
        engines: {
            html: Handlebars,
        },
        relativeTo: templateEngineFilesRoot,
        path: '.'
    })

    // @ts-ignore
    server.route([
        {
            method: 'GET',
            path: '/content',
            handler: contentHandler
        }, {
            method: 'GET',
            path: '/content/{page}',
            //@ts-ignore
            config: {
                validate: {
                    params: object({
                        page: number().required()
                    }).required()
                }
            },
            handler: contentHandler
        }
    ]);

    Handlebars.registerHelper({
        eval: expr => {
            const func = new Function('context', 'return ' + expr)
            return func()
        }
    })

}

async function contentHandler(r, h) {
    const page = Number(r.params.page) || 1
    const pageSize = 1
    // @ts-ignore
    const piecesResult: IReadResult = await h.handle(piecesController, piecesController.load, {
        from: (page - 1) * pageSize,
        count: pageSize
    }, 'SEO')

    const context: any = {
        page,
        pieces: piecesResult.items,
        firstPiece: piecesResult.items[0]
    }
    if (page)
        context.prev = page - 1
    const rest = (piecesResult.totalFiltered - page * pageSize) / pageSize
    const totalPages = Math.floor(piecesResult.totalFiltered / pageSize)
    if (rest > 0)
        context.next = page + 1
    const a = []
    for (let p = Math.floor((page + 10) / 10) * 10, n = 0; p <= totalPages && n < 15; p += 10, n++) {
        a.push(p)
    }
    context.last = totalPages
    context.followUp = a

    //@ts-ignore
    return h.view('templates/static-content', context)
}