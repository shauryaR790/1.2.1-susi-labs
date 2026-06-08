const { getRazorpayAuth } = require("../lib/razorpay")

function json(res, status, body) {
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Cache-Control", "no-store")
    res.end(JSON.stringify(body))
}

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const { keyId, mode } = getRazorpayAuth()
        return json(res, 200, {
            ok: true,
            mode,
            keyPrefix: `${keyId.slice(0, 12)}…`,
            testInstructions: mode === "test"
                ? {
                      card: "4111 1111 1111 1111",
                      expiry: "12/30",
                      cvv: "123",
                      otp: "123456",
                      upi: "success@razorpay",
                      upiNote: "Type this in the UPI ID field inside Razorpay. Do not scan the QR with PhonePe or GPay."
                  }
                : null
        })
    } catch (err) {
        console.error("[SUSI] payment-config:", err)
        return json(res, 500, { ok: false, error: err.message || "Payment not configured" })
    }
}
