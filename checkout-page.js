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
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    } else {
        el.textContent = ""
        el.hidden = true
    }
}

function hidePaymentPending() {
    const overlay = document.getElementById("order-transition")
    overlay?.classList.remove("is-active")
    overlay?.setAttribute("aria-hidden", "true")
    document.body.classList.remove("is-order-transitioning")
}

let paymentConfig = null

const PENDING_ORDER_KEY = "susi:pendingOrderId"

function savePendingOrderId(orderId) {
    try {
        if (orderId) sessionStorage.setItem(PENDING_ORDER_KEY, orderId)
    } catch {}
}

function clearPendingOrderId() {
    try {
        sessionStorage.removeItem(PENDING_ORDER_KEY)
    } catch {}
}

function getPendingOrderId() {
    try {
        return sessionStorage.getItem(PENDING_ORDER_KEY) || ""
    } catch {
        return ""
    }
}

async function loadPaymentConfig() {
    if (paymentConfig) return paymentConfig

    const res = await fetch("/api/payment-config", { cache: "no-store" })
    const text = await res.text()

    if (/^\s*</.test(text)) {
        throw new Error(
            `Checkout APIs are not on this domain. Payments cannot work on susilabs.in until the domain is linked to Vercel project 1-2-1-susi-labs. Use ${WORKING_CHECKOUT_ORIGIN}/checkout.html for now.`
        )
    }

    let data = {}
    try {
        data = JSON.parse(text)
    } catch {
        throw new Error("Payment server returned an invalid response.")
    }

    if (!res.ok || !data.ok) {
        throw new Error(data.error || "Payment gateway not configured on server")
    }

    paymentConfig = data
    return data
}

function setPayLoading(loading, label) {
    const payBtn = document.getElementById("checkout-pay-btn")
    if (!payBtn) return
    payBtn.disabled = loading
    if (!loading) {
        payBtn.textContent = "pay with UPI / card"
        return
    }
    payBtn.textContent = label || "processing…"
}

function validateForm(form) {
    if (!form.checkValidity()) {
        form.reportValidity()
        return false
    }
    return true
}

async function createOrder(customer, items) {
    const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customer,
            paymentMethod: "razorpay",
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

async function confirmPaymentOnServer(orderPayload, payment) {
    if (payment.synced) return

    const hasSignature =
        payment.razorpay_signature &&
        payment.razorpay_payment_id &&
        payment.razorpay_order_id

    if (hasSignature) {
        try {
            await verifyPayment({
                orderId: orderPayload.orderId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature
            })
        } catch (err) {
            const sync = await syncPayment(orderPayload.orderId)
            if (!sync.paid) throw err
        }
        return
    }

    const sync = await syncPayment(orderPayload.orderId)
    if (!sync.paid) {
        throw new Error(
            `Payment not confirmed yet. Order ref: ${orderPayload.orderId.slice(0, 8).toUpperCase()}. If UPI was debited, do not pay again — contact us with this ref.`
        )
    }
}

function openRazorpayCheckout(orderPayload, onPaidDetected) {
    return new Promise((resolve, reject) => {
        if (!window.Razorpay) {
            reject(new Error("Payment gateway failed to load"))
            return
        }

        const POLL_MS = 2000
        const MAX_POLL_MS = 300000
        const orderRef = orderPayload.orderId.slice(0, 8).toUpperCase()

        let settled = false
        let pollTimer = null
        let rzp = null
        let modalOpen = true
        const pollStart = Date.now()

        savePendingOrderId(orderPayload.orderId)

        function cleanupListeners() {
            window.removeEventListener("focus", onReturnToPage)
            document.removeEventListener("visibilitychange", onReturnToPage)
        }

        function stopPolling() {
            if (pollTimer) {
                clearInterval(pollTimer)
                pollTimer = null
            }
        }

        function finishSuccess(response, synced = false) {
            if (settled) return
            settled = true
            modalOpen = false
            stopPolling()
            cleanupListeners()
            hidePaymentPending()
            clearPendingOrderId()
            try {
                rzp?.close()
            } catch {}

            if (synced && typeof onPaidDetected === "function") {
                onPaidDetected(orderPayload.orderId)
            }

            resolve({ ...response, synced })
        }

        function finishError(err) {
            if (settled) return
            settled = true
            modalOpen = false
            stopPolling()
            cleanupListeners()
            hidePaymentPending()
            reject(err)
        }

        function redirectToPendingSuccess() {
            if (settled) return
            settled = true
            modalOpen = false
            stopPolling()
            cleanupListeners()
            hidePaymentPending()
            try {
                sessionStorage.setItem("susi:lastOrderId", orderPayload.orderId)
            } catch {}
            const params = new URLSearchParams({
                order: orderPayload.orderId,
                pending: "upi"
            })
            window.location.href = `checkout-success.html?${params.toString()}`
        }

        function handleRazorpaySuccess(response) {
            if (response?.razorpay_payment_id && response?.razorpay_signature) {
                finishSuccess(response, false)
                return
            }
            if (response?.razorpay_payment_id) {
                void checkServerPaymentOnce()
            }
        }

        async function checkServerPaymentOnce() {
            if (settled) return false

            if (Date.now() - pollStart > MAX_POLL_MS) {
                redirectToPendingSuccess()
                return false
            }

            try {
                const data = await syncPayment(orderPayload.orderId)
                if (data.paid) {
                    finishSuccess(
                        {
                            razorpay_order_id: data.razorpay_order_id || orderPayload.razorpayOrderId,
                            razorpay_payment_id: data.razorpay_payment_id
                        },
                        true
                    )
                    return true
                }
            } catch (err) {
                console.warn("[SUSI] Payment sync:", err)
            }

            if (!modalOpen) {
                setPayLoading(true, `confirming payment… ${orderRef}`)
            }

            return false
        }

        function startSyncPolling() {
            if (pollTimer || settled) return
            void checkServerPaymentOnce()
            pollTimer = window.setInterval(() => {
                void checkServerPaymentOnce()
            }, POLL_MS)
        }

        function onReturnToPage() {
            if (document.visibilityState && document.visibilityState !== "visible") return
            startSyncPolling()
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
            retry: { enabled: false },
            handler(response) {
                handleRazorpaySuccess(response)
            },
            modal: {
                confirm_close: true,
                ondismiss() {
                    if (settled) return
                    modalOpen = false
                    setPayLoading(true, `confirming payment… ${orderRef}`)
                    startSyncPolling()
                }
            }
        }

        rzp = new window.Razorpay(options)

        rzp.on("payment.success", handleRazorpaySuccess)

        rzp.on("payment.failed", (response) => {
            clearPendingOrderId()
            finishError(new Error(response.error?.description || "Payment failed"))
        })

        window.addEventListener("focus", onReturnToPage)
        document.addEventListener("visibilitychange", onReturnToPage)

        rzp.open()
        startSyncPolling()
    })
}

function redirectAfterSuccess(orderId) {
    clearPendingOrderId()
    window.SUSI_CART.clearCart()
    try {
        sessionStorage.setItem("susi:lastOrderId", orderId)
    } catch {}

    const params = new URLSearchParams({ order: orderId })
    window.location.href = `checkout-success.html?${params.toString()}`
}

async function resumePendingOrderIfPaid() {
    const orderId = getPendingOrderId()
    if (!orderId) return

    try {
        const data = await syncPayment(orderId)
        if (data.paid) {
            redirectAfterSuccess(orderId)
        }
    } catch (err) {
        console.warn("[SUSI] Resume pending order:", err)
    }
}

function handleCheckoutError(err) {
    console.error(err)
    const msg = String(err.message || err)
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        showError(
            "Checkout API unavailable. Deploy on Vercel with payment env vars, or run vercel dev locally."
        )
    } else if (msg !== "Payment cancelled") {
        if (/razorpay keys rejected|authentication failed/i.test(msg)) {
            showError(
                "Payment is not configured yet. Check Vercel env vars RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (same key pair from Razorpay → Test mode), then Redeploy."
            )
        } else {
            showError(msg)
        }
    }
}

function initCheckoutPage() {
    const form = document.getElementById("checkout-form")
    const empty = document.querySelector(".checkout-empty")
    const summaryPanel = document.querySelector(".checkout-summary-panel")
    const payBtn = document.getElementById("checkout-pay-btn")

    if (!form || !window.SUSI_CART) {
        runCheckoutIntro()
        return
    }

    const items = window.SUSI_CART.getItems()

    if (!items.length) {
        form.hidden = true
        if (summaryPanel) summaryPanel.hidden = true
        if (empty) empty.hidden = false
        runCheckoutIntro()
        return
    }

    if (empty) empty.hidden = true
    form.hidden = false
    if (summaryPanel) summaryPanel.hidden = false
    renderSummary(items)

    loadPaymentConfig().catch((err) => {
        showError(err.message || "Payment gateway not configured")
    })

    void resumePendingOrderIfPaid()

    async function runCheckout() {
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
            const config = await loadPaymentConfig()

            const orderPayload = await createOrder(customer, cartItems)

            if (orderPayload.testMode && config.mode !== "test") {
                throw new Error("Server payment mode mismatch. Redeploy Vercel after updating Razorpay keys.")
            }

            let redirected = false
            const payment = await openRazorpayCheckout(orderPayload, (orderId) => {
                if (redirected) return
                redirected = true
                redirectAfterSuccess(orderId)
            })

            if (redirected) return

            setPayLoading(true, "finishing…")
            await confirmPaymentOnServer(orderPayload, payment)
            redirectAfterSuccess(orderPayload.orderId)
            return
        } catch (err) {
            handleCheckoutError(err)
        } finally {
            hidePaymentPending()
            setPayLoading(false)
        }
    }

    if (payBtn) payBtn.addEventListener("click", runCheckout)

    runCheckoutIntro()
}

function runCheckoutIntro() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let shouldIntro = false
    try {
        shouldIntro = sessionStorage.getItem("susi:checkoutIntro") === "1"
        if (shouldIntro) sessionStorage.removeItem("susi:checkoutIntro")
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

        const isMobileHeader = window.matchMedia("(max-width: 992px)").matches
        const tl = window.gsap.timeline({
            defaults: { ease: "power3.out" },
            onComplete: () => {
                window.gsap.set(
                    [
                        document.querySelector(".products-home"),
                        document.querySelector(".cart-title"),
                        document.querySelector(".cart-title h1"),
                        document.querySelector(".cart-sidebar-links"),
                        document.getElementById("checkout-form"),
                        document.querySelector(".checkout-summary-panel")
                    ].filter(Boolean),
                    { clearProps: "transform,opacity" }
                )
            }
        })
        const ticker = document.querySelector(".products-ticker")
        const home = document.querySelector(".products-home")
        const title = document.querySelector(".cart-title")
        const titleHeading = document.querySelector(".cart-title h1")
        const nav = document.querySelector(".cart-sidebar-links")
        const form = document.getElementById("checkout-form")
        const summaryPanel = document.querySelector(".checkout-summary-panel")
        const empty = document.querySelector(".checkout-empty")

        if (ticker) tl.from(ticker, { y: -14, opacity: 0, duration: 0.5 }, 0.08)

        if (isMobileHeader) {
            const headerFade = { opacity: 0, duration: 0.45 }
            if (home) tl.from(home, headerFade, 0.12)
            if (titleHeading) tl.from(titleHeading, headerFade, 0.14)
            if (nav) tl.from(nav, headerFade, 0.14)
            if (form && !form.hidden) tl.from(form, { opacity: 0, duration: 0.5 }, 0.2)
            if (summaryPanel && !summaryPanel.hidden) tl.from(summaryPanel, { opacity: 0, duration: 0.5 }, 0.22)
            if (empty && !empty.hidden) tl.from(empty, { opacity: 0, duration: 0.5 }, 0.2)
        } else {
            if (home) tl.from(home, { y: 18, opacity: 0, duration: 0.65 }, 0.14)
            if (title) tl.from(title.children, { y: 18, opacity: 0, duration: 0.65, stagger: 0.09 }, 0.16)
            if (nav) tl.from(nav, { x: 18, opacity: 0, duration: 0.65 }, 0.18)
            if (form && !form.hidden) tl.from(form, { y: 26, opacity: 0, duration: 0.75 }, 0.28)
            if (summaryPanel && !summaryPanel.hidden) tl.from(summaryPanel, { x: 18, opacity: 0, duration: 0.65 }, 0.22)
            if (empty && !empty.hidden) tl.from(empty, { y: 20, opacity: 0, duration: 0.65 }, 0.28)
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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckoutPage, { once: true })
} else {
    initCheckoutPage()
}
