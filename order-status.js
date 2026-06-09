/* Order status labels and timeline helpers */

;(function () {
    const FULFILLMENT_LABELS = {
        awaiting_payment: "Awaiting payment",
        confirmed: "Order confirmed",
        in_production: "In production",
        shipped: "Shipped",
        out_for_delivery: "Out for delivery",
        delivered: "Delivered",
        cancelled: "Cancelled"
    }

    const TIMELINE_STEPS = [
        { key: "confirmed", label: "Order confirmed", detail: "Payment received — we're queuing your print." },
        { key: "in_production", label: "In production", detail: "Your order is being printed and prepped." },
        { key: "shipped", label: "Shipped", detail: "Handed to Delhivery — tracking available below." },
        { key: "delivered", label: "Delivered", detail: "Delivered to your address." }
    ]

    const STATUS_RANK = {
        awaiting_payment: 0,
        confirmed: 1,
        in_production: 2,
        shipped: 3,
        out_for_delivery: 4,
        delivered: 5,
        cancelled: -1
    }

    function formatInrFromPaise(paise) {
        const n = Number(paise)
        if (!Number.isFinite(n)) return "—"
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
            n / 100
        )
    }

    function shortOrderRef(orderId) {
        return String(orderId || "")
            .replace(/-/g, "")
            .slice(0, 8)
            .toUpperCase()
    }

    function formatOrderDate(value) {
        if (!value) return "—"
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return "—"
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    }

    function getFulfillmentLabel(status, paymentStatus) {
        if (paymentStatus === "pending") return "Awaiting payment"
        if (paymentStatus === "paid" && status === "awaiting_payment") return "Order confirmed"
        return FULFILLMENT_LABELS[status] || status || "Processing"
    }

    function getDelhiveryTrackUrl(trackingNumber) {
        const awb = String(trackingNumber || "").trim()
        if (!awb) return null
        return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`
    }

    function getTimelineState(order) {
        if (order?.payment_status !== "paid") {
            return { steps: [], currentRank: 0, cancelled: false }
        }

        if (order.fulfillment_status === "cancelled") {
            return { steps: TIMELINE_STEPS, currentRank: -1, cancelled: true }
        }

        let status = order.fulfillment_status || "confirmed"
        if (status === "awaiting_payment") status = "confirmed"
        if (status === "out_for_delivery") status = "shipped"

        const currentRank = STATUS_RANK[status] ?? 1
        return { steps: TIMELINE_STEPS, currentRank, cancelled: false }
    }

    window.SUSI_ORDER = {
        FULFILLMENT_LABELS,
        TIMELINE_STEPS,
        formatInrFromPaise,
        shortOrderRef,
        formatOrderDate,
        getFulfillmentLabel,
        getDelhiveryTrackUrl,
        getTimelineState
    }
})()
