const { getRazorpayAuth } = require("../lib/razorpay")

function cleanEnv(value) {
    return String(value ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
}

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
        const resendKey = cleanEnv(process.env.RESEND_API_KEY)
        const adminEmail = cleanEnv(process.env.ADMIN_EMAIL) || "dcchampavat@gmail.com"
        const fromEmail = cleanEnv(process.env.RESEND_FROM) || "SUSI LABS <onboarding@resend.dev>"
        const usesTestSender = fromEmail.includes("onboarding@resend.dev")

        return json(res, 200, {
            ok: true,
            mode,
            keyPrefix: `${keyId.slice(0, 12)}…`,
            email: {
                resendConfigured: Boolean(resendKey),
                adminEmail,
                fromEmail,
                usesTestSender,
                note: usesTestSender
                    ? "ADMIN_EMAIL must be the same Gmail you used to sign up for Resend when using onboarding@resend.dev"
                    : null
            },
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
