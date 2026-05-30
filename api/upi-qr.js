const { generateUpiPayment, getDefaultVpa } = require("../lib/upi")

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.statusCode = 405
        res.setHeader("Content-Type", "text/plain")
        res.end("Method not allowed")
        return
    }

    try {
        const amountPaise = Math.round(Number(req.query?.amountPaise || req.query?.amount || 0))
        const orderId = String(req.query?.orderId || "").trim()

        if (!amountPaise || amountPaise < 100) {
            res.statusCode = 400
            res.setHeader("Content-Type", "text/plain")
            res.end("Missing or invalid amount")
            return
        }

        const { qrDataUrl } = await generateUpiPayment({
            vpa: getDefaultVpa(),
            amountPaise,
            orderId
        })

        const base64 = String(qrDataUrl || "").split(",")[1]
        if (!base64) {
            throw new Error("Could not build UPI QR image")
        }

        const png = Buffer.from(base64, "base64")

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
