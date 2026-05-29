/* =========================
   SUSI PAGE TRANSITIONS
   products.html + cart.html (desktop slide / mobile Print Forge)
========================= */

;(function () {
    const ROUTES = [
        { page: "products.html", introKey: "susi:productsIntro" },
        { page: "cart.html", introKey: "susi:cartIntro" }
    ]

    let initialized = false

    function matchRoute(href) {
        const clean = (href || "").split("#")[0].split("?")[0]
        if (!clean) return null

        for (const route of ROUTES) {
            if (clean === route.page || clean.endsWith(`/${route.page}`)) {
                return route
            }
        }
        return null
    }

    function initSusiPageTransitions() {
        if (initialized) return

        const overlay = document.getElementById("order-transition")
        if (!overlay) return

        initialized = true

        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const isMobileTransition = window.matchMedia("(max-width: 768px)").matches
        const DURATION_MS = prefersReduced ? 0 : 1200
        const NAV_AT_MS = prefersReduced
            ? 0
            : isMobileTransition
              ? Math.round(DURATION_MS * 0.68)
              : DURATION_MS

        document.addEventListener(
            "click",
            (e) => {
                const a = e.target?.closest?.("a[href]")
                if (!a) return

                const route = matchRoute(a.getAttribute("href") || "")
                if (!route) return

                if (e.defaultPrevented) return
                if (e.button !== 0) return
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

                e.preventDefault()

                document.body.classList.add("is-order-transitioning")
                overlay.classList.remove("is-active")
                void overlay.offsetWidth
                overlay.classList.add("is-active")
                overlay.setAttribute("aria-hidden", "false")

                const prefetch = document.createElement("link")
                prefetch.rel = "prefetch"
                prefetch.href = route.page
                document.head.appendChild(prefetch)

                const go = () => {
                    try {
                        sessionStorage.setItem(route.introKey, "1")
                    } catch {}
                    window.location.href = route.page
                }

                if (prefersReduced) {
                    go()
                    return
                }

                let didGo = false
                const navigate = () => {
                    if (didGo) return
                    didGo = true
                    go()
                }

                window.setTimeout(navigate, NAV_AT_MS)
                window.setTimeout(navigate, DURATION_MS + 80)
            },
            { capture: true }
        )
    }

    window.initSusiPageTransitions = initSusiPageTransitions

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSusiPageTransitions, { once: true })
    } else {
        initSusiPageTransitions()
    }
})()
