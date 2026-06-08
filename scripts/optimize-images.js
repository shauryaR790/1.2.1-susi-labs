const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const root = path.join(__dirname, "..")

const jobs = [
    {
        input: "images/how-order-photo.jpg",
        outputs: [
            { file: "images/how-order-photo.webp", format: "webp", width: 1200, quality: 82 },
            { file: "images/how-order-photo-opt.jpg", format: "jpeg", width: 1200, quality: 82 }
        ]
    },
    {
        input: "Screenshot_2026-05-24_222301-removebg-preview.png",
        outputs: [{ file: "images/spiral-top.webp", format: "webp", width: 640, quality: 85 }]
    },
    {
        input: "Screenshot_2026-05-24_222342-removebg-preview.png",
        outputs: [{ file: "images/star-shape.webp", format: "webp", width: 480, quality: 85 }]
    }
]

async function runJob(job) {
    const inputPath = path.join(root, job.input)
    if (!fs.existsSync(inputPath)) {
        console.warn(`[SUSI] Skip missing image: ${job.input}`)
        return
    }

    for (const output of job.outputs) {
        const outPath = path.join(root, output.file)
        let pipeline = sharp(inputPath).rotate()
        if (output.width) {
            pipeline = pipeline.resize(output.width, null, { withoutEnlargement: true })
        }
        if (output.format === "webp") {
            pipeline = pipeline.webp({ quality: output.quality })
        } else {
            pipeline = pipeline.jpeg({ quality: output.quality, mozjpeg: true })
        }
        await pipeline.toFile(outPath)
        const size = Math.round(fs.statSync(outPath).size / 1024)
        console.log(`[SUSI] Wrote ${output.file} (${size} KB)`)
    }
}

async function main() {
    for (const job of jobs) {
        await runJob(job)
    }
}

main().catch((err) => {
    console.error("[SUSI] Image optimize failed:", err)
    process.exit(1)
})
