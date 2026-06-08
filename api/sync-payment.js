const { getSupabaseAdmin } = require("../lib/supabase-admin")
const {
    fetchRazorpayOrder,
    fetchOrderPayments,
    findCapturedPayment,
    findAuthorizedPayment,
    captureRazorpayPayment,
    isPaymentCaptured,
    isRazorpayOrderSettled
} = require("../lib/razorpay")
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

async function resolveCapturedPayment(razorpayOrderId, orderAmountPaise, paymentsPayload, razorpayOrder) {
    let payment = findCapturedPayment(paymentsPayload)

    if (!payment) {
        const authorized = findAuthorizedPayment(paymentsPayload)
        if (authorized?.id && orderAmountPaise) {
            try {
                const captured = await captureRazorpayPayment(authorized.id, orderAmountPaise)
                if (isPaymentCaptured(captured)) {
                    payment = captured
                }
            } catch (captureErr) {
                console.warn("[SUSI] sync-payment capture failed:", captureErr.message, {
                    paymentId: authorized.id
                })
            }
        }
    }

    if (!payment && isRazorpayOrderSettled(razorpayOrder)) {
        const refreshed = await fetchOrderPayments(razorpayOrderId)
        payment = findCapturedPayment(refreshed)
    }

    return isPaymentCaptured(payment) ? payment : null
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

        let razorpayOrder
        let paymentsPayload

        try {
            ;[razorpayOrder, paymentsPayload] = await Promise.all([
                fetchRazorpayOrder(order.razorpay_order_id),
                fetchOrderPayments(order.razorpay_order_id)
            ])
        } catch (razorpayErr) {
            console.error("[SUSI] sync-payment Razorpay fetch failed:", razorpayErr.message, {
                orderId,
                razorpay_order_id: order.razorpay_order_id
            })
            return json(res, razorpayErr.statusCode || 500, {
                error: razorpayErr.message || "Could not check Razorpay payment status"
            })
        }

        const payment = await resolveCapturedPayment(
            order.razorpay_order_id,
            order.amount_paise,
            paymentsPayload,
            razorpayOrder
        )

        if (!payment) {
            const statuses = (paymentsPayload?.items || []).map((row) => row.status).join(", ") || "none"
            console.log("[SUSI] sync-payment: no captured payment yet", {
                orderId,
                razorpayOrderStatus: razorpayOrder?.status || "unknown",
                paymentStatuses: statuses
            })
            return json(res, 200, {
                ok: true,
                paid: false,
                razorpayOrderStatus: razorpayOrder?.status || null
            })
        }

        const result = await completeOrderPayment(supabase, orderId, payment.id)

        if (result.error) {
            return json(res, result.status || 500, { error: result.error })
        }

        return json(res, 200, {
            ok: true,
            paid: true,
            orderId: result.orderId,
            razorpay_order_id: order.razorpay_order_id,
            razorpay_payment_id: payment.id
        })
    } catch (err) {
        console.error(err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
