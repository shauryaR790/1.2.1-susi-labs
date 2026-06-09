const PENDING_ORDER_KEY = "susi:pendingOrderId"

function clearPendingOrderId() {
    try {
        sessionStorage.removeItem(PENDING_ORDER_KEY)
    } catch {}
}

function showConfirmed() {
    const tag = document.getElementById("success-tag")
    const title = document.getElementById("success-title")
    const meta = document.getElementById("success-meta")
    if (tag) tag.textContent = "payment received"
    if (title) title.textContent = "You're in the queue."
    if (meta) {
        meta.textContent =
            "Thanks for your order. We'll start your build and reach out if we need anything else."
    }
}

function showPending() {
    const tag = document.getElementById("success-tag")
    const title = document.getElementById("success-title")
    const meta = document.getElementById("success-meta")
    if (tag) tag.textContent = "confirming payment"
    if (title) title.textContent = "Almost there."
    if (meta) {
        meta.textContent =
            "We are confirming your payment. This page will update automatically — do not pay again."
    }
}

async function syncPayment(orderId) {
    const res = await fetch("/api/sync-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || "Could not check payment status")
    }
    return data
}

async function initCheckoutSuccessPage() {
    try {
        const params = new URLSearchParams(window.location.search)
        let orderId = params.get("order") || ""

        if (!orderId) {
            orderId = sessionStorage.getItem("susi:lastOrderId") || ""
        }

        if (!orderId) {
            try {
                orderId = sessionStorage.getItem(PENDING_ORDER_KEY) || ""
            } catch {}
        }

        const el = document.getElementById("order-ref")
        const viewOrder = document.getElementById("success-view-order")
        if (el && orderId) {
            const short = orderId.replace(/-/g, "").slice(0, 8).toUpperCase()
            el.textContent = short || orderId.slice(0, 8)
        }
        if (viewOrder && orderId) {
            viewOrder.href = `order.html?id=${encodeURIComponent(orderId)}`
            viewOrder.hidden = false
        }

        if (!orderId) return

        const forcePending = params.get("pending") === "upi"
        if (forcePending) showPending()

        for (let i = 0; i < 150; i++) {
            const data = await syncPayment(orderId)
            if (data.paid) {
                clearPendingOrderId()
                try {
                    sessionStorage.setItem("susi:lastOrderId", orderId)
                } catch {}
                showConfirmed()
                return
            }

            if (!forcePending && i === 0) {
                showPending()
            }

            await new Promise((r) => setTimeout(r, 2000))
        }
    } catch (err) {
        console.warn("[SUSI] checkout success:", err)
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckoutSuccessPage, { once: true })
} else {
    initCheckoutSuccessPage()
}
