/* Mobile hamburger navigation — slide-down menu on all pages */

;(function () {
    const MOBILE_MQ = window.matchMedia("(max-width: 992px)")

    const NAV_LINKS = [
        { href: "index.html", label: "home" },
        { href: "products.html", label: "shop" },
        { href: "custom-build.html", label: "custom build" },
        { href: "cart.html", label: "cart" },
        { href: "account.html", label: "my account", auth: "signed-in" },
        { href: "login.html", label: "my account", auth: "signed-out" },
        { href: "orders.html", label: "my orders", auth: "signed-in" }
    ]

    let root = null
    let toggle = null
    let panel = null
    let backdrop = null

    function currentPage() {
        const part = window.location.pathname.split("/").pop()
        return part || "index.html"
    }

    function isOpen() {
        return root?.classList.contains("is-open")
    }

    function setOpen(open) {
        if (!root || !toggle) return
        root.classList.toggle("is-open", open)
        toggle.setAttribute("aria-expanded", open ? "true" : "false")
        document.body.classList.toggle("mobile-nav-open", open)
        if (panel) panel.hidden = !open
        if (backdrop) backdrop.hidden = !open
    }

    function closeMenu() {
        setOpen(false)
    }

    function openMenu() {
        if (!MOBILE_MQ.matches) return
        setOpen(true)
    }

    function toggleMenu() {
        setOpen(!isOpen())
    }

    function buildPanelMarkup() {
        const page = currentPage()
        const links = NAV_LINKS.map((item) => {
            const authAttr = item.auth
                ? ` data-auth-show="${item.auth}"${item.auth === "signed-in" ? " hidden" : ""}`
                : ""
            const active = item.href === page ? " is-active" : ""
            return `<a class="mobile-nav__link${active}" href="${item.href}"${authAttr}>${item.label}</a>`
        }).join("")

        return `
            <div class="mobile-nav__backdrop" hidden></div>
            <div class="mobile-nav__panel" id="site-mobile-nav-panel" hidden>
                <nav class="mobile-nav__links" aria-label="Site navigation">
                    ${links}
                    <button type="button" class="mobile-nav__link mobile-nav__link--ghost" data-mobile-nav-signout data-auth-show="signed-in" hidden>sign out</button>
                </nav>
            </div>
        `
    }

    function buildToggle() {
        const btn = document.createElement("button")
        btn.type = "button"
        btn.className = "mobile-nav__toggle"
        btn.setAttribute("aria-label", "Open menu")
        btn.setAttribute("aria-expanded", "false")
        btn.setAttribute("aria-controls", "site-mobile-nav-panel")
        btn.innerHTML = `
            <span class="mobile-nav__bars" aria-hidden="true">
                <span></span><span></span><span></span>
            </span>
        `
        btn.addEventListener("click", toggleMenu)
        return btn
    }

    function mountTrigger() {
        const actions = document.querySelector(".products-header-actions")
        if (actions) {
            actions.appendChild(toggle)
            return
        }

        const stick = document.querySelector(".products-sidebar__stick")
        if (stick) {
            stick.appendChild(toggle)
            return
        }

        toggle.classList.add("mobile-nav__toggle--fixed")
        document.body.appendChild(toggle)
    }

    function wirePanel() {
        backdrop = root.querySelector(".mobile-nav__backdrop")
        panel = root.querySelector(".mobile-nav__panel")

        backdrop?.addEventListener("click", closeMenu)
        panel?.querySelectorAll("a.mobile-nav__link").forEach((link) => {
            link.addEventListener("click", closeMenu)
        })

        panel?.querySelector("[data-mobile-nav-signout]")?.addEventListener("click", async () => {
            closeMenu()
            if (window.SUSI_AUTH) {
                await window.SUSI_AUTH.signOut()
                window.location.href = "login.html"
            }
        })
    }

    function onKeydown(e) {
        if (e.key === "Escape" && isOpen()) closeMenu()
    }

    function onMqChange() {
        if (!MOBILE_MQ.matches) closeMenu()
    }

    function refreshAuth() {
        if (window.SUSI_AUTH?.refreshNavLinks) {
            window.SUSI_AUTH.refreshNavLinks().catch(() => {})
        }
    }

    function init() {
        if (root) return

        root = document.createElement("div")
        root.className = "mobile-nav"
        root.id = "site-mobile-nav"
        root.innerHTML = buildPanelMarkup()
        document.body.appendChild(root)

        toggle = buildToggle()
        mountTrigger()
        wirePanel()
        refreshAuth()

        if (window.SUSI_AUTH?.onAuthStateChange) {
            try {
                window.SUSI_AUTH.onAuthStateChange(() => refreshAuth())
            } catch {}
        }

        document.addEventListener("keydown", onKeydown)
        MOBILE_MQ.addEventListener("change", onMqChange)
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true })
    } else {
        init()
    }
})()
