const { getSupabaseAdmin } = require("../lib/supabase-admin")
const { parsePriceToPaise } = require("../lib/parse-price")
const { createRazorpayOrder, getRazorpayAuth } = require("../lib/razorpay")

function json(res, status, body) {
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(body))
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = ""
        req.on("data", (chunk) => {
            data += chunk
        })
        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {})
            } catch {
                reject(new Error("Invalid JSON"))
            }
        })
        req.on("error", reject)
    })
}

function validateCustomer(c) {
    const required = ["name", "phone", "email", "address_line1", "city", "state", "pin_code"]
    for (const key of required) {
        if (!String(c?.[key] ?? "").trim()) {
            return `Missing ${key.replace("_", " ")}`
        }
    }
    const email = String(c.email).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email"
    const pin = String(c.pin_code).trim()
    if (!/^\d{6}$/.test(pin)) return "PIN code must be 6 digits"
    return null
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return json(res, 405, { error: "Method not allowed" })
    }

    try {
        const body = await readBody(req)
        const customer = body.customer || {}
        const cartItems = Array.isArray(body.items) ? body.items : []
        const paymentMethod = body.paymentMethod === "upi" ? "upi" : "razorpay"

        const validationError = validateCustomer(customer)
        if (validationError) {
            return json(res, 400, { error: validationError })
        }

        if (!cartItems.length) {
            return json(res, 400, { error: "Cart is empty" })
        }

        const supabase = getSupabaseAdmin()
        const ids = [...new Set(cartItems.map((row) => String(row.id)).filter(Boolean))]

        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, name, price, is_active")
            .in("id", ids)

        if (productsError) {
            console.error(productsError)
            return json(res, 500, { error: "Could not load products" })
        }

        const productMap = new Map((products || []).map((p) => [String(p.id), p]))
        const lineItems = []
        let amountPaise = 0

        for (const row of cartItems) {
            const id = String(row.id)
            const qty = Math.max(1, Math.floor(Number(row.qty) || 1))
            const product = productMap.get(id)

            if (!product || product.is_active === false) {
                return json(res, 400, { error: `Product unavailable: ${id}` })
            }

            const unitPaise = parsePriceToPaise(product.price)
            if (unitPaise < 100) {
                return json(res, 400, { error: `Invalid price for ${product.name}` })
            }

            amountPaise += unitPaise * qty
            lineItems.push({
                product_id: id,
                product_name: product.name,
                unit_price: String(product.price),
                unit_price_paise: unitPaise,
                qty
            })
        }

        if (amountPaise < 100) {
            return json(res, 400, { error: "Order total too low" })
        }

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                payment_status: "pending",
                payment_method: paymentMethod,
                amount_paise: amountPaise,
                currency: "INR",
                customer_name: String(customer.name).trim(),
                customer_phone: String(customer.phone).trim(),
                customer_email: String(customer.email).trim(),
                address_line1: String(customer.address_line1).trim(),
                address_line2: String(customer.address_line2 || "").trim() || null,
                city: String(customer.city).trim(),
                state: String(customer.state).trim(),
                pin_code: String(customer.pin_code).trim(),
                notes: String(customer.notes || "").trim() || null
            })
            .select("*")
            .single()

        if (orderError || !order) {
            console.error(orderError)
            return json(res, 500, { error: "Could not save order" })
        }

        const orderItemsPayload = lineItems.map((row) => ({
            order_id: order.id,
            ...row
        }))

        const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload)

        if (itemsError) {
            console.error(itemsError)
            await supabase.from("orders").delete().eq("id", order.id)
            return json(res, 500, { error: "Could not save order items" })
        }

        if (paymentMethod === "upi") {
            const upiVpa = process.env.UPI_VPA || "8849670831@pthdfc"
            return json(res, 200, {
                orderId: order.id,
                amount: amountPaise,
                currency: "INR",
                paymentMethod: "upi",
                upiId: upiVpa
            })
        }

        const receipt = order.id.replace(/-/g, "").slice(0, 40)
        const razorpayOrder = await createRazorpayOrder({
            amountPaise,
            receipt,
            notes: { susi_order_id: order.id }
        })

        await supabase
            .from("orders")
            .update({ razorpay_order_id: razorpayOrder.id })
            .eq("id", order.id)

        const { keyId } = getRazorpayAuth()

        return json(res, 200, {
            orderId: order.id,
            razorpayOrderId: razorpayOrder.id,
            amount: amountPaise,
            currency: "INR",
            paymentMethod: "razorpay",
            keyId,
            customer: {
                name: order.customer_name,
                email: order.customer_email,
                contact: order.customer_phone
            }
        })
    } catch (err) {
        console.error(err)
        return json(res, 500, { error: err.message || "Server error" })
    }
}
