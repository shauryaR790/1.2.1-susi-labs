const fs = require("fs")
const path = require("path")

const url = (process.env.SUSI_SUPABASE_URL || "").trim()
const anonKey = (process.env.SUSI_SUPABASE_ANON_KEY || "").trim()
const outPath = path.join(__dirname, "..", "supabase-config.js")

if (!url || !anonKey) {
    const msg =
        "[SUSI] Missing SUSI_SUPABASE_URL or SUSI_SUPABASE_ANON_KEY — could not generate supabase-config.js."
    if (process.env.VERCEL) {
        console.error(msg)
        process.exit(1)
    }
    console.warn(msg)
    process.exit(0)
}

const content = `// Generated at build time — do not edit manually.
window.SUSI_SUPABASE = {
    url: ${JSON.stringify(url)},
    anonKey: ${JSON.stringify(anonKey)}
}
`

fs.writeFileSync(outPath, content, "utf8")
console.log("[SUSI] Generated supabase-config.js for deploy.")
