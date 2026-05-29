/* =========================
   CART PAGE
========================= */

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

function renderCartItem(item) {
    const name = escapeHtml(item.name)
    const price = escapeHtml(item.price)
    const imageUrl = sanitizeImageUrl(item.image_url)
    const qty = Number(item.qty) || 1
    const id = escapeAttr(item.id)

    const visual = imageUrl
        ? `<img class="cart-item__img" src="${escapeAttr(imageUrl)}" alt="${name}" loading="lazy" decoding="async">`
        : `<div class="cart-item__img cart-item__img--empty" aria-hidden="true"></div>`

    return `
        <article class="cart-item" data-cart-item-id="${id}">
            <div class="cart-item__visual">${visual}</div>
            <div class="cart-item__body">
                <h2 class="cart-item__name">${name}</h2>
                ${price ? `<p class="cart-item__price">${price}</p>` : ""}
                <div class="cart-item__actions">
                    <div class="cart-qty" aria-label="Quantity">
                        <button type="button" class="cart-qty__btn" data-cart-qty-minus aria-label="Decrease quantity">−</button>
                        <span class="cart-qty__value">${qty}</span>
                        <button type="button" class="cart-qty__btn" data-cart-qty-plus aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="cart-item__remove" data-cart-remove>remove</button>
                </div>
            </div>
        </article>
    `.trim()
}

function renderSummaryLine(item) {
    const name = escapeHtml(item.name || "Untitled")
    const price = escapeHtml(item.price || "—")
    const qty = Number(item.qty) || 1
    const label = qty > 1 ? `${name} × ${qty}` : name

    return `
        <p class="cart-summary__row cart-summary__row--item">
            <span>${label}</span>
            <span>${price}</span>
        </p>
    `.trim()
}

function renderCartPage() {
    const list = document.querySelector(".cart-list")
    const empty = document.querySelector(".cart-empty")
    const summaryPanel = document.querySelector(".cart-summary-panel")
    if (!list || !window.SUSI_CART) return

    const items = window.SUSI_CART.getItems()

    if (!items.length) {
        list.innerHTML = ""
        list.hidden = true
        if (empty) empty.hidden = false
        if (summaryPanel) summaryPanel.hidden = true
        const itemsEl = document.querySelector("[data-cart-summary-items]")
        if (itemsEl) itemsEl.innerHTML = ""
        return
    }

    if (empty) empty.hidden = true
    if (summaryPanel) summaryPanel.hidden = false
    list.hidden = false
    list.innerHTML = items.map(renderCartItem).join("")

    const itemsEl = document.querySelector("[data-cart-summary-items]")
    const countEl = document.querySelector("[data-cart-summary-count]")
    const subtotalEl = document.querySelector("[data-cart-summary-subtotal]")
    const totalItems = window.SUSI_CART.getCount()

    if (itemsEl) {
        itemsEl.innerHTML = items.map(renderSummaryLine).join("")
    }

    if (countEl) {
        countEl.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"}`
    }

    if (subtotalEl) {
        const prices = items.map((item) => {
            const digits = String(item.price || "").replace(/[^\d.]/g, "")
            const value = Number(digits)
            return Number.isFinite(value) ? value * (Number(item.qty) || 1) : 0
        })
        const sum = prices.reduce((a, b) => a + b, 0)
        subtotalEl.textContent = sum > 0 ? `₹${Math.round(sum)}` : "—"
    }
}

function initCartPageControls() {
    const list = document.querySelector(".cart-list")
    if (!list || !window.SUSI_CART) return

    list.addEventListener("click", (e) => {
        const row = e.target.closest("[data-cart-item-id]")
        if (!row) return
        const id = row.getAttribute("data-cart-item-id")
        if (!id) return

        if (e.target.closest("[data-cart-remove]")) {
            window.SUSI_CART.removeItem(id)
            renderCartPage()
            return
        }

        const items = window.SUSI_CART.getItems()
        const item = items.find((row) => row.id === id)
        if (!item) return

        if (e.target.closest("[data-cart-qty-plus]")) {
            window.SUSI_CART.setQty(id, (Number(item.qty) || 1) + 1)
            renderCartPage()
            return
        }

        if (e.target.closest("[data-cart-qty-minus]")) {
            window.SUSI_CART.setQty(id, (Number(item.qty) || 1) - 1)
            renderCartPage()
        }
    })

    window.addEventListener("susi:cart-updated", renderCartPage)
}

function runCartIntro() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let shouldIntro = false
    try {
        shouldIntro = sessionStorage.getItem("susi:cartIntro") === "1"
        if (shouldIntro) sessionStorage.removeItem("susi:cartIntro")
    } catch {
        shouldIntro = false
    }

    if (!shouldIntro || prefersReduced) {
        document.documentElement.classList.remove("cart-intro")
        return
    }

    const startIntro = () => {
        if (!window.gsap) return

        document.documentElement.classList.remove("cart-intro")

        const tl = window.gsap.timeline({ defaults: { ease: "power3.out" } })
        const ticker = document.querySelector(".products-ticker")
        const home = document.querySelector(".products-home")
        const title = document.querySelector(".cart-title")
        const empty = document.querySelector(".cart-empty")
        const summaryPanel = document.querySelector(".cart-summary-panel")

        if (ticker) tl.from(ticker, { y: -14, opacity: 0, duration: 0.5 }, 0.08)
        if (home) tl.from(home, { y: 18, opacity: 0, duration: 0.65 }, 0.14)
        if (title) tl.from(title.children, { y: 18, opacity: 0, duration: 0.65, stagger: 0.09 }, 0.16)

        const items = document.querySelectorAll(".cart-item")
        if (items.length) {
            tl.from(items, { y: 26, opacity: 0, duration: 0.75, stagger: 0.08 }, 0.28)
        } else if (empty && !empty.hidden) {
            tl.from(empty, { y: 20, opacity: 0, duration: 0.65 }, 0.28)
        }

        if (summaryPanel && !summaryPanel.hidden) {
            tl.from(summaryPanel, { x: 18, opacity: 0, duration: 0.65 }, 0.22)
        }
    }

    let tries = 0
    const waitForGsap = () => {
        if (window.gsap) {
            startIntro()
            return
        }
        tries++
        if (tries > 60) {
            document.documentElement.classList.remove("cart-intro")
            return
        }
        requestAnimationFrame(waitForGsap)
    }

    waitForGsap()
}

function initCartPage() {
    renderCartPage()
    initCartPageControls()
    window.SUSI_CART?.refresh()
    runCartIntro()
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCartPage, { once: true })
} else {
    initCartPage()
}
