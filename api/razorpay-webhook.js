const crypto = require("crypto")
const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { completeOrderPayment } = require("../lib/complete-order-payment")

function cleanEnv(value) {
    return String(value ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
}

function json(res, status, body) {
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(body))
}

function readRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = ""
        req.on("data", (chunk) => {
            data += chunk
        })
        req.on("end", () => resolve(data))
        req.on("error", reject)
    })
}

function verifyWebhookSignature(rawBody, signature, secret) {
    if (!secret || !signature) return false
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
    return expected === signature
}

async function markPaidByRazorpayOrderId(supabase, razorpayOrderId, razorpayPaymentId) {
    const { data: order, error } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("razorpay_order_id", razorpayOrderId)
        .single()

    if (error || !order) {
        console.warn("[SUSI] Webhook: no local order for Razorpay order", razorpayOrderId)
        return { ok: false }
    }

    if (order.payment_status === "paid") {
        return { ok: true, alreadyPaid: true, orderId: order.id }
    }

    return completeOrderPayment(supabase, order.id, razorpayPaymentId)
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const rawBody = await readRawBody(req)
        const signature = req.headers["x-razorpay-signature"]
        const secret = cleanEnv(process.env.RAZORPAY_WEBHOOK_SECRET)

        if (secret && !verifyWebhookSignature(rawBody, signature, secret)) {
            console.error("[SUSI] Razorpay webhook signature invalid")
            return json(res, 400, { error: "Invalid signature" })
        }

        if (!secret) {
            console.warn("[SUSI] RAZORPAY_WEBHOOK_SECRET not set — webhook accepted without signature check")
        }

        const event = JSON.parse(rawBody || "{}")
        const eventType = event.event
        const supabase = getSupabaseAdmin()

        if (eventType === "payment.captured") {
            const payment = event.payload?.payment?.entity
            const razorpayOrderId = payment?.order_id
            const razorpayPaymentId = payment?.id

            if (razorpayOrderId && razorpayPaymentId) {
                const result = await markPaidByRazorpayOrderId(supabase, razorpayOrderId, razorpayPaymentId)
                console.log("[SUSI] Webhook payment.captured:", result)
            }
        }

        if (eventType === "order.paid") {
            const orderEntity = event.payload?.order?.entity
            const razorpayOrderId = orderEntity?.id
            const payments = orderEntity?.payments || []
            const razorpayPaymentId = payments[0] || null

            if (razorpayOrderId && razorpayPaymentId) {
                const result = await markPaidByRazorpayOrderId(supabase, razorpayOrderId, razorpayPaymentId)
                console.log("[SUSI] Webhook order.paid:", result)
            }
        }

        return json(res, 200, { ok: true })
    } catch (err) {
        console.error("[SUSI] Razorpay webhook error:", err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
