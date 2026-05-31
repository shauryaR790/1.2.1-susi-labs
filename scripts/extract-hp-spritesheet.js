/**
 * Crop mudkat101 HP sprite sheet → transparent PNGs for site loader.
 * Run: node scripts/extract-hp-spritesheet.js
 */
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const SHEET = path.join(__dirname, "..", "images", "hp-spritesheet.png")
const OUT = path.join(__dirname, "..", "images")
const WHITE = 248

const COLS = 12
const ROWS = 8

/** @type {Array<{file:string, row?:number, col?:number, manual?:{left:number,top:number,width:number,height:number}}>} */
const PICKS = [
    { file: "hp-harry.png", row: 0, col: 0 },
    { file: "hp-ron.png", row: 0, col: 1 },
    { file: "hp-hermione.png", row: 0, col: 2 },
    { file: "hp-dumbledore.png", row: 2, col: 0 },
    { file: "hp-snape.png", row: 2, col: 1 },
    { file: "hp-draco.png", row: 2, col: 4 },
    { file: "hp-luna.png", row: 4, col: 4 },
    { file: "hp-neville.png", row: 3, col: 3 },
    { file: "hp-hedwig.png", manual: { left: 848, top: 468, width: 88, height: 105 } },
    { file: "hp-dobby.png", manual: { left: 762, top: 702, width: 92, height: 118 } },
    { file: "hp-hat.png", manual: { left: 848, top: 702, width: 88, height: 118 } }
]

function stripWhite(data) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r >= WHITE && g >= WHITE && b >= WHITE) {
            data[i + 3] = 0
        }
    }
    return data
}

async function extractOne(meta, pick) {
    let left, top, width, height

    if (pick.manual) {
        ;({ left, top, width, height } = pick.manual)
    } else {
        const cellW = meta.width / COLS
        const cellH = meta.height / ROWS
        const pad = 2
        left = Math.max(0, Math.floor(pick.col * cellW + pad))
        top = Math.max(0, Math.floor(pick.row * cellH + pad))
        width = Math.min(meta.width - left, Math.floor(cellW - pad * 2))
        height = Math.min(meta.height - top, Math.floor(cellH - pad * 2))
    }

    const { data, info } = await sharp(SHEET)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    stripWhite(data)

    const outPath = path.join(OUT, pick.file)
    await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
    })
        .trim({ threshold: 10 })
        .png()
        .toFile(outPath)

    const outMeta = await sharp(outPath).metadata()
    console.log(`[ok] ${pick.file} → ${outMeta.width}×${outMeta.height}`)
}

;(async () => {
    if (!fs.existsSync(SHEET)) {
        console.error("Missing hp-spritesheet.png")
        process.exit(1)
    }

    const meta = await sharp(SHEET).metadata()
    console.log(`Sheet ${meta.width}×${meta.height}`)

    for (const pick of PICKS) {
        await extractOne(meta, pick)
    }

    console.log(`Done — ${PICKS.length} sprites`)
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
