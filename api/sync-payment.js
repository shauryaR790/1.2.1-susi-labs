const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { fetchOrderPayments, findCapturedPayment } = require("../lib/razorpay")
const { completeOrderPayment } = require("../lib/complete-order-payment")

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

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const body = await readBody(req)
        const orderId = String(body.orderId || "").trim()

        if (!orderId) {
            return json(res, 400, { error: "Missing order ID" })
        }

        const supabase = getSupabaseAdmin()

        const { data: order, error: fetchError } = await supabase.from("orders").select("*").eq("id", orderId).single()

        if (fetchError || !order) {
            return json(res, 404, { error: "Order not found" })
        }

        if (order.payment_status === "paid") {
            return json(res, 200, { ok: true, paid: true, orderId: order.id, alreadyPaid: true })
        }

        if (!order.razorpay_order_id) {
            return json(res, 200, { ok: true, paid: false })
        }

        let paymentsPayload
        try {
            paymentsPayload = await fetchOrderPayments(order.razorpay_order_id)
        } catch (razorpayErr) {
            console.error("[SUSI] sync-payment Razorpay fetch failed:", razorpayErr.message, {
                orderId,
                razorpay_order_id: order.razorpay_order_id
            })
            return json(res, razorpayErr.statusCode || 500, {
                error: razorpayErr.message || "Could not check Razorpay payment status"
            })
        }

        const captured = findCapturedPayment(paymentsPayload)

        if (!captured?.id) {
            const statuses = (paymentsPayload?.items || []).map((row) => row.status).join(", ") || "none"
            console.log("[SUSI] sync-payment: no captured payment yet", { orderId, statuses })
            return json(res, 200, { ok: true, paid: false })
        }

        const result = await completeOrderPayment(supabase, orderId, captured.id)

        if (result.error) {
            return json(res, result.status || 500, { error: result.error })
        }

        return json(res, 200, {
            ok: true,
            paid: true,
            orderId: result.orderId,
            razorpay_order_id: order.razorpay_order_id,
            razorpay_payment_id: captured.id
        })
    } catch (err) {
        console.error(err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
