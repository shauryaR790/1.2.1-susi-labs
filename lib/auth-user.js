const { getSupabaseAdmin } = require("./supabase-admin")

function getBearerToken(req) {
    const header = req.headers?.authorization || req.headers?.Authorization || ""
    if (!header.startsWith("Bearer ")) return null
    return header.slice(7).trim() || null
}

async function getUserFromRequest(req) {
    const token = getBearerToken(req)
    if (!token) return null

    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase.auth.getUser(token)
        if (error || !data?.user) return null
        return data.user
    } catch {
        return null
    }
}

module.exports = { getBearerToken, getUserFromRequest }
