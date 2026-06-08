const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { SITE_URL, STATIC_PAGES } = require("../lib/seo")

function escapeXml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

function formatLastmod(value) {
    if (!value) return new Date().toISOString().slice(0, 10)
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
    return date.toISOString().slice(0, 10)
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
    return [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : "",
        changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : "",
        priority ? `    <priority>${escapeXml(priority)}</priority>` : "",
        "  </url>"
    ]
        .filter(Boolean)
        .join("\n")
}

module.exports = async function handler(req, res) {
    const today = formatLastmod()
    const entries = STATIC_PAGES.map((page) =>
        buildUrlEntry({
            loc: `${SITE_URL}${page.path}`,
            lastmod: today,
            changefreq: page.changefreq,
            priority: page.priority
        })
    )

    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase.from("products").select("id, updated_at, is_active")

        if (error) throw error

        for (const product of (data || []).filter((row) => row.is_active !== false)) {
            if (!product?.id) continue
            entries.push(
                buildUrlEntry({
                    loc: `${SITE_URL}/product.html?id=${encodeURIComponent(product.id)}`,
                    lastmod: formatLastmod(product.updated_at),
                    changefreq: "weekly",
                    priority: "0.7"
                })
            )
        }
    } catch (err) {
        console.warn("[SUSI] Sitemap: could not load products:", err?.message || err)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`

    res.setHeader("Content-Type", "application/xml; charset=utf-8")
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
    res.status(200).send(xml)
}
