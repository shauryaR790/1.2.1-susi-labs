const { sendCustomBuildEmail } = require("../lib/email")
const crypto = require("crypto")

const MAX_FILES = 5
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_TOTAL_BYTES = 12 * 1024 * 1024

const ALLOWED_EXT = new Set([
    "stl",
    "obj",
    "3mf",
    "step",
    "stp",
    "png",
    "jpg",
    "jpeg",
    "pdf",
    "zip",
    "rar",
    "gif",
    "webp"
])

function json(res, status, body) {
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(body))
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = ""
        req.on("data", (chunk) => {
            data += chunk
            if (data.length > 16 * 1024 * 1024) {
                reject(new Error("Payload too large"))
            }
        })
        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {})
            } catch {
                reject(new Error("Invalid JSON"))
            }
        })
        req.on("error", reject)
    })
}

function validate(body) {
    const projectName = String(body.projectName || "").trim()
    if (!projectName) return "Project name is required"

    const category = String(body.category || "").trim().toLowerCase()
    const categories = ["prototype", "figurine", "product", "custom"]
    if (!categories.includes(category)) return "Pick a category"

    const material = String(body.material || "").trim().toUpperCase()
    if (!["PLA", "TPU", "ABS"].includes(material)) return "Pick a material"

    const color = String(body.color || "").trim()
    if (!color) return "Pick a color"

    const qty = Number(body.quantity)
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) return "Invalid quantity"

    const urgency = String(body.urgency || "standard").trim().toLowerCase()
    const urgencies = ["standard", "express", "rush"]
    if (!urgencies.includes(urgency)) return "Pick urgency"

    const email = String(body.email || "").trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email"

    const phone = String(body.phone || "").trim()
    if (phone.length < 8) return "Phone number is required"

    return null
}

function sanitizeFiles(files) {
    if (!Array.isArray(files)) return { attachments: [], fileNames: [] }

    const attachments = []
    const fileNames = []
    let total = 0

    for (const file of files.slice(0, MAX_FILES)) {
        const name = String(file?.name || "file").trim()
        const ext = name.split(".").pop()?.toLowerCase() || ""
        if (!ALLOWED_EXT.has(ext)) {
            throw new Error(`File type not allowed: ${name}`)
        }

        const content = String(file?.content || "").replace(/\s/g, "")
        if (!content) continue

        const buf = Buffer.from(content, "base64")
        if (buf.length > MAX_FILE_BYTES) {
            throw new Error(`${name} is too large (max 4 MB each)`)
        }
        total += buf.length
        if (total > MAX_TOTAL_BYTES) {
            throw new Error("Total upload size too large (max 12 MB)")
        }

        attachments.push({ filename: name, content })
        fileNames.push(`${name} (${Math.round(buf.length / 1024)} KB)`)
    }

    return { attachments, fileNames }
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const body = await readBody(req)
        const err = validate(body)
        if (err) return json(res, 400, { error: err })

        const { attachments, fileNames } = sanitizeFiles(body.files)
        const requestId = crypto.randomUUID()

        const payload = {
            projectName: String(body.projectName).trim(),
            description: String(body.description || "").trim(),
            category: String(body.category).trim().toLowerCase(),
            dimensions: {
                length: String(body.dimensions?.length || "").trim(),
                width: String(body.dimensions?.width || "").trim(),
                height: String(body.dimensions?.height || "").trim()
            },
            referenceLink: String(body.referenceLink || "").trim(),
            application: String(body.application || "").trim(),
            material: String(body.material).trim().toUpperCase(),
            color: String(body.color).trim(),
            quantity: Number(body.quantity),
            urgency: String(body.urgency).trim().toLowerCase(),
            infill: String(body.infill || "").trim(),
            finish: String(body.finish || "").trim(),
            budgetRange: String(body.budgetRange || "").trim(),
            contactName: String(body.contactName || "").trim(),
            email: String(body.email).trim(),
            phone: String(body.phone).trim(),
            contactMethod: String(body.contactMethod || "").trim(),
            fileNames
        }

        await sendCustomBuildEmail({ requestId, payload, attachments })

        return json(res, 200, { ok: true, requestId })
    } catch (e) {
        console.error("[SUSI] custom-build-request:", e)
        return json(res, 500, { error: e.message || "Could not send request" })
    }
}
