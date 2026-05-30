const QRCode = require("qrcode")

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.statusCode = 405
        res.setHeader("Content-Type", "text/plain")
        res.end("Method not allowed")
        return
    }

    try {
        const data = String(req.query?.data || "").trim()
        if (!data || data.length > 512) {
            res.statusCode = 400
            res.setHeader("Content-Type", "text/plain")
            res.end("Missing or invalid QR data")
            return
        }

        const png = await QRCode.toBuffer(data, {
            type: "png",
            width: 240,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#FFFFFF" }
        })

        res.statusCode = 200
        res.setHeader("Content-Type", "image/png")
        res.setHeader("Cache-Control", "public, max-age=300")
        res.end(png)
    } catch (err) {
        console.error(err)
        res.statusCode = 500
        res.setHeader("Content-Type", "text/plain")
        res.end("Could not generate QR code")
    }
}
