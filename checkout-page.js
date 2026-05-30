/* =========================
   CHECKOUT PAGE
========================= */

const DEFAULT_UPI_VPA = "6356425245@ptaxis"

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function sumCartPaise(items) {
    return items.reduce((sum, item) => {
        const digits = String(item.price || "").replace(/[^\d.]/g, "")
        const rupees = Math.round(parseFloat(digits) || 0)
        return sum + rupees * 100 * (Number(item.qty) || 1)
    }, 0)
}

function formatInrFromPaise(paise) {
    return `₹${Math.round(paise / 100)}`
}

function orderRefShort(orderId) {
    return String(orderId || "")
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase()
}

async function renderUpiQr(orderPayload) {
    const img = document.getElementById("upi-qr-img")
    const loading = document.getElementById("upi-qr-loading")

    if (!img) {
        throw new Error("QR code UI missing")
    }

    if (loading) loading.hidden = false
    img.hidden = true
    img.removeAttribute("src")

    const qs = new URLSearchParams({
        amountPaise: String(orderPayload.amount),
        orderId: orderPayload.orderId || ""
    })

    await new Promise((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("QR code failed to load"))
        img.src = `/api/upi-qr?${qs.toString()}`
    })

    if (loading) loading.hidden = true
    img.hidden = false
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
    if (subtotalEl) subtotalEl.textContent = formatInrFromPaise(sumCartPaise(items))
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
    const upiBtn = document.getElementById("checkout-upi-btn")
    const cardBtn = document.getElementById("checkout-card-btn")
    const confirmBtn = document.getElementById("upi-confirm-btn")

    ;[upiBtn, cardBtn, confirmBtn].forEach((btn) => {
        if (!btn) return
        btn.disabled = loading
    })

    if (upiBtn) upiBtn.textContent = loading ? "processing…" : "pay with UPI"
    if (cardBtn) cardBtn.textContent = loading ? "processing…" : "pay with card"
    if (confirmBtn) confirmBtn.textContent = loading ? "finishing up…" : "I've sent the payment — continue"
}

function validateForm(form) {
    if (!form.checkValidity()) {
        form.reportValidity()
        return false
    }
    return true
}

async function createOrder(customer, items, paymentMethod) {
    const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customer,
            paymentMethod,
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

async function confirmUpiPayment(orderId, { timeoutMs = 10000 } = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const res = await fetch("/api/confirm-upi-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
            signal: controller.signal
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(data.error || "Could not confirm UPI payment")
        }
        return data
    } finally {
        clearTimeout(timeout)
    }
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

function setUpiModalOpen(open) {
    const modal = document.getElementById("upi-pay-modal")
    if (!modal) return
    modal.hidden = !open
    modal.setAttribute("aria-hidden", open ? "false" : "true")
    document.body.classList.toggle("checkout-upi-open", open)
}

function showUpiModal(orderPayload) {
    const vpa = orderPayload.upiId || DEFAULT_UPI_VPA
    const uri = orderPayload.upiUri || ""
    const ref = orderRefShort(orderPayload.orderId)

    const amountEl = document.getElementById("upi-modal-amount")
    const vpaEl = document.getElementById("upi-modal-vpa")
    const refEl = document.getElementById("upi-modal-ref")
    const openAppEl = document.getElementById("upi-open-app")

    if (amountEl) amountEl.textContent = formatInrFromPaise(orderPayload.amount)
    if (vpaEl) vpaEl.textContent = vpa
    if (refEl) refEl.textContent = ref
    if (openAppEl && uri) {
        openAppEl.href = uri
        openAppEl.hidden = false
    } else if (openAppEl) {
        openAppEl.hidden = true
    }

    return new Promise((resolve, reject) => {
        const modal = document.getElementById("upi-pay-modal")
        const confirmBtn = document.getElementById("upi-confirm-btn")
        const copyBtn = document.getElementById("upi-copy-btn")

        if (!modal || !confirmBtn) {
            reject(new Error("UPI payment UI missing"))
            return
        }

        let settled = false

        function cleanup() {
            modal.querySelectorAll("[data-upi-dismiss]").forEach((el) => {
                el.removeEventListener("click", onDismiss)
            })
            confirmBtn.removeEventListener("click", onConfirm)
            if (copyBtn) copyBtn.removeEventListener("click", onCopy)
            document.removeEventListener("keydown", onKeydown)
        }

        function finish(action) {
            if (settled) return
            settled = true
            cleanup()
            setUpiModalOpen(false)
            if (action === "confirm") resolve(orderPayload)
            else reject(new Error("Payment cancelled"))
        }

        function onDismiss() {
            finish("dismiss")
        }

        async function onConfirm() {
            const confirmBtn = document.getElementById("upi-confirm-btn")
            if (confirmBtn) {
                confirmBtn.disabled = true
                confirmBtn.textContent = "finishing up…"
            }

            try {
                await Promise.race([
                    confirmUpiPayment(orderPayload.orderId, { timeoutMs: 8000 }),
                    new Promise((resolve) => setTimeout(resolve, 8000))
                ])
            } catch (err) {
                console.warn("[SUSI] UPI confirm:", err)
            }

            finish("confirm")
        }

        async function onCopy() {
            try {
                await navigator.clipboard.writeText(vpa)
                copyBtn.textContent = "copied"
                setTimeout(() => {
                    copyBtn.textContent = "copy"
                }, 1500)
            } catch {
                showError("Could not copy UPI ID")
            }
        }

        function onKeydown(e) {
            if (e.key === "Escape") onDismiss()
        }

        modal.querySelectorAll("[data-upi-dismiss]").forEach((el) => {
            el.addEventListener("click", onDismiss)
        })
        confirmBtn.addEventListener("click", onConfirm)
        if (copyBtn) copyBtn.addEventListener("click", onCopy)
        document.addEventListener("keydown", onKeydown)

        setUpiModalOpen(true)
        renderUpiQr(orderPayload).catch((err) => {
            cleanup()
            setUpiModalOpen(false)
            reject(err)
        })
    })
}

function redirectAfterSuccess(orderId, { pendingUpi = false } = {}) {
    window.SUSI_CART.clearCart()
    try {
        sessionStorage.setItem("susi:lastOrderId", orderId)
    } catch {}

    const params = new URLSearchParams({ order: orderId })
    if (pendingUpi) params.set("pending", "upi")
    window.location.href = `checkout-success.html?${params.toString()}`
}

function handleCheckoutError(err) {
    console.error(err)
    const msg = String(err.message || err)
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        showError(
            "Checkout API unavailable. Deploy on Vercel with payment env vars, or run vercel dev locally."
        )
    } else if (msg !== "Payment cancelled") {
        showError(msg)
    }
}

function initCheckoutPage() {
    const form = document.getElementById("checkout-form")
    const empty = document.querySelector(".checkout-empty")
    const summaryPanel = document.querySelector(".checkout-summary-panel")
    const upiBtn = document.getElementById("checkout-upi-btn")
    const cardBtn = document.getElementById("checkout-card-btn")

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

    async function runUpiCheckout() {
        showError("")
        if (!validateForm(form)) return

        const customer = getFormCustomer(form)
        const cartItems = window.SUSI_CART.getItems()
        if (!cartItems.length) {
            window.location.href = "cart.html"
            return
        }

        setPayLoading(true)

        try {
            const orderPayload = await createOrder(customer, cartItems, "upi")
            await showUpiModal(orderPayload)
            redirectAfterSuccess(orderPayload.orderId, { pendingUpi: true })
        } catch (err) {
            handleCheckoutError(err)
        } finally {
            setPayLoading(false)
        }
    }

    async function runCardCheckout() {
        showError("")
        if (!validateForm(form)) return

        const customer = getFormCustomer(form)
        const cartItems = window.SUSI_CART.getItems()
        if (!cartItems.length) {
            window.location.href = "cart.html"
            return
        }

        setPayLoading(true)

        try {
            const orderPayload = await createOrder(customer, cartItems, "razorpay")
            const payment = await openRazorpayCheckout(orderPayload)

            await verifyPayment({
                orderId: orderPayload.orderId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature
            })

            redirectAfterSuccess(orderPayload.orderId)
        } catch (err) {
            handleCheckoutError(err)
        } finally {
            setPayLoading(false)
        }
    }

    if (upiBtn) upiBtn.addEventListener("click", runUpiCheckout)
    if (cardBtn) cardBtn.addEventListener("click", runCardCheckout)
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckoutPage, { once: true })
} else {
    initCheckoutPage()
}
