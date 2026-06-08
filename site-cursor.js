/* =========================
   SUSI LABS — custom desktop cursor
========================= */

;(function () {
    const DESKTOP_MQ = window.matchMedia("(min-width: 769px) and (pointer: fine) and (hover: hover)")
    const REDUCED_MQ = window.matchMedia("(prefers-reduced-motion: reduce)")

    const INTERACTIVE_SELECTOR =
        "a, button, [role='button'], input, textarea, select, label, .products-filter, .cart-nav, .submit-btn, .product-card__btn"

    let cursor = null
    let rafId = null
    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0
    let visible = false

    function shouldEnable() {
        return DESKTOP_MQ.matches && !REDUCED_MQ.matches
    }

    function setPointerState(target) {
        if (!cursor) return
        const interactive = target?.closest?.(INTERACTIVE_SELECTOR)
        cursor.classList.toggle("is-pointer", !!interactive)
    }

    function onMove(event) {
        if (!cursor) return
        targetX = event.clientX
        targetY = event.clientY

        if (!visible) {
            visible = true
            x = targetX
            y = targetY
            cursor.classList.add("is-visible")
        }

        setPointerState(event.target)
    }

    function onLeave() {
        if (!cursor) return
        visible = false
        cursor.classList.remove("is-visible", "is-pointer", "is-pressed")
    }

    function onDown() {
        cursor?.classList.add("is-pressed")
    }

    function onUp() {
        cursor?.classList.remove("is-pressed")
    }

    function tick() {
        if (cursor && visible) {
            x += (targetX - x) * 0.28
            y += (targetY - y) * 0.28
            cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
        }
        rafId = requestAnimationFrame(tick)
    }

    function bindEvents() {
        document.addEventListener("mousemove", onMove, { passive: true })
        document.addEventListener("mouseleave", onLeave, { passive: true })
        document.addEventListener("mousedown", onDown, { passive: true })
        document.addEventListener("mouseup", onUp, { passive: true })
    }

    function unbindEvents() {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseleave", onLeave)
        document.removeEventListener("mousedown", onDown)
        document.removeEventListener("mouseup", onUp)
    }

    function init() {
        if (!shouldEnable() || cursor) return

        cursor = document.createElement("div")
        cursor.className = "susi-cursor"
        cursor.setAttribute("aria-hidden", "true")
        document.body.appendChild(cursor)
        document.documentElement.classList.add("susi-custom-cursor")

        bindEvents()
        if (!rafId) rafId = requestAnimationFrame(tick)
    }

    function destroy() {
        unbindEvents()
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
        cursor?.remove()
        cursor = null
        visible = false
        document.documentElement.classList.remove("susi-custom-cursor")
    }

    function sync() {
        if (shouldEnable()) init()
        else destroy()
    }

    DESKTOP_MQ.addEventListener("change", sync)
    REDUCED_MQ.addEventListener("change", sync)

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sync, { once: true })
    } else {
        sync()
    }
})()
