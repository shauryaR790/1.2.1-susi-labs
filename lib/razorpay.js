const crypto = require("crypto")

class RazorpayApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message)
        this.name = "RazorpayApiError"
        this.statusCode = statusCode
    }
}

function cleanEnv(value) {
    return String(value ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
}

function getRazorpayAuth() {
    const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID)
    const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET)
    if (!keyId || !keySecret) {
        throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET")
    }
    if (!/^rzp_(test|live)_/i.test(keyId)) {
        throw new Error("RAZORPAY_KEY_ID must start with rzp_test_ or rzp_live_")
    }
    const mode = keyId.includes("_live_") ? "live" : "test"
    if (mode === "live" && keySecret.length < 20) {
        throw new Error("RAZORPAY_KEY_SECRET looks invalid for live mode")
    }
    return { keyId, keySecret, mode, auth: Buffer.from(`${keyId}:${keySecret}`).toString("base64") }
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
    const { auth } = getRazorpayAuth()
    const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount: amountPaise,
            currency: "INR",
            receipt,
            notes
        })
    })

    const data = await res.json().catch(() => ({}))
    const description = String(data?.error?.description || "")
    if (res.status === 401 || /authentication failed/i.test(description)) {
        throw new RazorpayApiError(
            "Razorpay keys rejected. In Vercel, set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from the same API key pair (Test mode), redeploy, and ensure Key ID starts with rzp_test_.",
            401
        )
    }
    if (!res.ok) {
        throw new RazorpayApiError(description || "Razorpay order creation failed", 500)
    }
    return data
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
    const { keySecret } = getRazorpayAuth()
    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex")
    return expected === signature
}

async function fetchOrderPayments(razorpayOrderId) {
    const { auth } = getRazorpayAuth()
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}/payments`, {
        headers: {
            Authorization: `Basic ${auth}`
        }
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new RazorpayApiError(data?.error?.description || "Could not fetch Razorpay payments", res.status)
    }
    return data
}

function findCapturedPayment(paymentsPayload) {
    const items = paymentsPayload?.items || []
    return items.find((row) => row.status === "captured") || null
}

module.exports = {
    RazorpayApiError,
    getRazorpayAuth,
    createRazorpayOrder,
    verifyPaymentSignature,
    fetchOrderPayments,
    findCapturedPayment
}
