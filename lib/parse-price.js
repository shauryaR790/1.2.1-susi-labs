/** Parse display price (e.g. "₹899") to integer paise for Razorpay. */
function parsePriceToPaise(priceStr) {
    const digits = String(priceStr ?? "").replace(/[^\d.]/g, "")
    const rupees = Math.round(parseFloat(digits) || 0)
    if (!Number.isFinite(rupees) || rupees < 0) return 0
    return rupees * 100
}

function formatInrFromPaise(paise) {
    return `₹${Math.round(Number(paise) / 100)}`
}

module.exports = { parsePriceToPaise, formatInrFromPaise }
