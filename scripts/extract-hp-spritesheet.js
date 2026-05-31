/**
 * Crop mudkat101 HP sprite sheet → clean transparent PNGs.
 * Run: node scripts/extract-hp-spritesheet.js
 */
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const SHEET = path.join(__dirname, "..", "images", "hp-spritesheet.png")
const OUT = path.join(__dirname, "..", "images")

/** Manual crops on 1024×937 sheet (verified grid) */
const PICKS = [
    { file: "hp-harry.png", left: 8, top: 6, width: 82, height: 112 },
    { file: "hp-ron.png", left: 90, top: 6, width: 82, height: 112 },
    { file: "hp-hermione.png", left: 172, top: 6, width: 82, height: 112 },
    { file: "hp-dumbledore.png", left: 8, top: 232, width: 82, height: 118 },
    { file: "hp-snape.png", left: 90, top: 232, width: 82, height: 118 },
    { file: "hp-dobby.png", left: 758, top: 698, width: 98, height: 125 }
]

function stripBackground(data) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // white sheet + light watermark
        if (r >= 232 && g >= 232 && b >= 232) {
            data[i + 3] = 0
        }
    }
    return data
}

async function extractOne(pick) {
    const { data, info } = await sharp(SHEET)
        .extract({
            left: pick.left,
            top: pick.top,
            width: pick.width,
            height: pick.height
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    stripBackground(data)

    const outPath = path.join(OUT, pick.file)
    await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
    })
        .trim({ threshold: 12 })
        .png()
        .toFile(outPath)

    const m = await sharp(outPath).metadata()
    console.log(`[ok] ${pick.file} → ${m.width}×${m.height}`)
}

;(async () => {
    if (!fs.existsSync(SHEET)) {
        console.error("Missing hp-spritesheet.png")
        process.exit(1)
    }
    for (const pick of PICKS) {
        await extractOne(pick)
    }
    console.log(`Done — ${PICKS.length} sprites`)
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
