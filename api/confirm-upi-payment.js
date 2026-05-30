const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { sendUpiPendingEmail } = require("../lib/email")

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

        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single()

        if (fetchError || !order) {
            return json(res, 404, { error: "Order not found" })
        }

        if (order.payment_method !== "upi") {
            return json(res, 400, { error: "Not a UPI order" })
        }

        if (order.payment_status === "paid") {
            return json(res, 200, { ok: true, orderId: order.id, alreadyPaid: true })
        }

        const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId)

        await sendUpiPendingEmail({ order, items: items || [] })

        return json(res, 200, { ok: true, orderId: order.id })
    } catch (err) {
        console.error(err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
