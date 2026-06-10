/* Single order detail — full receipt-style layout */

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

function formatPaymentMethod(method) {
    const m = String(method || "").toLowerCase()
    if (m === "razorpay") return "Razorpay"
    if (m === "upi") return "UPI"
    return method || "Online"
}

function renderTimeline(order) {
    const O = window.SUSI_ORDER

    if (order.payment_status !== "paid") {
        return `
            <div class="order-detail__timeline-pending">
                <p class="order-detail__pending">Payment pending — this order will update once payment is confirmed.</p>
                <ol class="order-detail__steps order-detail__steps--muted" aria-label="Order progress preview">
                    ${O.TIMELINE_STEPS.map(
                        (step) => `
                        <li class="order-detail__step order-detail__step--upcoming">
                            <span class="order-detail__step-dot" aria-hidden="true"></span>
                            <span class="order-detail__step-label">${escapeHtml(step.label)}</span>
                        </li>`
                    ).join("")}
                </ol>
            </div>
        `
    }

    if (order.fulfillment_status === "cancelled") {
        return `<p class="order-detail__pending">This order was cancelled.</p>`
    }

    let status = order.fulfillment_status || "confirmed"
    if (status === "awaiting_payment") status = "confirmed"

    const rankMap = {
        confirmed: 1,
        in_production: 2,
        shipped: 3,
        out_for_delivery: 4,
        delivered: 5
    }
    const currentRank = rankMap[status] ?? 1
    const stepRank = { confirmed: 1, in_production: 2, shipped: 3, delivered: 5 }

    return `
        <ol class="order-detail__steps" aria-label="Order progress">
            ${O.TIMELINE_STEPS.map((step) => {
                const sr = stepRank[step.key]
                let state = "upcoming"
                if (currentRank >= 5 && step.key === "delivered") state = "done"
                else if (currentRank > sr) state = "done"
                else if (currentRank === sr || (step.key === "shipped" && currentRank === 4)) state = "current"

                return `
                    <li class="order-detail__step order-detail__step--${state}">
                        <span class="order-detail__step-dot" aria-hidden="true"></span>
                        <div class="order-detail__step-body">
                            <p class="order-detail__step-label">${escapeHtml(step.label)}</p>
                            <p class="order-detail__step-detail">${escapeHtml(step.detail)}</p>
                        </div>
                    </li>
                `
            }).join("")}
        </ol>
    `
}

function renderItemRows(items, productMap) {
    if (!items.length) {
        return `<p class="order-detail__empty">No line items recorded for this order.</p>`
    }

    return `
        <ul class="order-detail__products">
            ${items
                .map((row) => {
                    const product = productMap[row.product_id]
                    const imageUrl = sanitizeImageUrl(product?.image_url)
                    const linePaise = Number(row.unit_price_paise || 0) * Number(row.qty || 0)
                    const thumb = imageUrl
                        ? `<img class="order-detail__thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">`
                        : `<span class="order-detail__thumb order-detail__thumb--placeholder" aria-hidden="true">3D</span>`

                    return `
                        <li class="order-detail__product">
                            ${thumb}
                            <div class="order-detail__product-body">
                                <p class="order-detail__product-name">${escapeHtml(row.product_name)}</p>
                                <p class="order-detail__product-meta">Qty ${escapeHtml(row.qty)} · ${escapeHtml(row.unit_price)} each</p>
                                ${row.product_id ? `<p class="order-detail__product-id">SKU ${escapeHtml(String(row.product_id).slice(0, 8))}</p>` : ""}
                            </div>
                            <span class="order-detail__product-line">${escapeHtml(window.SUSI_ORDER.formatInrFromPaise(linePaise))}</span>
                        </li>
                    `
                })
                .join("")}
        </ul>
    `
}

function renderSummaryRows(items, order) {
    const O = window.SUSI_ORDER
    const itemCount = items.reduce((sum, row) => sum + Number(row.qty || 0), 0)
    const subtotalPaise = items.reduce(
        (sum, row) => sum + Number(row.unit_price_paise || 0) * Number(row.qty || 0),
        0
    )

    return `
        <div class="order-detail__summary-rows">
            <div class="order-detail__summary-row">
                <span>Items (${itemCount})</span>
                <span>${escapeHtml(O.formatInrFromPaise(subtotalPaise))}</span>
            </div>
            <div class="order-detail__summary-row">
                <span>Shipping</span>
                <span>Included</span>
            </div>
            <div class="order-detail__summary-row order-detail__summary-row--total">
                <span>Order total</span>
                <span>${escapeHtml(O.formatInrFromPaise(order.amount_paise))}</span>
            </div>
        </div>
    `
}

function renderOrderDetail(order, productMap) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const items = order.order_items || []
    const { label, tone } = getStatusTone(order)
    const trackUrl = O.getDelhiveryTrackUrl(order.tracking_number)
    const itemCount = items.reduce((sum, row) => sum + Number(row.qty || 0), 0)
    const estDelivery = order.estimated_delivery
        ? O.formatOrderDate(order.estimated_delivery)
        : order.shipped_at
          ? "Usually 2–5 business days after dispatch"
          : "Updates when your order ships"
    const paymentLabel = order.payment_status === "paid" ? "Paid" : "Pending"
    const paymentTone = order.payment_status === "paid" ? "paid" : "pending"

    return `
        <header class="order-detail__hero">
            <div class="order-detail__hero-top">
                <div class="order-detail__identity">
                    <p class="order-detail__tag">Order #${escapeHtml(ref)}</p>
                    <span class="order-detail__badge order-detail__badge--${tone}">${escapeHtml(label)}</span>
                </div>
                <time class="order-detail__date">Placed ${escapeHtml(O.formatOrderDate(order.created_at))}</time>
            </div>
            <h1 class="order-detail__title">${escapeHtml(label)}</h1>
            <p class="order-detail__stats">
                <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
                <span class="order-detail__stats-dot" aria-hidden="true">·</span>
                <span>${escapeHtml(O.formatInrFromPaise(order.amount_paise))}</span>
                <span class="order-detail__stats-dot" aria-hidden="true">·</span>
                <span>${escapeHtml(order.city || "—")}, ${escapeHtml(order.state || "—")}</span>
            </p>
        </header>

        <div class="order-detail__grid">
            <div class="order-detail__col">
                <section class="order-detail__panel">
                    <h2 class="order-detail__panel-title">Order progress</h2>
                    ${renderTimeline(order)}
                </section>

                <section class="order-detail__panel">
                    <h2 class="order-detail__panel-title">Delivery</h2>
                    <div class="order-detail__info-grid">
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">Estimate</span>
                            <span class="order-detail__info-value">${escapeHtml(estDelivery)}</span>
                        </div>
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">Courier</span>
                            <span class="order-detail__info-value">${escapeHtml(order.courier || "Delhivery")}</span>
                        </div>
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">AWB / Tracking</span>
                            <span class="order-detail__info-value">${
                                order.tracking_number
                                    ? escapeHtml(order.tracking_number)
                                    : "Not assigned yet"
                            }</span>
                        </div>
                    </div>
                    ${
                        trackUrl
                            ? `<a class="order-detail__track" href="${escapeHtml(trackUrl)}" target="_blank" rel="noopener noreferrer">Track on Delhivery →</a>`
                            : order.fulfillment_status === "shipped" || order.fulfillment_status === "out_for_delivery"
                              ? `<p class="order-detail__note">Tracking link appears once Delhivery AWB is added.</p>`
                              : `<p class="order-detail__note order-detail__note--muted">Tracking activates when your parcel ships.</p>`
                    }
                </section>

                <section class="order-detail__panel">
                    <h2 class="order-detail__panel-title">Payment</h2>
                    <div class="order-detail__info-grid">
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">Status</span>
                            <span class="order-detail__pay-badge order-detail__pay-badge--${paymentTone}">${escapeHtml(paymentLabel)}</span>
                        </div>
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">Method</span>
                            <span class="order-detail__info-value">${escapeHtml(formatPaymentMethod(order.payment_method))}</span>
                        </div>
                        <div class="order-detail__info">
                            <span class="order-detail__info-label">Email</span>
                            <span class="order-detail__info-value">${escapeHtml(order.customer_email)}</span>
                        </div>
                    </div>
                </section>
            </div>

            <div class="order-detail__col">
                <section class="order-detail__panel order-detail__panel--items">
                    <h2 class="order-detail__panel-title">What you ordered</h2>
                    ${renderItemRows(items, productMap)}
                    ${renderSummaryRows(items, order)}
                </section>

                <section class="order-detail__panel">
                    <h2 class="order-detail__panel-title">Shipping to</h2>
                    <div class="order-detail__address-card">
                        <p class="order-detail__address-name">${escapeHtml(order.customer_name)}</p>
                        <p class="order-detail__address-lines">
                            ${escapeHtml(order.address_line1)}<br>
                            ${order.address_line2 ? `${escapeHtml(order.address_line2)}<br>` : ""}
                            ${escapeHtml(order.city)}, ${escapeHtml(order.state)} — ${escapeHtml(order.pin_code)}
                        </p>
                        <p class="order-detail__address-phone">${escapeHtml(order.customer_phone)}</p>
                    </div>
                </section>

                ${
                    order.notes
                        ? `
                <section class="order-detail__panel">
                    <h2 class="order-detail__panel-title">Order notes</h2>
                    <p class="order-detail__notes">${escapeHtml(order.notes)}</p>
                </section>`
                        : ""
                }

                <section class="order-detail__panel order-detail__panel--help">
                    <h2 class="order-detail__panel-title">Need help?</h2>
                    <p class="order-detail__help">Questions about this order? Email us at <a href="mailto:susilabs.global@gmail.com">susilabs.global@gmail.com</a> with your order #${escapeHtml(ref)}.</p>
                </section>
            </div>
        </div>
    `
}

async function fetchProductMap(items) {
    const ids = [...new Set((items || []).map((row) => row.product_id).filter(Boolean))]
    if (!ids.length) return {}

    const client = window.SUSI_SUPABASE_CATALOG?.getCatalogClient?.()
    if (!client) return {}

    const { data } = await client.from("products").select("id, image_url, name").in("id", ids)
    const map = {}
    for (const row of data || []) map[row.id] = row
    return map
}

async function initOrderPage() {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get("id")
    const loading = document.getElementById("order-loading")
    const errorEl = document.getElementById("order-error")
    const detail = document.getElementById("order-detail")

    if (!orderId) {
        if (loading) loading.hidden = true
        if (errorEl) {
            errorEl.textContent = "Order not found."
            errorEl.hidden = false
        }
        return
    }

    try {
        if (!window.SUSI_AUTH) throw new Error("Accounts are not configured.")
        const session = await window.SUSI_AUTH.getSession()
        if (!session?.user) {
            window.location.href = `login.html?redirect=${encodeURIComponent(`order.html?id=${orderId}`)}`
            return
        }

        document.getElementById("account-sign-out")?.addEventListener("click", async () => {
            await window.SUSI_AUTH.signOut()
            window.location.href = "login.html"
        })

        await window.SUSI_AUTH.linkGuestOrders()

        const supabase = window.SUSI_AUTH.getClient()
        const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", orderId)
            .maybeSingle()

        if (loading) loading.hidden = true

        if (error || !data) {
            if (errorEl) {
                errorEl.textContent = error?.message || "Order not found or access denied."
                errorEl.hidden = false
            }
            return
        }

        const productMap = await fetchProductMap(data.order_items || [])

        if (detail) {
            detail.innerHTML = renderOrderDetail(data, productMap)
            detail.hidden = false
            document.title = `Order #${window.SUSI_ORDER.shortOrderRef(data.id)} | SUSI LABS`
        }
    } catch (err) {
        if (loading) loading.hidden = true
        if (errorEl) {
            errorEl.textContent = err.message || "Something went wrong."
            errorEl.hidden = false
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOrderPage, { once: true })
} else {
    initOrderPage()
}
