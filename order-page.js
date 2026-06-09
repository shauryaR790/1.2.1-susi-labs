/* Single order detail + tracking timeline */

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function renderTimeline(order) {
    const O = window.SUSI_ORDER

    if (order.payment_status !== "paid") {
        return `<p class="order-detail__pending">Payment pending — this order will update once payment is confirmed.</p>`
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
        <ol class="order-timeline">
            ${O.TIMELINE_STEPS.map((step) => {
                const sr = stepRank[step.key]
                let state = "upcoming"
                if (currentRank >= 5 && step.key === "delivered") state = "done"
                else if (currentRank > sr) state = "done"
                else if (currentRank === sr || (step.key === "shipped" && currentRank === 4)) state = "current"

                return `
                    <li class="order-timeline__step order-timeline__step--${state}">
                        <span class="order-timeline__dot"></span>
                        <div>
                            <p class="order-timeline__label">${escapeHtml(step.label)}</p>
                            <p class="order-timeline__detail">${escapeHtml(step.detail)}</p>
                        </div>
                    </li>
                `
            }).join("")}
        </ol>
    `
}

function renderOrderDetail(order) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const items = order.order_items || []
    const trackUrl = O.getDelhiveryTrackUrl(order.tracking_number)
    const estDelivery = order.estimated_delivery
        ? O.formatOrderDate(order.estimated_delivery)
        : order.shipped_at
          ? "Usually 2–5 business days after dispatch"
          : "Updates when your order ships"

    const itemsHtml = items
        .map(
            (row) => `
            <li class="order-detail__item">
                <span>${escapeHtml(row.product_name)} × ${escapeHtml(row.qty)}</span>
                <span>${escapeHtml(row.unit_price)}</span>
            </li>`
        )
        .join("")

    return `
        <header class="order-detail__head">
            <p class="order-detail__tag">Order #${escapeHtml(ref)}</p>
            <h1 class="order-detail__title">${escapeHtml(O.getFulfillmentLabel(order.fulfillment_status, order.payment_status))}</h1>
            <p class="order-detail__date">Placed ${escapeHtml(O.formatOrderDate(order.created_at))}</p>
        </header>

        ${renderTimeline(order)}

        ${
            trackUrl
                ? `<a class="order-detail__track" href="${escapeHtml(trackUrl)}" target="_blank" rel="noopener noreferrer">Track on Delhivery (${escapeHtml(order.tracking_number)})</a>`
                : order.fulfillment_status === "shipped" || order.fulfillment_status === "out_for_delivery"
                  ? `<p class="order-detail__note">Tracking number will appear here once Delhivery AWB is added.</p>`
                  : ""
        }

        <section class="order-detail__section">
            <h2>Delivery estimate</h2>
            <p>${escapeHtml(estDelivery)}</p>
        </section>

        <section class="order-detail__section">
            <h2>Items</h2>
            <ul class="order-detail__items">${itemsHtml}</ul>
            <p class="order-detail__total">Total: <strong>${escapeHtml(O.formatInrFromPaise(order.amount_paise))}</strong></p>
        </section>

        <section class="order-detail__section">
            <h2>Shipping to</h2>
            <p class="order-detail__address">
                ${escapeHtml(order.customer_name)}<br>
                ${escapeHtml(order.address_line1)}<br>
                ${order.address_line2 ? `${escapeHtml(order.address_line2)}<br>` : ""}
                ${escapeHtml(order.city)}, ${escapeHtml(order.state)} — ${escapeHtml(order.pin_code)}<br>
                ${escapeHtml(order.customer_phone)}
            </p>
        </section>
    `
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

        if (detail) {
            detail.innerHTML = renderOrderDetail(data)
            detail.hidden = false
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
