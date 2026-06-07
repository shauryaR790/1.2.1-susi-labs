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

function uniqueImageUrls(urls) {
    const seen = new Set()
    return urls.filter((url) => {
        if (!url || seen.has(url)) return false
        seen.add(url)
        return true
    })
}

function resolveGalleryImages(product, galleryRows) {
    const fromTable = (galleryRows || [])
        .map((row) => sanitizeImageUrl(row.image_url))
        .filter(Boolean)

    if (fromTable.length) return uniqueImageUrls(fromTable)

    const main = sanitizeImageUrl(product.image_url)
    return main ? [main] : []
}

function buildGalleryMarkup(images, productName) {
    const safeName = escapeHtml(productName || "Product")
    const hasMultiple = images.length > 1

    const mainUrl = escapeAttr(images[0])
    const mainAlt = escapeAttr(`${productName || "Product"} — image 1`)

    const navMarkup = hasMultiple
        ? `
            <button type="button" class="product-gallery__nav product-gallery__nav--prev" data-gallery-prev aria-label="Previous image">‹</button>
            <button type="button" class="product-gallery__nav product-gallery__nav--next" data-gallery-next aria-label="Next image">›</button>
            <p class="product-gallery__counter" data-gallery-counter aria-live="polite">1 / ${images.length}</p>
        `
        : ""

    const thumbsMarkup = hasMultiple
        ? `
            <div class="product-gallery__thumbs" role="tablist" aria-label="Product image thumbnails">
                ${images
                    .map((url, index) => {
                        const thumbUrl = escapeAttr(url)
                        const label = escapeAttr(`${productName || "Product"} — image ${index + 1}`)
                        const active = index === 0 ? " is-active" : ""
                        return `
                            <button
                                type="button"
                                class="product-gallery__thumb${active}"
                                role="tab"
                                aria-selected="${index === 0 ? "true" : "false"}"
                                aria-label="Show image ${index + 1}"
                                data-gallery-thumb="${index}"
                            >
                                <img src="${thumbUrl}" alt="${label}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                            </button>
                        `.trim()
                    })
                    .join("")}
            </div>
        `
        : ""

    return `
        <div class="product-detail__gallery" data-product-gallery data-gallery-count="${images.length}" tabindex="0">
            <div class="product-detail__media product-detail__media--carousel">
                <div class="product-gallery__stage" data-gallery-stage>
                    <img
                        class="product-detail__img product-gallery__main"
                        src="${mainUrl}"
                        alt="${mainAlt}"
                        data-gallery-main
                        decoding="async"
                        referrerpolicy="no-referrer"
                    >
                </div>
                ${navMarkup}
            </div>
            ${thumbsMarkup}
        </div>
    `.trim()
}

function buildSingleImageMarkup(imageUrl, productName) {
    const name = escapeHtml(productName || "Product")
    const url = escapeAttr(imageUrl)

    return `
        <div class="product-detail__media">
            <img class="product-detail__img" src="${url}" alt="${escapeAttr(productName || "Product")}" decoding="async" referrerpolicy="no-referrer">
        </div>
    `.trim()
}

function renderProduct(product, root, galleryRows) {
    const name = escapeHtml(product.name || "Untitled")
    const description = escapeHtml(String(product.description || "").trim())
    const price = escapeHtml(product.price || "")
    const category = escapeHtml(String(product.category || "").trim())
    const productId = escapeAttr(String(product.id ?? ""))
    const images = resolveGalleryImages(product, galleryRows)

    let mediaMarkup
    if (!images.length) {
        mediaMarkup = `<div class="product-detail__media product-detail__media--fallback"><p class="product-detail__no-img">image unavailable</p></div>`
    } else if (images.length > 1) {
        mediaMarkup = buildGalleryMarkup(images, product.name || "Product")
    } else {
        mediaMarkup = buildSingleImageMarkup(images[0], product.name || "Product")
    }

    root.innerHTML = `
        <article class="product-detail" data-product-id="${productId}">
            <div class="product-detail__layout">
                ${mediaMarkup}
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

    bindProductImageFallback(root)
    if (images.length > 1) bindProductGallery(root, images, product.name || "Product")
}

function bindProductImageFallback(root) {
    root.querySelectorAll(".product-detail__img, .product-gallery__thumb img").forEach((img) => {
        img.addEventListener("error", () => {
            if (img.classList.contains("product-gallery__main")) {
                const media = img.closest(".product-detail__media")
                img.remove()
                media?.classList.add("product-detail__media--fallback")
                if (media && !media.querySelector(".product-detail__no-img")) {
                    media.insertAdjacentHTML("beforeend", `<p class="product-detail__no-img">image unavailable</p>`)
                }
                return
            }

            const thumb = img.closest(".product-gallery__thumb")
            thumb?.remove()
        })
    })
}

function bindProductGallery(root, images, productName) {
    const gallery = root.querySelector("[data-product-gallery]")
    if (!gallery || images.length < 2) return

    const mainImg = gallery.querySelector("[data-gallery-main]")
    const counter = gallery.querySelector("[data-gallery-counter]")
    const prevBtn = gallery.querySelector("[data-gallery-prev]")
    const nextBtn = gallery.querySelector("[data-gallery-next]")
    const thumbs = [...gallery.querySelectorAll("[data-gallery-thumb]")]
    const stage = gallery.querySelector("[data-gallery-stage]")

    let index = 0

    function setSlide(nextIndex) {
        index = (nextIndex + images.length) % images.length
        const url = images[index]

        if (mainImg) {
            mainImg.src = url
            mainImg.alt = `${productName} — image ${index + 1}`
        }

        if (counter) {
            counter.textContent = `${index + 1} / ${images.length}`
        }

        thumbs.forEach((btn, i) => {
            const active = i === index
            btn.classList.toggle("is-active", active)
            btn.setAttribute("aria-selected", active ? "true" : "false")
        })
    }

    prevBtn?.addEventListener("click", () => setSlide(index - 1))
    nextBtn?.addEventListener("click", () => setSlide(index + 1))

    thumbs.forEach((btn) => {
        btn.addEventListener("click", () => {
            const thumbIndex = Number(btn.getAttribute("data-gallery-thumb"))
            if (Number.isFinite(thumbIndex)) setSlide(thumbIndex)
        })
    })

    gallery.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault()
            setSlide(index - 1)
        } else if (event.key === "ArrowRight") {
            event.preventDefault()
            setSlide(index + 1)
        }
    })

    if (stage) {
        let touchStartX = 0
        stage.addEventListener(
            "touchstart",
            (event) => {
                touchStartX = event.changedTouches[0]?.clientX ?? 0
            },
            { passive: true }
        )
        stage.addEventListener(
            "touchend",
            (event) => {
                const touchEndX = event.changedTouches[0]?.clientX ?? 0
                const delta = touchEndX - touchStartX
                if (Math.abs(delta) < 40) return
                if (delta > 0) setSlide(index - 1)
                else setSlide(index + 1)
            },
            { passive: true }
        )
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

async function fetchProductImages(client, productId) {
    const { data, error } = await client
        .from("product_images")
        .select("image_url, sort_order, label")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })

    if (error) throw error
    return data || []
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

        let galleryRows = []
        try {
            galleryRows = await fetchProductImages(client, id)
        } catch (galleryErr) {
            console.warn("[SUSI] product_images load failed, using main image only:", galleryErr)
        }

        renderProduct(product, root, galleryRows)
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
