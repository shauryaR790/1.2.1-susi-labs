const SITE_URL = "https://susilabs.in"
const SITE_NAME = "SUSI LABS"

const STATIC_PAGES = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/products.html", changefreq: "daily", priority: "0.9" },
    { path: "/custom-build.html", changefreq: "monthly", priority: "0.8" }
]

module.exports = { SITE_URL, SITE_NAME, STATIC_PAGES }
