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

function showPaymentPending(message) {
    const overlay = document.getElementById("order-transition")
    const tag = overlay?.querySelector(".order-transition__tag")
    if (tag) tag.textContent = message || "confirming payment…"
    document.body.classList.add("is-order-transitioning")
    overlay?.classList.add("is-active")
    overlay?.setAttribute("aria-hidden", "false")
}

function hidePaymentPending() {
    const overlay = document.getElementById("order-transition")
    overlay?.classList.remove("is-active")
    overlay?.setAttribute("aria-hidden", "true")
    document.body.classList.remove("is-order-transitioning")
}

let paymentConfig = null

const WORKING_CHECKOUT_ORIGIN = "https://1-2-1-susi-labs.vercel.app"

function isWrongCheckoutHost() {
    const host = window.location.hostname.replace(/^www\./, "")
    return host === "susilabs.in"
}

function showDomainMisconfigWarning(message) {
    const el = document.getElementById("checkout-domain-warning")
    if (!el) return
    el.hidden = false
    el.innerHTML = message
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

function renderPaymentModeBanner(config) {
    const banner = document.getElementById("checkout-mode-banner")
    if (!banner || !config) return

    if (config.mode === "test") {
        const t = config.testInstructions || {}
        banner.className = "checkout-mode-banner checkout-mode-banner--test"
        banner.innerHTML = `<strong>TEST MODE — no real money (${escapeHtml(config.keyPrefix || "rzp_test")})</strong>
<ul>
<li><strong>Card:</strong> ${escapeHtml(t.card || "4111 1111 1111 1111")}, expiry ${escapeHtml(t.expiry || "12/30")}, CVV ${escapeHtml(t.cvv || "123")}, OTP ${escapeHtml(t.otp || "123456")} (any 4–10 digits works)</li>
<li><strong>UPI:</strong> open the UPI tab in Razorpay and <strong>type</strong> <code>${escapeHtml(t.upi || "success@razorpay")}</code> — do <strong>not</strong> scan the QR with PhonePe / GPay (that QR is test-only and will show invalid ID)</li>
</ul>`
        banner.hidden = false
        return
    }

    banner.className = "checkout-mode-banner checkout-mode-banner--live"
    banner.innerHTML = `<strong>LIVE MODE — real money (${escapeHtml(config.keyPrefix || "rzp_live")})</strong>
After UPI QR payment, return to this tab or tap <strong>I've paid with UPI — continue</strong> at the bottom. The Razorpay window may stay open — that's normal.`
    banner.hidden = false

    const staticHelp = document.getElementById("checkout-static-help")
    if (staticHelp) staticHelp.hidden = false
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
        const MAX_POLL_MS = 600000
        const orderRef = orderPayload.orderId.slice(0, 8).toUpperCase()

        let settled = false
        let pollTimer = null
        let rzp = null
        let syncErrors = 0
        let syncActive = false
        const pollStart = Date.now()
        let manualBtn = null

        function cleanupListeners() {
            window.removeEventListener("focus", onReturnToPage)
            document.removeEventListener("visibilitychange", onReturnToPage)
            manualBtn?.remove()
            manualBtn = null
        }

        function stopPolling() {
            syncActive = false
            if (pollTimer) {
                clearInterval(pollTimer)
                pollTimer = null
            }
        }

        function finishSuccess(response, synced = false) {
            if (settled) return
            settled = true
            stopPolling()
            cleanupListeners()
            hidePaymentPending()
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
            stopPolling()
            cleanupListeners()
            hidePaymentPending()
            reject(err)
        }

        async function checkServerPayment(showOverlay = true) {
            if (settled) return

            const elapsed = Date.now() - pollStart
            if (elapsed > MAX_POLL_MS) {
                finishError(
                    new Error(
                        `Payment not confirmed in time. Order ref: ${orderRef}. If UPI was debited, do not pay again — contact us with this ref.`
                    )
                )
                return
            }

            if (showOverlay) {
                showPaymentPending(`confirming payment… ${orderRef}`)
            }

            try {
                const data = await syncPayment(orderPayload.orderId)
                syncErrors = 0

                if (data.paid) {
                    finishSuccess(
                        {
                            razorpay_order_id: data.razorpay_order_id || orderPayload.razorpayOrderId,
                            razorpay_payment_id: data.razorpay_payment_id
                        },
                        true
                    )
                }
            } catch (err) {
                syncErrors += 1
                console.warn("[SUSI] Payment sync:", err)
                if (syncErrors >= 3) {
                    showError(
                        `Checking payment failed (${err.message || "server error"}). Order ref: ${orderRef}. Tap "I've paid" below or keep this tab open.`
                    )
                }
            }
        }

        function startUpiSyncPolling() {
            if (syncActive || settled) return
            syncActive = true
            checkServerPayment(true)
            pollTimer = window.setInterval(() => checkServerPayment(false), POLL_MS)
        }

        function onReturnToPage() {
            if (document.visibilityState && document.visibilityState !== "visible") return
            startUpiSyncPolling()
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
                if (!response?.razorpay_payment_id || !response?.razorpay_signature) {
                    return
                }
                finishSuccess(response, false)
            },
            modal: {
                confirm_close: true,
                ondismiss() {
                    if (settled) return
                    startUpiSyncPolling()
                }
            }
        }

        rzp = new window.Razorpay(options)

        rzp.on("payment.success", (response) => {
            if (!response?.razorpay_payment_id || !response?.razorpay_signature) {
                return
            }
            finishSuccess(response, false)
        })

        rzp.on("payment.failed", (response) => {
            finishError(new Error(response.error?.description || "Payment failed"))
        })

        manualBtn = document.createElement("button")
        manualBtn.type = "button"
        manualBtn.className = "checkout-manual-confirm"
        manualBtn.textContent = "I've paid with UPI — continue"
        manualBtn.hidden = true
        manualBtn.addEventListener("click", () => {
            startUpiSyncPolling()
        })
        document.body.appendChild(manualBtn)

        window.addEventListener("focus", onReturnToPage)
        document.addEventListener("visibilitychange", onReturnToPage)

        rzp.open()
        window.setTimeout(() => {
            if (!settled && manualBtn) manualBtn.hidden = false
        }, 4000)
    })
}

function redirectAfterSuccess(orderId) {
    window.SUSI_CART.clearCart()
    try {
        sessionStorage.setItem("susi:lastOrderId", orderId)
    } catch {}

    const params = new URLSearchParams({ order: orderId })
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

    loadPaymentConfig()
        .then(renderPaymentModeBanner)
        .catch((err) => {
            showError(err.message || "Payment gateway not configured")
        })

    if (isWrongCheckoutHost()) {
        showDomainMisconfigWarning(
            `susilabs.in is not connected to the checkout server yet — pay here instead: <a href="${WORKING_CHECKOUT_ORIGIN}/checkout.html">${WORKING_CHECKOUT_ORIGIN}/checkout.html</a>`
        )
        const payBtn = document.getElementById("checkout-pay-btn")
        if (payBtn) payBtn.disabled = true
    }

    async function runCheckout() {
        showError("")
        if (isWrongCheckoutHost()) {
            showError(`Checkout does not work on susilabs.in yet. Open ${WORKING_CHECKOUT_ORIGIN}/checkout.html`)
            return
        }
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
            renderPaymentModeBanner(config)

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

            showPaymentPending("payment confirmed — finishing…")
            await confirmPaymentOnServer(orderPayload, payment)
            hidePaymentPending()
            redirectAfterSuccess(orderPayload.orderId)
            return
        } catch (err) {
            handleCheckoutError(err)
        } finally {
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
