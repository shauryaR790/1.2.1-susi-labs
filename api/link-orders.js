const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { getUserFromRequest } = require("../lib/auth-user")

function json(res, status, body) {
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Cache-Control", "no-store")
    res.end(JSON.stringify(body))
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const user = await getUserFromRequest(req)
        if (!user?.id || !user.email) {
            return json(res, 401, { error: "Sign in required" })
        }

        const supabase = getSupabaseAdmin()
        const email = String(user.email).trim().toLowerCase()

        const { data, error } = await supabase
            .from("orders")
            .update({ user_id: user.id })
            .is("user_id", null)
            .ilike("customer_email", email)
            .select("id")

        if (error) {
            console.error("[SUSI] link-orders:", error)
            return json(res, 500, { error: "Could not link orders" })
        }

        return json(res, 200, { ok: true, linked: (data || []).length })
    } catch (err) {
        console.error("[SUSI] link-orders:", err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
