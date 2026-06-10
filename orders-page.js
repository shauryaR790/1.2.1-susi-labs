/* My Orders list — rich order cards */

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

function getStatusTone(order) {
    const O = window.SUSI_ORDER
    const label = O.getFulfillmentLabel(order.fulfillment_status, order.payment_status)
    if (order.payment_status === "pending") return { label, tone: "pending" }
    if (order.fulfillment_status === "delivered") return { label, tone: "done" }
    if (order.fulfillment_status === "shipped" || order.fulfillment_status === "out_for_delivery") {
        return { label, tone: "shipping" }
    }
    if (order.fulfillment_status === "cancelled") return { label, tone: "cancelled" }
    if (order.fulfillment_status === "confirmed" || order.fulfillment_status === "awaiting_payment") {
        return { label, tone: "confirmed" }
    }
    return { label, tone: "active" }
}

function renderMiniTimeline(order) {
    const O = window.SUSI_ORDER
    if (order.payment_status !== "paid") {
        return `<p class="orders-card__pending">Complete payment to start production.</p>`
    }
    if (order.fulfillment_status === "cancelled") {
        return `<p class="orders-card__pending">This order was cancelled.</p>`
    }

    const { currentRank } = O.getTimelineState(order)
    const steps = [
        { key: "confirmed", label: "Confirmed" },
        { key: "in_production", label: "Printing" },
        { key: "shipped", label: "Shipped" },
        { key: "delivered", label: "Delivered" }
    ]
    const rankMap = { confirmed: 1, in_production: 2, shipped: 3, delivered: 5 }

    return `
        <ol class="orders-card__steps" aria-label="Order progress">
            ${steps
                .map((step) => {
                    const sr = rankMap[step.key]
                    let state = "upcoming"
                    if (currentRank >= 5 && step.key === "delivered") state = "done"
                    else if (currentRank > sr) state = "done"
                    else if (currentRank === sr || (step.key === "shipped" && currentRank === 4)) state = "current"

                    return `
                        <li class="orders-card__step orders-card__step--${state}">
                            <span class="orders-card__step-dot" aria-hidden="true"></span>
                            <span class="orders-card__step-label">${escapeHtml(step.label)}</span>
                        </li>
                    `
                })
                .join("")}
        </ol>
    `
}

function renderOrderItems(items, productMap) {
    if (!items.length) {
        return `<p class="orders-card__no-items">No line items recorded.</p>`
    }

    return `
        <ul class="orders-card__items">
            ${items
                .map((row) => {
                    const product = productMap[row.product_id]
                    const imageUrl = sanitizeImageUrl(product?.image_url)
                    const thumb = imageUrl
                        ? `<img class="orders-card__thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">`
                        : `<span class="orders-card__thumb orders-card__thumb--placeholder" aria-hidden="true">3D</span>`

                    return `
                        <li class="orders-card__item">
                            ${thumb}
                            <div class="orders-card__item-body">
                                <p class="orders-card__item-name">${escapeHtml(row.product_name)}</p>
                                <p class="orders-card__item-meta">Qty ${escapeHtml(row.qty)} · ${escapeHtml(row.unit_price)} each</p>
                            </div>
                            <span class="orders-card__item-line">${escapeHtml(
                                window.SUSI_ORDER.formatInrFromPaise(Number(row.unit_price_paise || 0) * Number(row.qty || 0))
                            )}</span>
                        </li>
                    `
                })
                .join("")}
        </ul>
    `
}

function renderOrderCard(order, productMap) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const { label, tone } = getStatusTone(order)
    const total = O.formatInrFromPaise(order.amount_paise)
    const date = O.formatOrderDate(order.created_at)
    const items = order.order_items || []
    const itemCount = items.reduce((sum, row) => sum + Number(row.qty || 0), 0)
    const shipTo = [order.city, order.state].filter(Boolean).join(", ") || "—"
    const trackUrl = O.getDelhiveryTrackUrl(order.tracking_number)

    return `
        <a class="orders-card" href="order.html?id=${encodeURIComponent(order.id)}">
            <div class="orders-card__head">
                <div class="orders-card__identity">
                    <span class="orders-card__ref">#${escapeHtml(ref)}</span>
                    <span class="orders-card__badge orders-card__badge--${tone}">${escapeHtml(label)}</span>
                </div>
                <time class="orders-card__date">${escapeHtml(date)}</time>
            </div>

            <div class="orders-card__summary">
                <p class="orders-card__summary-line">
                    <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
                    <span class="orders-card__summary-dot" aria-hidden="true">·</span>
                    <span>Ship to ${escapeHtml(shipTo)}</span>
                </p>
                ${order.customer_name ? `<p class="orders-card__recipient">${escapeHtml(order.customer_name)}</p>` : ""}
            </div>

            ${renderOrderItems(items, productMap)}
            ${renderMiniTimeline(order)}

            <div class="orders-card__foot">
                <div class="orders-card__foot-meta">
                    ${
                        trackUrl
                            ? `<span class="orders-card__track">AWB ${escapeHtml(order.tracking_number)}</span>`
                            : `<span class="orders-card__track orders-card__track--muted">Tracking updates when shipped</span>`
                    }
                    <span class="orders-card__total">${escapeHtml(total)}</span>
                </div>
                <span class="orders-card__cta">View details →</span>
            </div>
        </a>
    `
}

async function fetchProductMap(items) {
    const ids = [...new Set((items || []).flatMap((order) => (order.order_items || []).map((row) => row.product_id)).filter(Boolean))]
    if (!ids.length) return {}

    const client = window.SUSI_SUPABASE_CATALOG?.getCatalogClient?.()
    if (!client) return {}

    const { data } = await client.from("products").select("id, image_url, name").in("id", ids)
    const map = {}
    for (const row of data || []) map[row.id] = row
    return map
}

async function requireAuth() {
    if (!window.SUSI_AUTH) throw new Error("Accounts are not configured.")
    const session = await window.SUSI_AUTH.getSession()
    if (!session?.user) {
        window.location.href = `login.html?redirect=${encodeURIComponent("orders.html")}`
        return null
    }
    return session
}

async function loadOrders() {
    const loading = document.getElementById("orders-loading")
    const empty = document.getElementById("orders-empty")
    const list = document.getElementById("orders-list")

    const supabase = window.SUSI_AUTH.getClient()
    const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })

    if (loading) loading.hidden = true

    if (error) {
        if (empty) {
            empty.textContent = error.message || "Could not load orders."
            empty.hidden = false
        }
        return
    }

    const orders = data || []
    if (!orders.length) {
        if (empty) {
            empty.innerHTML = `You haven't placed any orders yet. <a class="orders-empty__link" href="products.html">Browse the shop →</a>`
            empty.hidden = false
        }
        return
    }

    const productMap = await fetchProductMap(orders)

    if (list) {
        list.innerHTML = orders.map((order) => renderOrderCard(order, productMap)).join("")
        list.hidden = false
        list.dataset.orderCount = String(orders.length)
    }
}

async function initOrdersPage() {
    try {
        const session = await requireAuth()
        if (!session) return

        document.getElementById("account-sign-out")?.addEventListener("click", async () => {
            await window.SUSI_AUTH.signOut()
            window.location.href = "login.html"
        })

        await window.SUSI_AUTH.linkGuestOrders()
        await loadOrders()
    } catch (err) {
        const loading = document.getElementById("orders-loading")
        const empty = document.getElementById("orders-empty")
        if (loading) loading.hidden = true
        if (empty) {
            empty.textContent = err.message || "Something went wrong."
            empty.hidden = false
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOrdersPage, { once: true })
} else {
    initOrdersPage()
}
