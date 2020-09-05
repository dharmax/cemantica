import {hash} from "bcryptjs";

async function conv() {
    const pws = await Promise.all(['iamhome900', 'Krishna11', '302953377', 'ivaivaivaiva'].map(async opw => {
        return {
            opw,
            hashed: await hash(opw, 10)
        }
    }))
    console.log(pws)

}

conv()