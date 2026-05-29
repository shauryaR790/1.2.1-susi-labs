/* =========================
   CHECKOUT PAGE
========================= */

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function parseDisplayPrice(priceStr) {
    const digits = String(priceStr ?? "").replace(/[^\d.]/g, "")
    const rupees = Math.round(parseFloat(digits) || 0)
    return rupees > 0 ? `₹${rupees}` : "—"
}

function sumCartPaise(items) {
    return items.reduce((sum, item) => {
        const digits = String(item.price || "").replace(/[^\d.]/g, "")
        const rupees = Math.round(parseFloat(digits) || 0)
        return sum + rupees * 100 * (Number(item.qty) || 1)
    }, 0)
}

function renderSummary(items) {
    const itemsEl = document.querySelector("[data-checkout-summary-items]")
    const countEl = document.querySelector("[data-checkout-summary-count]")
    const subtotalEl = document.querySelector("[data-checkout-summary-subtotal]")

    if (itemsEl) {
        itemsEl.innerHTML = items
            .map((item) => {
                const label =
                    (Number(item.qty) || 1) > 1
                        ? `${escapeHtml(item.name)} × ${item.qty}`
                        : escapeHtml(item.name)
                return `<p class="cart-summary__row cart-summary__row--item"><span>${label}</span><span>${escapeHtml(item.price || "—")}</span></p>`
            })
            .join("")
    }

    const totalItems = items.reduce((n, row) => n + (Number(row.qty) || 1), 0)
    if (countEl) countEl.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"}`
    if (subtotalEl) subtotalEl.textContent = `₹${Math.round(sumCartPaise(items) / 100)}`
}

function getFormCustomer(form) {
    const fd = new FormData(form)
    return {
        name: String(fd.get("name") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        address_line1: String(fd.get("address_line1") || "").trim(),
        address_line2: String(fd.get("address_line2") || "").trim(),
        city: String(fd.get("city") || "").trim(),
        state: String(fd.get("state") || "").trim(),
        pin_code: String(fd.get("pin_code") || "").trim(),
        notes: String(fd.get("notes") || "").trim()
    }
}

function showError(msg) {
    const el = document.getElementById("checkout-error")
    if (!el) return
    if (msg) {
        el.textContent = msg
        el.hidden = false
    } else {
        el.textContent = ""
        el.hidden = true
    }
}

function setPayLoading(loading) {
    const btn = document.getElementById("checkout-pay-btn")
    if (!btn) return
    btn.disabled = loading
    btn.textContent = loading ? "processing…" : "pay with UPI / card"
}

async function createOrder(customer, items) {
    const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customer,
            items: items.map((row) => ({ id: row.id, qty: row.qty }))
        })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || "Could not start checkout")
    }
    return data
}

async function verifyPayment(payload) {
    const res = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || "Payment verification failed")
    }
    return data
}

function openRazorpayCheckout(orderPayload) {
    return new Promise((resolve, reject) => {
        if (!window.Razorpay) {
            reject(new Error("Payment gateway failed to load"))
            return
        }

        const options = {
            key: orderPayload.keyId,
            amount: orderPayload.amount,
            currency: orderPayload.currency,
            name: "SUSI LABS",
            description: "Custom 3D print order",
            order_id: orderPayload.razorpayOrderId,
            prefill: orderPayload.customer,
            theme: { color: "#3A002B" },
            handler(response) {
                resolve(response)
            },
            modal: {
                ondismiss() {
                    reject(new Error("Payment cancelled"))
                }
            }
        }

        const rzp = new window.Razorpay(options)
        rzp.on("payment.failed", (response) => {
            reject(new Error(response.error?.description || "Payment failed"))
        })
        rzp.open()
    })
}

function initCheckoutPage() {
    const form = document.getElementById("checkout-form")
    const empty = document.querySelector(".checkout-empty")
    const summaryPanel = document.querySelector(".checkout-summary-panel")

    if (!form || !window.SUSI_CART) return

    const items = window.SUSI_CART.getItems()

    if (!items.length) {
        form.hidden = true
        if (summaryPanel) summaryPanel.hidden = true
        if (empty) empty.hidden = false
        return
    }

    if (empty) empty.hidden = true
    form.hidden = false
    if (summaryPanel) summaryPanel.hidden = false
    renderSummary(items)

    form.addEventListener("submit", async (e) => {
        e.preventDefault()
        showError("")

        if (!form.checkValidity()) {
            form.reportValidity()
            return
        }

        const customer = getFormCustomer(form)
        const cartItems = window.SUSI_CART.getItems()
        if (!cartItems.length) {
            window.location.href = "cart.html"
            return
        }

        setPayLoading(true)

        try {
            const orderPayload = await createOrder(customer, cartItems)
            const payment = await openRazorpayCheckout(orderPayload)

            await verifyPayment({
                orderId: orderPayload.orderId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature
            })

            window.SUSI_CART.clearCart()
            window.location.href = `checkout-success.html?order=${encodeURIComponent(orderPayload.orderId)}`
        } catch (err) {
            console.error(err)
            const msg = String(err.message || err)
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                showError(
                    "Checkout API unavailable. Deploy on Vercel with payment env vars, or run vercel dev locally."
                )
            } else if (msg !== "Payment cancelled") {
                showError(msg)
            }
        } finally {
            setPayLoading(false)
        }
    })
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckoutPage, { once: true })
} else {
    initCheckoutPage()
}
