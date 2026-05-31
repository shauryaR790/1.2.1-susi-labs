/* =========================
   PRODUCTS — Supabase catalog
========================= */

function getSupabaseClient() {
    const cfg = window.SUSI_SUPABASE
    if (!cfg?.url || !cfg?.anonKey || cfg.anonKey === "PASTE_YOUR_ANON_KEY_HERE") {
        return null
    }
    if (!window.supabase?.createClient) {
        return null
    }
    return window.supabase.createClient(cfg.url, cfg.anonKey)
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function truncateText(str, max = 120) {
    const s = String(str ?? "").trim()
    if (s.length <= max) return s
    return `${s.slice(0, max).trim()}…`
}

function sanitizeImageUrl(raw) {
    const url = String(raw ?? "").replace(/[\r\n]+/g, "").trim()
    if (!url) return ""
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return ""
        return url
    } catch {
        return ""
    }
}

function escapeAttr(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
}

function attachProductImageFallback(grid) {
    if (!grid || grid.dataset.imageFallback === "1") return
    grid.dataset.imageFallback = "1"
    grid.addEventListener(
        "error",
        (event) => {
            const img = event.target
            if (!(img instanceof HTMLImageElement) || !img.classList.contains("product-card__img")) return
            const failedSrc = img.currentSrc || img.src
            const visual = img.closest(".product-card__visual")
            console.warn("[SUSI] Product image failed to load:", failedSrc)
            img.remove()
            visual?.classList.add("product-card__visual--fallback")
        },
        true
    )
}

function buildProductCard(product) {
    const name = escapeHtml(product.name || "Untitled")
    const description = escapeHtml(truncateText(product.description || ""))
    const price = escapeHtml(product.price || "")
    const category = escapeHtml((product.category || "").toLowerCase())
    const imageUrl = sanitizeImageUrl(product.image_url)
    const productId = escapeAttr(String(product.id ?? product.name ?? ""))
    const cartLabel = `Add ${product.name || "product"} to cart`
    const visualClass = imageUrl ? "product-card__visual" : "product-card__visual product-card__visual--fallback"

    const visualContent = imageUrl
        ? `<img class="product-card__img" src="${escapeAttr(imageUrl)}" alt="${name}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
        : ""

    return `
        <article class="product-card" data-category="${category}" data-product-id="${productId}">
            <div class="${visualClass}">
                ${visualContent}
            </div>
            <h2 class="product-card__name">${name}</h2>
            ${price ? `<p class="product-card__price">${price}</p>` : ""}
            ${description ? `<p class="product-card__meta">${description}</p>` : ""}
            <button type="button" class="product-card__btn" data-add-to-cart data-product-id="${productId}" aria-label="${escapeHtml(cartLabel)}">add to cart</button>
        </article>
    `.trim()
}

function setGridMessage(grid, className, message) {
    grid.innerHTML = `<p class="products-status ${className}" role="status">${escapeHtml(message)}</p>`
    grid.setAttribute("aria-busy", "false")
}

async function fetchProducts(client) {
    const { data, error } = await client.from("products").select("*")

    if (error) throw error

    const rows = (data || []).filter((row) => row.is_active !== false)

    rows.sort((a, b) => {
        const orderA = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 9999
        const orderB = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 9999
        if (orderA !== orderB) return orderA - orderB
        return String(a.name || "").localeCompare(String(b.name || ""))
    })

    return rows
}

function renderProducts(products, grid, activeCategory = "all") {
    const filtered =
        activeCategory === "all"
            ? products
            : products.filter((p) => (p.category || "").toLowerCase() === activeCategory)

    if (!filtered.length) {
        setGridMessage(
            grid,
            "products-status--empty",
            activeCategory === "all"
                ? "No products yet. Add rows in Supabase → products table."
                : `No products in “${activeCategory}” yet.`
        )
        return []
    }

    grid.innerHTML = filtered.map(buildProductCard).join("")
    grid.setAttribute("aria-busy", "false")
    attachProductImageFallback(grid)
    return filtered
}

let productsCatalog = []

function initAddToCart(grid) {
    if (!grid || grid.dataset.cartBound === "1") return
    grid.dataset.cartBound = "1"

    grid.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-add-to-cart]")
        if (!btn) return

        const id = btn.getAttribute("data-product-id")
        const product = productsCatalog.find((row) => String(row.id ?? row.name ?? "") === id)
        if (!product || !window.SUSI_CART) return

        window.SUSI_CART.addItem(product)
        btn.textContent = "added!"
        btn.classList.add("is-added")

        window.setTimeout(() => {
            btn.textContent = "add to cart"
            btn.classList.remove("is-added")
        }, 900)
    })
}

function initProductFilters(products, grid) {
    const buttons = document.querySelectorAll(".products-filter")
    if (!buttons.length) return

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const category = (btn.textContent || "all").trim().toLowerCase()

            buttons.forEach((b) => b.classList.remove("is-active"))
            btn.classList.add("is-active")

            const rendered = renderProducts(products, grid, category)
            window.dispatchEvent(
                new CustomEvent("susi:products-filtered", {
                    detail: { category, count: rendered.length }
                })
            )
        })
    })
}

function runProductsIntro() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let shouldIntro = false
    try {
        shouldIntro = sessionStorage.getItem("susi:productsIntro") === "1"
        if (shouldIntro) sessionStorage.removeItem("susi:productsIntro")
    } catch {
        shouldIntro = false
    }

    if (!shouldIntro || prefersReduced) {
        document.documentElement.classList.remove("products-intro")
        return
    }

    const startIntro = () => {
        if (!window.gsap) return

        document.documentElement.classList.remove("products-intro")

        const isMobileHeader = window.matchMedia("(max-width: 992px)").matches
        const tl = window.gsap.timeline({
            defaults: { ease: "power3.out" },
            onComplete: () => {
                window.gsap.set(
                    [
                        document.querySelector(".products-home"),
                        document.querySelector(".products-title"),
                        document.querySelector(".products-title h1"),
                        document.querySelector(".cart-nav")
                    ].filter(Boolean),
                    { clearProps: "transform,opacity" }
                )
            }
        })
        const ticker = document.querySelector(".products-ticker")
        const home = document.querySelector(".products-home")
        const title = document.querySelector(".products-title")
        const titleHeading = document.querySelector(".products-title h1")
        const controls = document.querySelector(".products-controls")
        const cards = document.querySelectorAll(".product-card")
        const footer = document.querySelector(".products-footer")
        const cartNav = document.querySelector(".cart-nav")

        if (ticker) tl.from(ticker, { y: -14, opacity: 0, duration: 0.5 }, 0.08)

        if (isMobileHeader) {
            const headerFade = { opacity: 0, duration: 0.45 }
            if (home) tl.from(home, headerFade, 0.12)
            if (titleHeading) tl.from(titleHeading, headerFade, 0.14)
            if (cartNav) tl.from(cartNav, headerFade, 0.14)
        } else {
            if (home) tl.from(home, { y: 18, opacity: 0, duration: 0.65 }, 0.14)
            if (title) tl.from(title.children, { y: 18, opacity: 0, duration: 0.65, stagger: 0.09 }, 0.16)
            if (cartNav) tl.from(cartNav, { y: 12, opacity: 0, duration: 0.55 }, 0.18)
        }

        if (controls) tl.from(controls.children, { y: 14, opacity: 0, duration: 0.6, stagger: 0.06 }, 0.24)
        if (cards.length) tl.from(cards, { y: 26, opacity: 0, duration: 0.75, stagger: 0.06 }, 0.3)
        if (footer) tl.from(footer.children, { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.42)
    }

    let tries = 0
    const waitForGsap = () => {
        if (window.gsap) {
            startIntro()
            return
        }
        tries++
        if (tries > 60) {
            document.documentElement.classList.remove("products-intro")
            return
        }
        requestAnimationFrame(waitForGsap)
    }

    waitForGsap()
}

async function initProductsCatalog() {
    const grid = document.querySelector(".products-grid-page")
    if (!grid) return

    grid.setAttribute("aria-busy", "true")

    const client = getSupabaseClient()
    if (!client) {
        setGridMessage(
            grid,
            "products-status--error",
            "Supabase is not configured. Copy supabase-config.example.js to supabase-config.js and add your anon key."
        )
        document.documentElement.classList.remove("products-intro")
        return
    }

    try {
        const products = await fetchProducts(client)
        productsCatalog = products
        const rendered = renderProducts(products, grid, "all")
        initAddToCart(grid)
        initProductFilters(products, grid)
        window.SUSI_CART?.refresh()

        window.dispatchEvent(
            new CustomEvent("susi:products-loaded", {
                detail: { count: rendered.length }
            })
        )

        runProductsIntro()
    } catch (err) {
        console.error("Products load failed:", err)
        const detail = err?.message ? ` (${err.message})` : ""
        setGridMessage(
            grid,
            "products-status--error",
            `Could not load products${detail}. Check Project URL + publishable key in supabase-config.js, and use a local server (not file://).`
        )
        document.documentElement.classList.remove("products-intro")
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductsCatalog, { once: true })
} else {
    initProductsCatalog()
}
