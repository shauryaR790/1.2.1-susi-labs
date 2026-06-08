const { formatInrFromPaise } = require("./parse-price")
const { getDefaultVpa } = require("./upi")

function cleanEnv(value) {
    return String(value ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
}

function getEmailConfig() {
    const apiKey = cleanEnv(process.env.RESEND_API_KEY)
    const adminEmail = cleanEnv(process.env.ADMIN_EMAIL) || "dcchampavat@gmail.com"
    const fromEmail = cleanEnv(process.env.RESEND_FROM) || "SUSI LABS <onboarding@resend.dev>"
    const adminEmails = adminEmail
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)

    return { apiKey, fromEmail, adminEmails }
}

async function sendOrderEmail({ order, items }) {
    const { apiKey, fromEmail, adminEmails } = getEmailConfig()

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping admin email.")
        return { skipped: true, ok: false, error: "RESEND_API_KEY not set" }
    }

    if (!adminEmails.length) {
        console.warn("[SUSI] ADMIN_EMAIL not set — skipping admin email.")
        return { skipped: true, ok: false, error: "ADMIN_EMAIL not set" }
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
        adminEmails,
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
    const { apiKey, fromEmail, adminEmails } = getEmailConfig()
    const upiVpa = getDefaultVpa()

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping UPI pending email.")
        return { skipped: true, ok: false, error: "RESEND_API_KEY not set" }
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
        adminEmails,
        subject: `[SUSI LABS] UPI pending ${order.id.slice(0, 8)} — ${formatInrFromPaise(order.amount_paise)}`,
        body
    })
}

async function sendCustomBuildEmail({ requestId, payload, attachments = [] }) {
    const { apiKey, fromEmail, adminEmails } = getEmailConfig()

    if (!apiKey) {
        console.warn("[SUSI] RESEND_API_KEY not set — skipping custom build email.")
        return { skipped: true, ok: false, error: "RESEND_API_KEY not set" }
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
        adminEmails,
        subject: `[SUSI LABS] Custom build ${requestId.slice(0, 8)} — ${payload.projectName}`,
        body,
        attachments
    })
}

async function sendRawEmail({ apiKey, fromEmail, adminEmails, subject, body, attachments = [] }) {
    const to = Array.isArray(adminEmails) ? adminEmails : [adminEmails]

    console.log("[SUSI] Sending email", {
        to,
        from: fromEmail,
        subject,
        hasKey: Boolean(apiKey)
    })

    const emailPayload = {
        from: fromEmail,
        to,
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
        body: JSON.stringify(emailPayload),
        signal: AbortSignal.timeout(8000)
    })

    if (!res.ok) {
        const errText = await res.text()
        let detail = errText
        try {
            const parsed = JSON.parse(errText)
            detail = parsed.message || parsed.error || errText
        } catch {}

        console.error("[SUSI] Resend email failed:", res.status, detail, { to, from: fromEmail })

        if (/only send testing emails to your own email/i.test(String(detail))) {
            return {
                skipped: false,
                ok: false,
                error: `Resend test sender can only email your Resend signup address. Set ADMIN_EMAIL to that Gmail, or verify a domain in Resend. (${detail})`
            }
        }

        return { skipped: false, ok: false, error: detail }
    }

    const data = await res.json().catch(() => ({}))
    console.log("[SUSI] Resend email sent:", data.id || "ok")
    return { ok: true, id: data.id }
}

module.exports = { sendOrderEmail, sendUpiPendingEmail, sendCustomBuildEmail }
