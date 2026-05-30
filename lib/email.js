const { formatInrFromPaise } = require("./parse-price")

async function sendOrderEmail({ order, items }) {
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || "dcchampavat@gmail.com"
    const fromEmail = process.env.RESEND_FROM || "SUSI LABS <onboarding@resend.dev>"

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping admin email.")
        return { skipped: true }
    }

    const lines = formatItemLines(items)

    const body = `New paid order — SUSI LABS

Order ID: ${order.id}
Payment: ${order.payment_status}
Method: ${order.payment_method || "razorpay"}
Razorpay payment: ${order.razorpay_payment_id || "—"}
Total: ${formatInrFromPaise(order.amount_paise)}

Customer
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email}

Shipping
${order.address_line1}
${order.address_line2 || ""}
${order.city}, ${order.state} — ${order.pin_code}

Notes: ${order.notes || "—"}

Items
${lines}
`

    return sendRawEmail({
        apiKey,
        fromEmail,
        adminEmail,
        subject: `[SUSI LABS] Paid order ${order.id.slice(0, 8)} — ${formatInrFromPaise(order.amount_paise)}`,
        body
    })
}

function formatItemLines(items) {
    return (items || [])
        .map(
            (row) =>
                `• ${row.product_name} × ${row.qty} — ${row.unit_price} (${formatInrFromPaise(row.unit_price_paise * row.qty)})`
        )
        .join("\n")
}

async function sendUpiPendingEmail({ order, items }) {
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || "dcchampavat@gmail.com"
    const fromEmail = process.env.RESEND_FROM || "SUSI LABS <onboarding@resend.dev>"
    const upiVpa = process.env.UPI_VPA || "8849670831@pthdfc"

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping UPI pending email.")
        return { skipped: true }
    }

    const lines = formatItemLines(items)

    const body = `UPI payment pending verification — SUSI LABS

Order ID: ${order.id}
Expected total: ${formatInrFromPaise(order.amount_paise)}
UPI ID: ${upiVpa}

Customer says they have paid. Please verify in your UPI app / bank, then mark the order paid in Supabase.

Customer
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email}

Shipping
${order.address_line1}
${order.address_line2 || ""}
${order.city}, ${order.state} — ${order.pin_code}

Notes: ${order.notes || "—"}

Items
${lines}
`

    return sendRawEmail({
        apiKey,
        fromEmail,
        adminEmail,
        subject: `[SUSI LABS] UPI pending ${order.id.slice(0, 8)} — ${formatInrFromPaise(order.amount_paise)}`,
        body
    })
}

async function sendRawEmail({ apiKey, fromEmail, adminEmail, subject, body }) {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [adminEmail],
            subject,
            text: body
        })
    })

    if (!res.ok) {
        const err = await res.text()
        console.warn("[SUSI] Admin email failed:", err)
        return { skipped: false, ok: false }
    }

    return { ok: true }
}

module.exports = { sendOrderEmail, sendUpiPendingEmail }
