/* Account dashboard — cart + orders */

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
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

function renderCartSection() {
    const body = document.getElementById("account-cart-body")
    if (!body || !window.SUSI_CART) return

    const items = window.SUSI_CART.getItems()
    if (!items.length) {
        body.innerHTML = `
            <p class="orders-empty">Your cart is empty.</p>
            <a class="cart-empty__btn account-dash-btn" href="products.html">browse products</a>
        `
        return
    }

    const rows = items
        .map(
            (item) => `
            <div class="account-dash-row">
                <span>${escapeHtml(item.name)} × ${escapeHtml(item.qty)}</span>
                <span>${escapeHtml(item.price)}</span>
            </div>`
        )
        .join("")

    body.innerHTML = `
        <div class="account-dash-list">${rows}</div>
        <div class="account-dash-actions">
            <a class="cart-empty__btn account-dash-btn" href="cart.html">go to cart</a>
            <a class="checkout-pay-btn account-dash-btn account-dash-btn--checkout" href="checkout.html">checkout</a>
        </div>
    `
}

function renderOrderRow(order) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const label = O.getFulfillmentLabel(order.fulfillment_status, order.payment_status)
    const total = O.formatInrFromPaise(order.amount_paise)
    const date = O.formatOrderDate(order.created_at)

    return `
        <a class="account-dash-order" href="order.html?id=${encodeURIComponent(order.id)}">
            <span class="account-dash-order__ref">#${escapeHtml(ref)}</span>
            <span class="account-dash-order__status">${escapeHtml(label)}</span>
            <span class="account-dash-order__meta">${escapeHtml(date)} · ${escapeHtml(total)}</span>
        </a>
    `
}

async function renderOrdersSection(session) {
    const body = document.getElementById("account-orders-body")
    if (!body) return

    await window.SUSI_AUTH.linkGuestOrders()

    const supabase = window.SUSI_AUTH.getClient()
    const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, amount_paise, payment_status, fulfillment_status")
        .order("created_at", { ascending: false })
        .limit(8)

    if (error) {
        body.innerHTML = `<p class="orders-empty">${escapeHtml(error.message)}</p>`
        return
    }

    const orders = data || []
    if (!orders.length) {
        body.innerHTML = `
            <p class="orders-empty">No orders yet.</p>
            <a class="cart-empty__btn account-dash-btn" href="products.html">start shopping</a>
        `
        return
    }

    body.innerHTML = `<div class="account-dash-list">${orders.map(renderOrderRow).join("")}</div>`
}

async function initAccountPage() {
    const session = await requireAuth()
    if (!session) return

    const emailEl = document.getElementById("account-email")
    if (emailEl && session.user.email) {
        emailEl.textContent = session.user.email
    }

    document.getElementById("account-sign-out")?.addEventListener("click", async () => {
        await window.SUSI_AUTH.signOut()
        window.location.href = "index.html"
    })

    renderCartSection()
    await renderOrdersSection(session)

    window.addEventListener("susi:cart-updated", renderCartSection)
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccountPage, { once: true })
} else {
    initAccountPage()
}
