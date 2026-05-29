const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { verifyPaymentSignature } = require("../lib/razorpay")
const { sendOrderEmail } = require("../lib/email")

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
        const {
            orderId,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature
        } = body

        if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return json(res, 400, { error: "Missing payment fields" })
        }

        const valid = verifyPaymentSignature({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature
        })

        if (!valid) {
            return json(res, 400, { error: "Payment verification failed" })
        }

        const supabase = getSupabaseAdmin()

        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single()

        if (fetchError || !order) {
            return json(res, 404, { error: "Order not found" })
        }

        if (order.razorpay_order_id !== razorpayOrderId) {
            return json(res, 400, { error: "Order mismatch" })
        }

        if (order.payment_status === "paid") {
            return json(res, 200, { ok: true, orderId: order.id, alreadyPaid: true })
        }

        const { data: updated, error: updateError } = await supabase
            .from("orders")
            .update({
                payment_status: "paid",
                razorpay_payment_id: razorpayPaymentId
            })
            .eq("id", orderId)
            .select("*")
            .single()

        if (updateError || !updated) {
            console.error(updateError)
            return json(res, 500, { error: "Could not update order" })
        }

        const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId)

        await sendOrderEmail({ order: updated, items: items || [] })

        return json(res, 200, { ok: true, orderId: updated.id })
    } catch (err) {
        console.error(err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
