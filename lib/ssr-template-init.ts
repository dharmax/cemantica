import {Server} from "@hapi/hapi";
import * as Handlebars from "handlebars";
import * as path from "path";
import {number} from "@hapi/joi";
import {piecesController} from "../model-controllers/specific/pieces-controller";

export function configTemplateEngine(server: Server) {

    // @ts-ignore
    server.views({
        engines: {
            html: Handlebars,
        },
        relativeTo: path.join(__dirname, '..', 'ssr-fe'),
        path: 'templates'
    })

    // @ts-ignore
    server.route([{
        method: 'GET',
        path: '/content',
        handler: contentHandler
    }, {
        method: 'GET',
        path: '/content/{page}',
        //@ts-ignore
        config: {
            validate: {
                params: {
                    page: number().required()
                }
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
    return h.view('index', context)
}