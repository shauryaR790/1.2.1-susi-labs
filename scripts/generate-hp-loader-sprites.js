/**
 * Strip black backgrounds from HP loader GIFs → transparent PNGs (first frame).
 * Run: node scripts/generate-hp-loader-sprites.js
 */
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const ROOT = path.join(__dirname, "..", "images")
const THRESHOLD = 28

const INPUTS = [
    { in: "decor-harry.gif", out: "hp-harry.png" },
    { in: "decor-dumbledore.gif", out: "hp-dumbledore.png" },
    { in: "decor-snape.gif", out: "hp-snape.png" },
    { in: "decor-wizard-teal.gif", out: "hp-hermione.png" },
    { in: "decor-broom.gif", out: "hp-broom.png" }
]

function stripBlack(data, threshold) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r <= threshold && g <= threshold && b <= threshold) {
            data[i + 3] = 0
        }
    }
    return data
}

async function processFrame({ in: inputName, out: outputName }) {
    const inputPath = path.join(ROOT, inputName)
    const outputPath = path.join(ROOT, outputName)

    if (!fs.existsSync(inputPath)) {
        console.warn(`[skip] missing ${inputName}`)
        return false
    }

    const { data, info } = await sharp(inputPath, { page: 0 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    stripBlack(data, THRESHOLD)

    await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    })
        .trim()
        .png()
        .toFile(outputPath)

    const outMeta = await sharp(outputPath).metadata()
    console.log(`[ok] ${outputName} → ${outMeta.width}x${outMeta.height}, alpha=${outMeta.hasAlpha}`)
    return true
}

;(async () => {
    let ok = 0
    for (const item of INPUTS) {
        if (await processFrame(item)) ok++
    }
    console.log(`Done. ${ok}/${INPUTS.length} sprites in images/`)
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
