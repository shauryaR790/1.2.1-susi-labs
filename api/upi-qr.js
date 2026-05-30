const QRCode = require("qrcode")
const { buildUpiPayUri, getDefaultVpa, normalizeVpa } = require("../lib/upi")

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.statusCode = 405
        res.setHeader("Content-Type", "text/plain")
        res.end("Method not allowed")
        return
    }

    try {
        let payload = String(req.query?.data || "").trim()

        if (!payload) {
            const vpa = req.query?.vpa || getDefaultVpa()
            const amountPaise = Math.round(Number(req.query?.amountPaise || req.query?.amount || 0))
            const orderId = String(req.query?.orderId || "").trim()
            const ref = orderId.replace(/-/g, "").slice(0, 8).toUpperCase()

            payload = buildUpiPayUri({
                vpa: normalizeVpa(vpa),
                amountPaise,
                transactionNote: ref ? `SUSI ${ref}` : ""
            })
        }

        if (!payload || payload.length > 512 || !payload.startsWith("upi://pay?")) {
            res.statusCode = 400
            res.setHeader("Content-Type", "text/plain")
            res.end("Missing or invalid QR data")
            return
        }

        const png = await QRCode.toBuffer(payload, {
            type: "png",
            width: 280,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#FFFFFF" }
        })

        res.statusCode = 200
        res.setHeader("Content-Type", "image/png")
        res.setHeader("Cache-Control", "no-store")
        res.end(png)
    } catch (err) {
        console.error(err)
        res.statusCode = 500
        res.setHeader("Content-Type", "text/plain")
        res.end(err.message || "Could not generate QR code")
    }
}
