const { formatInrFromPaise } = require("./parse-price")
const { getDefaultVpa } = require("./upi")

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
    const upiVpa = getDefaultVpa()

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

async function sendCustomBuildEmail({ requestId, payload, attachments = [] }) {
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || "dcchampavat@gmail.com"
    const fromEmail = process.env.RESEND_FROM || "SUSI LABS <onboarding@resend.dev>"

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping custom build email.")
        return { skipped: true }
    }

    const dims = payload.dimensions || {}
    const dimLine =
        dims.length || dims.width || dims.height
            ? `${dims.length || "—"} × ${dims.width || "—"} × ${dims.height || "—"} mm`
            : "—"

    const fileLines =
        (payload.fileNames || []).length > 0
            ? payload.fileNames.map((n) => `• ${n}`).join("\n")
            : "— (no files attached)"

    const body = `New custom build request — SUSI LABS

Request ID: ${requestId}

PROJECT
Name: ${payload.projectName}
Category: ${payload.category}
Description: ${payload.description || "—"}
Dimensions (L×W×H mm): ${dimLine}
Reference link: ${payload.referenceLink || "—"}
Application / use: ${payload.application || "—"}

SPECS
Material: ${payload.material}
Color: ${payload.color}
Quantity: ${payload.quantity}
Urgency: ${payload.urgency}
Infill: ${payload.infill || "—"}
Surface finish: ${payload.finish || "—"}
Budget range: ${payload.budgetRange || "—"}

CONTACT
Name: ${payload.contactName || "—"}
Email: ${payload.email}
Phone: ${payload.phone}
Preferred contact: ${payload.contactMethod || "—"}

FILES
${fileLines}
`

    return sendRawEmail({
        apiKey,
        fromEmail,
        adminEmail,
        subject: `[SUSI LABS] Custom build ${requestId.slice(0, 8)} — ${payload.projectName}`,
        body,
        attachments
    })
}

async function sendRawEmail({ apiKey, fromEmail, adminEmail, subject, body, attachments = [] }) {
    const emailPayload = {
        from: fromEmail,
        to: [adminEmail],
        subject,
        text: body
    }

    if (attachments.length) {
        emailPayload.attachments = attachments.map((a) => ({
            filename: a.filename,
            content: a.content
        }))
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
    })

    if (!res.ok) {
        const err = await res.text()
        console.warn("[SUSI] Admin email failed:", err)
        return { skipped: false, ok: false }
    }

    return { ok: true }
}

module.exports = { sendOrderEmail, sendUpiPendingEmail, sendCustomBuildEmail }
