const crypto = require("crypto")

function getRazorpayAuth() {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
        throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET")
    }
    return { keyId, keySecret, auth: Buffer.from(`${keyId}:${keySecret}`).toString("base64") }
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

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error?.description || "Razorpay order creation failed")
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

module.exports = { getRazorpayAuth, createRazorpayOrder, verifyPaymentSignature }
