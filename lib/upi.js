const { UPIQR } = require("@adityavijay21/upiqr")

const DEFAULT_UPI_VPA = "6356425245@ptaxis"

function normalizeVpa(vpa) {
    const raw = String(vpa || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")

    if (!/^[a-z0-9._-]{2,256}@[a-z0-9._-]{2,64}$/.test(raw)) {
        throw new Error("Invalid UPI ID format")
    }

    return raw
}

function getDefaultVpa() {
    return normalizeVpa(process.env.UPI_VPA || DEFAULT_UPI_VPA)
}

function getPayeeName() {
    return String(process.env.UPI_PAYEE_NAME || "SUSI LABS").trim().slice(0, 50) || "SUSI LABS"
}

function orderRef(orderId) {
    return String(orderId || "")
        .replace(/-/g, "")
        .slice(0, 12)
        .toUpperCase()
}

async function generateUpiPayment({ vpa, amountPaise, orderId, payeeName }) {
    const upiId = normalizeVpa(vpa || getDefaultVpa())
    const paise = Math.round(Number(amountPaise) || 0)
    if (paise < 100) {
        throw new Error("Invalid UPI amount")
    }

    const ref = orderRef(orderId) || String(Date.now())
    const name = String(payeeName || getPayeeName()).trim()
    const amount = Number((paise / 100).toFixed(2))

    const { qr, intent } = await new UPIQR()
        .set({
            upiId,
            name,
            amount,
            transactionRef: ref,
            transactionNote: `SUSI ${ref.slice(0, 8)}`
        })
        .generate()

    return { upiId, upiUri: intent, qrDataUrl: qr }
}

module.exports = {
    DEFAULT_UPI_VPA,
    normalizeVpa,
    getDefaultVpa,
    getPayeeName,
    generateUpiPayment
}
