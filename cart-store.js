/* =========================
   SUSI CART — localStorage (persists across visits)
========================= */

;(function () {
    const CART_KEY = "susi:cart"
    const CART_VERSION = 1
    const EVENT = "susi:cart-updated"

    function canUseStorage() {
        try {
            const probe = "__susi_cart_probe__"
            localStorage.setItem(probe, "1")
            localStorage.removeItem(probe)
            return true
        } catch {
            return false
        }
    }

    const storageOk = canUseStorage()

    function sanitizeUrl(raw) {
        return String(raw ?? "").replace(/[\r\n]+/g, "").trim()
    }

    function normalizeItem(product) {
        return {
            id: String(product.id ?? product.name ?? ""),
            name: String(product.name || "Untitled"),
            price: String(product.price || ""),
            image_url: sanitizeUrl(product.image_url),
            category: String(product.category || ""),
            qty: Math.max(1, Number(product.qty) || 1)
        }
    }

    function parsePayload(raw) {
        if (!raw) return []

        const parsed = JSON.parse(raw)

        if (Array.isArray(parsed)) {
            return parsed.map(normalizeItem).filter((item) => item.id)
        }

        if (parsed && Array.isArray(parsed.items)) {
            return parsed.items.map(normalizeItem).filter((item) => item.id)
        }

        return []
    }

    function readRaw() {
        if (!storageOk) return []

        try {
            return parsePayload(localStorage.getItem(CART_KEY))
        } catch {
            return []
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

    function persist(items) {
        if (!storageOk) {
            console.warn("[SUSI] Cart cannot persist — localStorage is blocked in this browser.")
            return false
        }

        const payload = {
            v: CART_VERSION,
            updatedAt: new Date().toISOString(),
            items
        }

        try {
            localStorage.setItem(CART_KEY, JSON.stringify(payload))
            const check = parsePayload(localStorage.getItem(CART_KEY))
            if (check.length !== items.length) {
                throw new Error("Cart write verification failed")
            }
            return true
        } catch (err) {
            console.warn("[SUSI] Failed to save cart:", err)
            return false
        }
    }

    function write(items) {
        persist(items)
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
        const id = String(product.id ?? product.name ?? "")
        if (!id) return items

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

    function refresh() {
        syncBadges()
        window.dispatchEvent(
            new CustomEvent(EVENT, {
                detail: { items: readRaw(), count: getCount() }
            })
        )
    }

    window.SUSI_CART = {
        getItems,
        getCount,
        addItem,
        removeItem,
        setQty,
        clearCart,
        syncBadges,
        refresh,
        storageOk
    }

    function init() {
        syncBadges()

        window.addEventListener("storage", (e) => {
            if (e.key === CART_KEY) refresh()
        })

        window.addEventListener("pageshow", () => refresh())
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") refresh()
        })
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true })
    } else {
        init()
    }
})()
