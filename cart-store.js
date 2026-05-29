/* =========================
   SUSI CART — localStorage
========================= */

;(function () {
    const CART_KEY = "susi:cart"
    const EVENT = "susi:cart-updated"

    function readRaw() {
        try {
            const raw = localStorage.getItem(CART_KEY)
            if (!raw) return []
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    function normalizeItem(product) {
        return {
            id: String(product.id),
            name: String(product.name || "Untitled"),
            price: String(product.price || ""),
            image_url: String(product.image_url || ""),
            category: String(product.category || ""),
            qty: Math.max(1, Number(product.qty) || 1)
        }
    }

    function getTotalCount(items) {
        return items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0)
    }

    function syncBadges() {
        const count = getTotalCount(readRaw())
        document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : String(count)
                badge.hidden = false
                badge.removeAttribute("aria-hidden")
            } else {
                badge.textContent = "0"
                badge.hidden = true
                badge.setAttribute("aria-hidden", "true")
            }
        })
    }

    function write(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items))
        syncBadges()
        window.dispatchEvent(
            new CustomEvent(EVENT, {
                detail: { items, count: getTotalCount(items) }
            })
        )
    }

    function getItems() {
        return readRaw()
    }

    function getCount() {
        return getTotalCount(readRaw())
    }

    function addItem(product) {
        const items = readRaw()
        const id = String(product.id)
        const existing = items.find((item) => item.id === id)

        if (existing) {
            existing.qty = (Number(existing.qty) || 1) + 1
        } else {
            items.push(normalizeItem(product))
        }

        write(items)
        return items
    }

    function removeItem(id) {
        const next = readRaw().filter((item) => item.id !== String(id))
        write(next)
        return next
    }

    function setQty(id, qty) {
        const items = readRaw()
        const item = items.find((row) => row.id === String(id))
        if (!item) return items

        const nextQty = Number(qty)
        if (!Number.isFinite(nextQty) || nextQty < 1) {
            return removeItem(id)
        }

        item.qty = Math.floor(nextQty)
        write(items)
        return items
    }

    function clearCart() {
        write([])
        return []
    }

    window.SUSI_CART = {
        getItems,
        getCount,
        addItem,
        removeItem,
        setQty,
        clearCart,
        syncBadges
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncBadges, { once: true })
    } else {
        syncBadges()
    }
})()
