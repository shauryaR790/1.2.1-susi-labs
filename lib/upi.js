const DEFAULT_UPI_VPA = "635642524@ptaxis"

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

/**
 * Build a UPI intent URI (NPCI). Keep `pa` unencoded; encode optional text fields.
 */
function buildUpiPayUri({ vpa, amountPaise, payeeName = "SUSI LABS", transactionNote = "" }) {
    const pa = normalizeVpa(vpa)
    const paise = Math.round(Number(amountPaise) || 0)
    if (paise < 100) {
        throw new Error("Invalid UPI amount")
    }

    const am = (paise / 100).toFixed(2)
    const pn = encodeURIComponent(
        String(payeeName || "SUSI LABS")
            .replace(/[^\w\s.-]/g, "")
            .trim()
            .slice(0, 50) || "SUSI LABS"
    )

    let uri = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`

    const note = String(transactionNote || "")
        .replace(/[^\w\s.-]/g, "")
        .trim()
        .slice(0, 40)
    if (note) {
        uri += `&tn=${encodeURIComponent(note)}`
    }

    return uri
}

module.exports = { DEFAULT_UPI_VPA, normalizeVpa, getDefaultVpa, buildUpiPayUri }
