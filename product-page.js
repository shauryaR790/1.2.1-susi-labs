/* =========================
   PRODUCT DETAIL — Supabase by ?id=
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

function escapeAttr(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
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

function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get("id")?.trim() || ""
}

function renderStatus(root, className, message) {
    if (!root) return
    root.innerHTML = `<p class="products-status ${className}" role="status">${escapeHtml(message)}</p>`
    root.setAttribute("aria-busy", "false")
}

function renderProduct(product, root) {
    const name = escapeHtml(product.name || "Untitled")
    const description = escapeHtml(String(product.description || "").trim())
    const price = escapeHtml(product.price || "")
    const category = escapeHtml(String(product.category || "").trim())
    const imageUrl = sanitizeImageUrl(product.image_url)
    const productId = escapeAttr(String(product.id ?? ""))

    const mediaClass = imageUrl
        ? "product-detail__media"
        : "product-detail__media product-detail__media--fallback"

    const imageMarkup = imageUrl
        ? `<img class="product-detail__img" src="${escapeAttr(imageUrl)}" alt="${name}" decoding="async" referrerpolicy="no-referrer">`
        : `<p class="product-detail__no-img">image unavailable</p>`

    root.innerHTML = `
        <article class="product-detail" data-product-id="${productId}">
            <div class="product-detail__layout">
                <div class="${mediaClass}">
                    ${imageMarkup}
                </div>
                <div class="product-detail__info">
                    ${category ? `<p class="product-detail__category">${category}</p>` : ""}
                    <h1 class="product-detail__title">${name}</h1>
                    ${price ? `<p class="product-detail__price">${price}</p>` : ""}
                    ${description ? `<div class="product-detail__desc">${description.replace(/\n/g, "<br>")}</div>` : ""}
                    <div class="product-detail__actions">
                        <button type="button" class="product-detail__btn product-detail__btn--cart" data-add-to-cart>add to cart</button>
                        <button type="button" class="product-detail__btn product-detail__btn--buy" data-buy-now>buy now</button>
                    </div>
                    <a class="product-detail__back" href="products.html">← back to shop</a>
                </div>
            </div>
        </article>
    `.trim()

    root.setAttribute("aria-busy", "false")
    document.title = `${product.name || "Product"} | SUSI LABS`

    const img = root.querySelector(".product-detail__img")
    if (img) {
        img.addEventListener("error", () => {
            const media = img.closest(".product-detail__media")
            img.remove()
            media?.classList.add("product-detail__media--fallback")
            if (media && !media.querySelector(".product-detail__no-img")) {
                media.insertAdjacentHTML("beforeend", `<p class="product-detail__no-img">image unavailable</p>`)
            }
        })
    }
}

function bindProductActions(product, root) {
    const addBtn = root.querySelector("[data-add-to-cart]")
    const buyBtn = root.querySelector("[data-buy-now]")

    function addToCart() {
        if (!window.SUSI_CART) return false
        window.SUSI_CART.addItem(product)
        return true
    }

    addBtn?.addEventListener("click", () => {
        if (!addToCart()) return
        addBtn.textContent = "added!"
        addBtn.classList.add("is-added")
        window.setTimeout(() => {
            addBtn.textContent = "add to cart"
            addBtn.classList.remove("is-added")
        }, 900)
    })

    buyBtn?.addEventListener("click", () => {
        if (!addToCart()) return
        window.location.href = "checkout.html"
    })
}

async function fetchProductById(client, id) {
    const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    if (!data || data.is_active === false) return null
    return data
}

async function initProductPage() {
    const root = document.querySelector("[data-product-detail]")
    if (!root) return

    root.setAttribute("aria-busy", "true")

    try {
        if (sessionStorage.getItem("susi:productIntro") === "1") {
            sessionStorage.removeItem("susi:productIntro")
        }
    } catch {}
    document.documentElement.classList.remove("products-intro")

    const id = getProductIdFromUrl()
    if (!id) {
        renderStatus(root, "products-status--error", "No product selected. Pick something from the shop.")
        return
    }

    const client = getSupabaseClient()
    if (!client) {
        renderStatus(
            root,
            "products-status--error",
            "Supabase is not configured. Copy supabase-config.example.js to supabase-config.js and add your anon key."
        )
        return
    }

    try {
        const product = await fetchProductById(client, id)
        if (!product) {
            renderStatus(root, "products-status--empty", "Product not found or no longer available.")
            return
        }

        renderProduct(product, root)
        bindProductActions(product, root)
        window.SUSI_CART?.refresh()
    } catch (err) {
        console.error("Product load failed:", err)
        const detail = err?.message ? ` (${err.message})` : ""
        renderStatus(root, "products-status--error", `Could not load this product${detail}.`)
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductPage, { once: true })
} else {
    initProductPage()
}
