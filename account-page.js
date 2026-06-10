/* Account dashboard — rich cart + orders */

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
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

function parseInrPrice(str) {
    const n = Number(String(str).replace(/[^\d.]/g, ""))
    return Number.isFinite(n) ? n : 0
}

function formatInr(amount) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

function getStatusTone(order) {
    const O = window.SUSI_ORDER
    const label = O.getFulfillmentLabel(order.fulfillment_status, order.payment_status)
    if (order.payment_status === "pending") return { label, tone: "pending" }
    if (order.fulfillment_status === "delivered") return { label, tone: "done" }
    if (order.fulfillment_status === "shipped" || order.fulfillment_status === "out_for_delivery") {
        return { label, tone: "shipping" }
    }
    if (order.fulfillment_status === "cancelled") return { label, tone: "cancelled" }
    return { label, tone: "active" }
}

function renderCartItem(item) {
    const imageUrl = sanitizeImageUrl(item.image_url)
    const thumb = imageUrl
        ? `<img class="account-dash-thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">`
        : `<span class="account-dash-thumb account-dash-thumb--placeholder" aria-hidden="true">3D</span>`
    const lineTotal = parseInrPrice(item.price) * Number(item.qty || 1)

    return `
        <div class="account-dash-item">
            ${thumb}
            <div class="account-dash-item__body">
                <p class="account-dash-item__name">${escapeHtml(item.name)}</p>
                <p class="account-dash-item__meta">Qty ${escapeHtml(item.qty)} · ${escapeHtml(item.price)} each</p>
            </div>
            <span class="account-dash-item__line">${escapeHtml(formatInr(lineTotal))}</span>
        </div>
    `
}

function renderCartSection() {
    const body = document.getElementById("account-cart-body")
    if (!body || !window.SUSI_CART) return { itemCount: 0, subtotal: 0 }

    const items = window.SUSI_CART.getItems()
    if (!items.length) {
        body.innerHTML = `
            <div class="account-dash-empty">
                <p class="account-dash-empty__title">Your cart is empty</p>
                <p class="account-dash-empty__meta">Browse the catalog and add prints you want manufactured.</p>
                <a class="account-dash-btn account-dash-btn--full" href="products.html">Browse products →</a>
            </div>
        `
        return { itemCount: 0, subtotal: 0 }
    }

    const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    const subtotal = items.reduce((sum, item) => sum + parseInrPrice(item.price) * Number(item.qty || 1), 0)
    const rows = items.map(renderCartItem).join("")

    body.innerHTML = `
        <div class="account-dash-list account-dash-list--items">${rows}</div>
        <div class="account-dash-summary">
            <div class="account-dash-summary__row">
                <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
                <span>${escapeHtml(formatInr(subtotal))}</span>
            </div>
        </div>
        <div class="account-dash-actions">
            <a class="account-dash-btn" href="cart.html">Go to cart</a>
            <a class="account-dash-btn account-dash-btn--checkout" href="checkout.html">Checkout →</a>
        </div>
    `

    return { itemCount, subtotal }
}

function renderOrderRow(order) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const { label, tone } = getStatusTone(order)
    const total = O.formatInrFromPaise(order.amount_paise)
    const date = O.formatOrderDate(order.created_at)
    const items = order.order_items || []
    const itemCount = items.reduce((sum, row) => sum + Number(row.qty || 0), 0)
    const preview = items
        .slice(0, 2)
        .map((row) => escapeHtml(row.product_name))
        .join(", ")
    const more = items.length > 2 ? ` +${items.length - 2} more` : ""

    return `
        <a class="account-dash-order" href="order.html?id=${encodeURIComponent(order.id)}">
            <div class="account-dash-order__top">
                <span class="account-dash-order__ref">#${escapeHtml(ref)}</span>
                <span class="account-dash-order__badge account-dash-order__badge--${tone}">${escapeHtml(label)}</span>
            </div>
            <p class="account-dash-order__items">${preview ? `${preview}${more}` : `${itemCount} item${itemCount === 1 ? "" : "s"}`}</p>
            <div class="account-dash-order__foot">
                <span class="account-dash-order__meta">${escapeHtml(date)}</span>
                <span class="account-dash-order__total">${escapeHtml(total)}</span>
            </div>
            <span class="account-dash-order__cta">View details →</span>
        </a>
    `
}

async function renderOrdersSection() {
    const body = document.getElementById("account-orders-body")
    if (!body) return { orderCount: 0 }

    await window.SUSI_AUTH.linkGuestOrders()

    const supabase = window.SUSI_AUTH.getClient()
    const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, amount_paise, payment_status, fulfillment_status, order_items(product_name, qty)")
        .order("created_at", { ascending: false })
        .limit(6)

    if (error) {
        body.innerHTML = `<p class="orders-empty">${escapeHtml(error.message)}</p>`
        return { orderCount: 0 }
    }

    const orders = data || []
    if (!orders.length) {
        body.innerHTML = `
            <div class="account-dash-empty">
                <p class="account-dash-empty__title">No orders yet</p>
                <p class="account-dash-empty__meta">Your print queue will show up here after checkout.</p>
                <a class="account-dash-btn account-dash-btn--full" href="products.html">Start shopping →</a>
            </div>
        `
        return { orderCount: 0 }
    }

    body.innerHTML = `<div class="account-dash-list account-dash-list--orders">${orders.map(renderOrderRow).join("")}</div>`
    return { orderCount: orders.length }
}

function renderStats(cartStats, orderStats, session) {
    const el = document.getElementById("account-dash-stats")
    if (!el) return

    const memberSince = session?.user?.created_at
        ? new Date(session.user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : "—"

    el.innerHTML = `
        <div class="account-stat">
            <span class="account-stat__value">${cartStats.itemCount}</span>
            <span class="account-stat__label">In cart</span>
        </div>
        <div class="account-stat">
            <span class="account-stat__value">${orderStats.orderCount}</span>
            <span class="account-stat__label">Recent orders</span>
        </div>
        <div class="account-stat">
            <span class="account-stat__value">${escapeHtml(formatInr(cartStats.subtotal))}</span>
            <span class="account-stat__label">Cart value</span>
        </div>
        <div class="account-stat">
            <span class="account-stat__value account-stat__value--text">${escapeHtml(memberSince)}</span>
            <span class="account-stat__label">Member since</span>
        </div>
    `
    el.hidden = false
}

async function requireAuth() {
    if (!window.SUSI_AUTH) {
        window.location.href = "index.html?auth=1"
        return null
    }
    const session = await window.SUSI_AUTH.getSession()
    if (!session?.user) {
        window.location.href = "index.html?auth=1"
        return null
    }
    return session
}

async function initAccountPage() {
    const session = await requireAuth()
    if (!session) return

    document.getElementById("account-sign-out")?.addEventListener("click", async () => {
        await window.SUSI_AUTH.signOut()
        window.location.href = "index.html"
    })

    const cartStats = renderCartSection()
    const orderStats = await renderOrdersSection(session)
    renderStats(cartStats, orderStats, session)

    window.addEventListener("susi:cart-updated", () => {
        const updated = renderCartSection()
        renderStats(updated, orderStats, session)
    })
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccountPage, { once: true })
} else {
    initAccountPage()
}
