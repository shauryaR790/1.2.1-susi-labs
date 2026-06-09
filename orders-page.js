/* My Orders list */

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
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

function renderOrderCard(order) {
    const O = window.SUSI_ORDER
    const ref = O.shortOrderRef(order.id)
    const label = O.getFulfillmentLabel(order.fulfillment_status, order.payment_status)
    const total = O.formatInrFromPaise(order.amount_paise)
    const date = O.formatOrderDate(order.created_at)
    const itemCount = (order.order_items || []).reduce((sum, row) => sum + Number(row.qty || 0), 0)

    return `
        <a class="orders-card" href="order.html?id=${encodeURIComponent(order.id)}">
            <div class="orders-card__top">
                <span class="orders-card__ref">#${escapeHtml(ref)}</span>
                <span class="orders-card__date">${escapeHtml(date)}</span>
            </div>
            <p class="orders-card__status">${escapeHtml(label)}</p>
            <p class="orders-card__meta">${itemCount} item${itemCount === 1 ? "" : "s"} · ${escapeHtml(total)}</p>
        </a>
    `
}

async function loadOrders(session) {
    const loading = document.getElementById("orders-loading")
    const empty = document.getElementById("orders-empty")
    const list = document.getElementById("orders-list")
    const emailEl = document.getElementById("account-email")

    if (emailEl && session.user.email) {
        emailEl.textContent = session.user.email
        emailEl.hidden = false
    }

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
        if (empty) empty.hidden = false
        return
    }

    if (list) {
        list.innerHTML = orders.map(renderOrderCard).join("")
        list.hidden = false
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
        await loadOrders(session)
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
