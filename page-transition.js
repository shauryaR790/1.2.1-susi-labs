/* =========================
   PRODUCTS PAGE TRANSITION
========================= */

;(function () {
    const isIndex =
        document.body.classList.contains("page-home") ||
        document.querySelector(".container .hero")

    if (!isIndex || typeof gsap === "undefined") return

    const hero = document.querySelector(".container .hero")
    const productsView = document.getElementById("products-view")
    const heroSection = document.querySelector(".container")
    const fadeTargets = document.querySelectorAll(
        ".container .print-marquee--hero, .container .hero-aside .info, .container .shapes"
    )

    if (!hero || !productsView) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isMobile = window.matchMedia("(max-width: 992px)").matches

    let isTransitioning = false
    let isProductsOpen = false
    let heroHomeRect = null

    const productsMarquee = productsView.querySelector(".products-view__marquee")
    const productsSidebar = productsView.querySelector(".products-sidebar")
    const productsMain = productsView.querySelector(".products-view__main")

    const MARQUEE_H = () => {
        const h = getComputedStyle(productsView).getPropertyValue("--products-marquee-h").trim()
        return parseFloat(h) || (isMobile ? 52 : 56)
    }

    const BANNER_GAP = () => {
        const g = getComputedStyle(productsView).getPropertyValue("--products-banner-gap").trim()
        return parseFloat(g) || (isMobile ? 32 : 48)
    }

    const LOGO_TOP = () => MARQUEE_H() + BANNER_GAP()
    const LOGO_LEFT = () => (isMobile ? 16 : 28)
    const LOGO_SCALE = () => (isMobile ? 0.2 : 0.17)

    const heroUpper = hero.querySelector(".upper")
    const heroLower = hero.querySelector(".lower")

    let productsWheelHandler = null

    function enableProductsScroll() {
        if (productsWheelHandler) return

        productsWheelHandler = (e) => {
            if (!isProductsOpen) return

            const maxScroll = productsView.scrollHeight - productsView.clientHeight
            if (maxScroll <= 0) return

            productsView.scrollTop += e.deltaY

            if (e.cancelable) e.preventDefault()
        }

        window.addEventListener("wheel", productsWheelHandler, { passive: false })
        productsView.addEventListener("wheel", productsWheelHandler, { passive: false })
    }

    function disableProductsScroll() {
        if (!productsWheelHandler) return
        window.removeEventListener("wheel", productsWheelHandler)
        productsView.removeEventListener("wheel", productsWheelHandler)
        productsWheelHandler = null
    }

    function lockScroll(lock) {
        document.body.style.overflow = lock ? "hidden" : ""
        document.documentElement.style.overflow = lock ? "hidden" : ""
        if (window.lenis) {
            if (lock) window.lenis.stop()
            else window.lenis.start()
        }
        if (lock) {
            enableProductsScroll()
        } else {
            disableProductsScroll()
        }
    }

    function scrollToHero() {
        const top = heroSection ? heroSection.offsetTop : 0

        if (window.scrollY <= 12) {
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            const done = () => {
                window.removeEventListener("scroll", onScroll)
                clearTimeout(fallback)
                resolve()
            }

            const onScroll = () => {
                if (window.scrollY <= 12) done()
            }

            window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" })

            if (window.lenis?.scrollTo) {
                window.lenis.scrollTo(top, {
                    duration: prefersReducedMotion ? 0 : 1.1,
                    onComplete: done
                })
            }

            const fallback = setTimeout(done, prefersReducedMotion ? 50 : 1100)
            window.addEventListener("scroll", onScroll, { passive: true })
        })
    }

    function captureHeroRect() {
        return hero.getBoundingClientRect()
    }

    function setHeroFixedFromRect(rect) {
        gsap.set(hero, {
            position: "fixed",
            top: rect.top,
            left: rect.left,
            right: "auto",
            bottom: "auto",
            width: rect.width,
            margin: 0,
            zIndex: 210,
            transformOrigin: "top left",
            clearProps: "transform"
        })
    }

    function openProductsView(options = {}) {
        const { instant = false } = options

        if (isTransitioning || isProductsOpen) return Promise.resolve()

        isTransitioning = true
        lockScroll(true)
        document.body.classList.add("is-products-active", "hero-nav-compact")

        const duration = instant || prefersReducedMotion ? 0.35 : 1.05
        const fadeDur = instant || prefersReducedMotion ? 0.2 : 0.55
        const stagger = instant || prefersReducedMotion ? 0.04 : 0.09

        return scrollToHero().then(() => {
            heroHomeRect = captureHeroRect()
            setHeroFixedFromRect(heroHomeRect)

            const tl = gsap.timeline({
                defaults: { ease: "power3.inOut" },
                onComplete: () => {
                    isTransitioning = false
                    isProductsOpen = true
                    productsView.setAttribute("aria-hidden", "false")
                    hero.setAttribute("role", "button")
                    hero.setAttribute("tabindex", "0")
                    hero.setAttribute("aria-label", "Back to SUSI LABS home")
                    enableProductsScroll()
                    const url = new URL(location.href)
                    url.searchParams.set("order", "1")
                    history.pushState({ view: "products" }, "", url)
                }
            })

            tl.to(
                hero,
                {
                    top: LOGO_TOP(),
                    left: LOGO_LEFT(),
                    scale: LOGO_SCALE(),
                    duration,
                    ease: "power3.inOut"
                },
                0
            )

            if (heroUpper) {
                tl.to(
                    heroUpper,
                    { color: "#ffffff", duration: fadeDur, ease: "power2.inOut" },
                    instant ? 0 : 0.2
                )
            }

            if (heroLower) {
                tl.to(
                    heroLower,
                    { color: "#ffffff", duration: fadeDur, ease: "power2.inOut" },
                    instant ? 0 : 0.2
                )
            }

            tl.to(
                fadeTargets,
                {
                    opacity: 0,
                    y: -16,
                    duration: fadeDur,
                    stagger: 0.06,
                    ease: "power2.inOut"
                },
                instant ? 0 : 0.12
            )

            if (productsMarquee) {
                tl.fromTo(
                    productsMarquee,
                    { yPercent: -100, opacity: 0 },
                    {
                        yPercent: 0,
                        opacity: 1,
                        duration: instant ? 0.25 : 0.7,
                        ease: "power3.out"
                    },
                    instant ? 0.08 : 0.28
                )
            }

            tl.to(
                productsView,
                {
                    autoAlpha: 1,
                    duration: fadeDur,
                    ease: "power2.out"
                },
                instant ? 0.1 : 0.32
            )

            if (productsSidebar) {
                tl.fromTo(
                    productsSidebar,
                    { opacity: 0, x: -24 },
                    {
                        opacity: 1,
                        x: 0,
                        duration: instant ? 0.2 : 0.55,
                        ease: "power3.out"
                    },
                    instant ? 0.12 : 0.38
                )

                tl.fromTo(
                    productsSidebar.querySelectorAll(".products-filter"),
                    { opacity: 0, x: -16 },
                    {
                        opacity: 1,
                        x: 0,
                        duration: instant ? 0.15 : 0.45,
                        stagger: 0.05,
                        ease: "power3.out"
                    },
                    instant ? 0.14 : 0.44
                )
            }

            if (productsMain) {
                tl.fromTo(
                    productsMain,
                    { opacity: 0, x: 28 },
                    {
                        opacity: 1,
                        x: 0,
                        duration: instant ? 0.2 : 0.6,
                        ease: "power3.out"
                    },
                    instant ? 0.1 : 0.36
                )
            }

            tl.fromTo(
                productsView.querySelectorAll(".product-card"),
                { y: 48, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: instant ? 0.25 : 0.65,
                    stagger,
                    ease: "power3.out"
                },
                instant ? 0.15 : 0.5
            )

            return tl
        })
    }

    function closeProductsView(options = {}) {
        const { instant = false } = options

        if (isTransitioning || !isProductsOpen) return Promise.resolve()

        isTransitioning = true
        productsView.setAttribute("aria-hidden", "true")

        const duration = instant || prefersReducedMotion ? 0.3 : 0.85

        const tl = gsap.timeline({
            defaults: { ease: "power3.inOut" },
            onComplete: () => {
                gsap.set(hero, { clearProps: "all" })
                hero.removeAttribute("role")
                hero.removeAttribute("tabindex")
                hero.removeAttribute("aria-label")
                document.body.classList.remove("is-products-active")
                if (!isMobile || window.scrollY <= 48) {
                    document.body.classList.remove("hero-nav-compact")
                }
                lockScroll(false)
                isTransitioning = false
                isProductsOpen = false
                ScrollTrigger?.refresh?.()
            }
        })

        if (productsMarquee) {
            tl.to(
                productsMarquee,
                {
                    yPercent: -100,
                    opacity: 0,
                    duration: duration * 0.45,
                    ease: "power2.in"
                },
                0
            )
        }

        if (productsSidebar) {
            tl.to(
                productsSidebar,
                {
                    opacity: 0,
                    x: -20,
                    duration: duration * 0.4,
                    ease: "power2.in"
                },
                0.04
            )
        }

        if (productsMain) {
            tl.to(
                productsMain,
                {
                    opacity: 0,
                    x: 32,
                    duration: duration * 0.4,
                    ease: "power2.in"
                },
                0.06
            )
        }

        tl.to(productsView.querySelectorAll(".product-card"), {
            y: 24,
            opacity: 0,
            duration: duration * 0.45,
            stagger: 0.04,
            ease: "power2.in"
        }, productsMarquee ? 0.06 : 0)

        tl.to(
            productsView,
            {
                autoAlpha: 0,
                duration: duration * 0.4,
                ease: "power2.in"
            },
            0.08
        )

        tl.to(
            fadeTargets,
            {
                opacity: 1,
                y: 0,
                duration: duration * 0.55,
                stagger: 0.05,
                ease: "power2.out"
            },
            0.2
        )

        if (heroUpper) {
            tl.to(
                heroUpper,
                { color: "#000000", duration: duration * 0.5, ease: "power2.inOut" },
                0.12
            )
        }

        if (heroLower) {
            tl.to(
                heroLower,
                { color: "#FF7F00", duration: duration * 0.5, ease: "power2.inOut" },
                0.12
            )
        }

        if (heroHomeRect) {
            tl.to(
                hero,
                {
                    top: heroHomeRect.top,
                    left: heroHomeRect.left,
                    scale: 1,
                    duration,
                    ease: "power3.inOut"
                },
                0.15
            )
        }

        return tl
    }

    function bindProductFilters() {
        const filters = productsView.querySelectorAll(".products-filter")
        if (!filters.length) return

        filters.forEach((btn) => {
            btn.addEventListener("click", () => {
                filters.forEach((b) => b.classList.remove("is-active"))
                btn.classList.add("is-active")
            })
        })
    }

    function bindOrderNav() {
        document.querySelectorAll("[data-open-products], a[href*='products.html']").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault()
                openProductsView()
            })
        })
    }

    function isOrderUrl() {
        return new URLSearchParams(location.search).get("order") === "1"
    }

    function handlePopState() {
        if (!isProductsOpen && isOrderUrl()) {
            openProductsView({ instant: true })
            return
        }
        if (isProductsOpen && !isOrderUrl()) {
            closeProductsView()
        }
    }

    function checkAutoOpen() {
        const wantsOrder =
            isOrderUrl() || sessionStorage.getItem("susi-open-products") === "1"

        if (!wantsOrder) return

        sessionStorage.removeItem("susi-open-products")

        const run = () => openProductsView({ instant: prefersReducedMotion })

        if (document.body.classList.contains("is-loading")) {
            window.addEventListener(
                "susi:loader-complete",
                () => gsap.delayedCall(0.35, run),
                { once: true }
            )
        } else {
            gsap.delayedCall(0.2, run)
        }
    }

    window.SusiProducts = {
        open: openProductsView,
        close: closeProductsView
    }

    function goHomeFromProducts() {
        if (isOrderUrl()) {
            history.back()
            return
        }
        closeProductsView()
    }

    function bindHeroLogoHome() {
        hero.addEventListener("click", (e) => {
            if (!document.body.classList.contains("is-products-active")) return
            e.preventDefault()
            goHomeFromProducts()
        })

        hero.addEventListener("keydown", (e) => {
            if (!document.body.classList.contains("is-products-active")) return
            if (e.key !== "Enter" && e.key !== " ") return
            e.preventDefault()
            goHomeFromProducts()
        })
    }

    productsView.querySelector(".products-view__back")?.addEventListener("click", (e) => {
        e.preventDefault()
        goHomeFromProducts()
    })

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("load", checkAutoOpen)

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            bindOrderNav()
            bindProductFilters()
            bindHeroLogoHome()
        })
    } else {
        bindOrderNav()
        bindProductFilters()
        bindHeroLogoHome()
    }
})()
