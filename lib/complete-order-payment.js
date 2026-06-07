const { sendOrderEmail } = require("./email")

async function completeOrderPayment(supabase, orderId, razorpayPaymentId) {
    const { data: order, error: fetchError } = await supabase.from("orders").select("*").eq("id", orderId).single()

    if (fetchError || !order) {
        return { error: "Order not found", status: 404 }
    }

    if (order.payment_status === "paid") {
        return { ok: true, orderId: order.id, alreadyPaid: true, order }
    }

    const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
            payment_status: "paid",
            razorpay_payment_id: razorpayPaymentId
        })
        .eq("id", orderId)
        .select("*")
        .single()

    if (updateError || !updated) {
        console.error(updateError)
        return { error: "Could not update order", status: 500 }
    }

    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId)

    await sendOrderEmail({ order: updated, items: items || [] })

    return { ok: true, orderId: updated.id, order: updated }
}

module.exports = { completeOrderPayment }
