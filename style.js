/* =========================
   GSAP + SCROLLTRIGGER
========================= */

gsap.registerPlugin(ScrollTrigger)

ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true
})

/* Skip GSAP calls when targets/triggers are missing (no console warnings) */
function fromIfExists(target, vars = {}) {
    const elements = gsap.utils.toArray(target)
    if (!elements.length) return null

    const trigger = vars.scrollTrigger?.trigger
    if (trigger && !document.querySelector(trigger)) return null

    return gsap.from(elements, vars)
}

/* =========================
   LENIS SMOOTH SCROLL
========================= */

const isMobile = window.matchMedia("(max-width: 768px)").matches
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent)

let lenis
let lenisRafId = null

function bindNativeScroll() {
    window.addEventListener("scroll", ScrollTrigger.update, { passive: true })
}

function startLenisRaf() {
    const raf = (time) => {
        lenis.raf(time)
        lenisRafId = requestAnimationFrame(raf)
    }
    lenisRafId = requestAnimationFrame(raf)
}

function initSmoothScroll() {
    if (isMobile || prefersReducedMotion) {
        bindNativeScroll()
        return
    }

    lenis = new Lenis({
        autoRaf: false,
        lerp: isMac ? 0.12 : 0.1,
        smoothWheel: true,
        wheelMultiplier: isMac ? 0.85 : 1,
        touchMultiplier: 1,
        syncTouch: false
    })

    lenis.on("scroll", ScrollTrigger.update)
    startLenisRaf()

    requestAnimationFrame(() => ScrollTrigger.refresh())
}

initSmoothScroll()

let resizeTimer

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
        lenis?.resize?.()
        ScrollTrigger.refresh()
    }, 200)
})

document.addEventListener("visibilitychange", () => {
    if (document.hidden && lenisRafId) {
        cancelAnimationFrame(lenisRafId)
        lenisRafId = null
    } else if (lenis && !lenisRafId) {
        startLenisRaf()
    }
})

/* =========================
   SITE LOADER
========================= */

const LOADER_STATUSES = [
    "initializing print farm",
    "loading materials",
    "calibrating layers",
    "preparing build plate"
]

const MOBILE_LOADER_STATUSES = [
    "heating nozzle",
    "laying first layer",
    "tracing perimeter",
    "infill pass",
    "cooling print",
    "farm online"
]

const LOADER_MOBILE_MQ = window.matchMedia("(max-width: 768px)")

function isMobileLoaderView() {
    return LOADER_MOBILE_MQ.matches
}

function initLoaderPikachu(scope) {
    const pikachu = scope?.querySelector(".loader-pikachu")
    if (!pikachu || prefersReducedMotion) return

    gsap.to(pikachu, {
        y: -6,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    })
}

function initLoaderSquad(scope) {
    const mons = scope?.querySelectorAll(".loader-mon")
    if (!mons?.length || prefersReducedMotion || typeof gsap === "undefined") return

    gsap.from(mons, {
        scale: 0.5,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: "back.out(1.5)",
        delay: 0.15,
        clearProps: "opacity"
    })
}

function initLoaderMobile(scope) {
    if (!scope || prefersReducedMotion || typeof gsap === "undefined") return

    const ghosts = scope.querySelectorAll(".loader-mobile__ghost")
    const chips = scope.querySelectorAll(".loader-mobile__chips span")

    if (ghosts.length) {
        gsap.to(ghosts, {
            y: "-=14",
            opacity: 0.28,
            duration: 0.9,
            stagger: 0.14,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        })
    }

    if (chips.length) {
        gsap.to(chips, {
            y: -5,
            duration: 0.55,
            stagger: 0.1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        })
    }
}

function removeSiteLoader(loader, onComplete) {
    loader?.remove()
    document.body.classList.remove("is-loading")
    document.body.classList.add("site-ready")
    onComplete()
    ScrollTrigger.refresh()
}

function finishSiteLoader(loader, onComplete) {
    if (isMobileLoaderView() && loader?.querySelector(".loader-mobile")) {
        const mobile = loader.querySelector(".loader-mobile")
        const inner = mobile.querySelector(".loader-mobile__inner")
        const scan = mobile.querySelector(".loader-mobile__scan")
        const chips = mobile.querySelector(".loader-mobile__chips")
        const wipe = mobile.querySelector(".loader-mobile__wipe")

        const exit = gsap.timeline({
            onComplete: () => removeSiteLoader(loader, onComplete)
        })

        exit
            .to(scan, {
                scaleX: 1.4,
                opacity: 0,
                duration: prefersReducedMotion ? 0.25 : 0.35,
                ease: "power2.in"
            })
            .to(
                inner,
                { scale: 0.92, opacity: 0, duration: prefersReducedMotion ? 0.3 : 0.42, ease: "power2.in" },
                "-=0.2"
            )
            .to(
                chips,
                { y: -24, opacity: 0, duration: 0.3, ease: "power2.in" },
                "-=0.35"
            )
            .to(
                wipe,
                { scaleY: 1, duration: prefersReducedMotion ? 0.4 : 0.62, ease: "power4.inOut" },
                "-=0.12"
            )
            .to(loader, { opacity: 0, duration: 0.18, ease: "power1.in" }, "-=0.12")

        return
    }

    const inner = loader?.querySelector(".loader-inner")
    const squad = loader?.querySelector(".loader-squad")
    const marquee = loader?.querySelector(".loader-marquee")
    const panelTop = loader?.querySelector(".loader-panel--top")
    const panelBottom = loader?.querySelector(".loader-panel--bottom")

    const exit = gsap.timeline({
        onComplete: () => removeSiteLoader(loader, onComplete)
    })

    exit
        .to(inner, {
            scale: 1.06,
            opacity: 0,
            duration: prefersReducedMotion ? 0.3 : 0.45,
            ease: "power2.in"
        })
        .to(
            squad,
            { opacity: 0, scale: 0.92, duration: 0.35, ease: "power2.in" },
            "-=0.4"
        )
        .to(
            marquee,
            { y: 40, opacity: 0, duration: 0.35, ease: "power2.in" },
            "-=0.35"
        )
        .to(
            panelTop,
            { yPercent: 0, duration: prefersReducedMotion ? 0.45 : 0.75, ease: "power4.inOut" },
            "-=0.1"
        )
        .to(
            panelBottom,
            { yPercent: 0, duration: prefersReducedMotion ? 0.45 : 0.75, ease: "power4.inOut" },
            "-=0.75"
        )
        .to(
            loader,
            { opacity: 0, duration: 0.2, ease: "power1.in" },
            "-=0.15"
        )
}

function initSiteLoader(onComplete) {
    const loader = document.getElementById("site-loader")
    if (!loader || typeof gsap === "undefined") {
        loader?.remove()
        document.body.classList.remove("is-loading")
        document.body.classList.add("site-ready")
        onComplete()
        return
    }

    document.body.classList.add("is-loading")

    const useMobileLoader = isMobileLoaderView() && loader.querySelector(".loader-mobile")
    const scope = useMobileLoader ? loader.querySelector(".loader-mobile") : loader
    const bar = useMobileLoader
        ? loader.querySelector(".loader-mobile__rail-fill")
        : loader.querySelector(".loader-bar")
    const percentEl = useMobileLoader
        ? loader.querySelector(".loader-mobile__percent span")
        : loader.querySelector(".loader-percent span")
    const statusEl = useMobileLoader
        ? loader.querySelector(".loader-mobile__status")
        : loader.querySelector(".loader-status")
    const layerEl = loader.querySelector(".loader-mobile__layer")
    const progress = { val: 0 }
    let pageLoaded = document.readyState === "complete"
    let minTimeDone = false
    let exiting = false

    if (useMobileLoader) {
        gsap.set(loader.querySelector(".loader-mobile__wipe"), { scaleY: 0, transformOrigin: "bottom center" })
    } else {
        gsap.set(loader.querySelector(".loader-panel--top"), { yPercent: -100 })
        gsap.set(loader.querySelector(".loader-panel--bottom"), { yPercent: 100 })
    }

    const minDuration = prefersReducedMotion ? 1.1 : useMobileLoader ? 2.35 : 2.85
    const progressDuration = prefersReducedMotion ? 0.9 : useMobileLoader ? 2.2 : 2.8

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } })

    if (useMobileLoader) {
        intro
            .from(scope.querySelectorAll(".loader-mobile__chips span"), {
                y: 18,
                opacity: 0,
                duration: 0.4,
                stagger: 0.07
            })
            .from(scope.querySelectorAll(".loader-mobile__eyebrow"), { y: 20, opacity: 0, duration: 0.4 }, "-=0.15")
            .from(scope.querySelectorAll(".loader-mobile__word--a"), { y: 70, opacity: 0, duration: 0.7 }, "-=0.1")
            .from(scope.querySelectorAll(".loader-mobile__word--b"), { y: 70, opacity: 0, duration: 0.7 }, "-=0.5")
            .from(scope.querySelectorAll(".loader-mobile__layer"), { opacity: 0, duration: 0.35 }, "-=0.45")
            .from(
                scope.querySelectorAll(".loader-mobile__rail"),
                { scaleX: 0, duration: 0.55, transformOrigin: "left center" },
                "-=0.25"
            )
            .from(scope.querySelectorAll(".loader-mobile__percent"), { y: 16, opacity: 0, duration: 0.4 }, "-=0.3")
            .from(scope.querySelectorAll(".loader-mobile__status"), { opacity: 0, duration: 0.35 }, "-=0.38")

        if (!prefersReducedMotion) initLoaderMobile(scope)
    } else {
        intro
            .from(scope.querySelectorAll(".loader-tag"), { y: 24, opacity: 0, duration: 0.45 })
            .from(
                scope.querySelectorAll(".loader-juggler"),
                { scale: 0.5, opacity: 0, duration: 0.5, ease: "back.out(1.7)" },
                "-=0.05"
            )
            .from(scope.querySelectorAll(".loader-word--a"), { y: 90, opacity: 0, duration: 0.75 }, "-=0.25")
            .from(scope.querySelectorAll(".loader-word--b"), { y: 90, opacity: 0, duration: 0.75 }, "-=0.55")
            .from(
                scope.querySelectorAll(".loader-track"),
                { scaleX: 0, duration: 0.65, transformOrigin: "left center" },
                "-=0.3"
            )
            .from(scope.querySelectorAll(".loader-percent"), { y: 20, opacity: 0, duration: 0.45 }, "-=0.35")
            .from(scope.querySelectorAll(".loader-status"), { opacity: 0, duration: 0.35 }, "-=0.4")

        if (!prefersReducedMotion) {
            initLoaderSquad(scope)
            initLoaderPikachu(scope)
        }
    }

    const progressTween = gsap.to(progress, {
        val: 100,
        duration: progressDuration,
        ease: "power2.inOut",
        onUpdate() {
            const n = Math.round(progress.val)
            if (percentEl) percentEl.textContent = String(n)
            if (bar) bar.style.width = `${n}%`
            if (layerEl) {
                const layer = Math.min(24, Math.max(1, Math.ceil((progress.val / 100) * 24)))
                layerEl.textContent = `layer ${String(layer).padStart(2, "0")} / 24`
            }
            if (statusEl) {
                const statuses = useMobileLoader ? MOBILE_LOADER_STATUSES : LOADER_STATUSES
                const idx = Math.min(
                    statuses.length - 1,
                    Math.floor((progress.val / 100) * statuses.length)
                )
                statusEl.textContent = statuses[idx]
            }
        }
    })

    function markLoaded() {
        pageLoaded = true
        tryExit()
    }

    function tryExit() {
        if (exiting || !pageLoaded || !minTimeDone) return
        exiting = true
        progressTween.progress(1)
        finishSiteLoader(loader, onComplete)
    }

    if (document.readyState === "complete") {
        pageLoaded = true
    } else {
        window.addEventListener("load", markLoaded, { once: true })
    }

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            pageLoaded = true
            tryExit()
        }
    })

    gsap.delayedCall(minDuration, () => {
        minTimeDone = true
        tryExit()
    })
}

/* =========================
   HERO SECTION
========================= */

function playHeroIntro() {
    fromIfExists(".upper", {
        y: isMobile ? 0 : -400,
        opacity: isMobile ? 0 : 1,
        duration: isMobile ? 0.8 : 1.4,
        ease: "power4.out"
    })

    fromIfExists(".lower", {
        y: isMobile ? 0 : 500,
        opacity: isMobile ? 0 : 1,
        duration: isMobile ? 0.8 : 1.4,
        ease: "power4.out",
        delay: 0.08
    })

    fromIfExists("nav a", {
        y: isMobile ? -20 : -80,
        opacity: 0,
        stagger: 0.12,
        duration: isMobile ? 0.8 : 1,
        ease: "power3.out",
        delay: isMobile ? 0.3 : 0.8
    })

    fromIfExists(".info p", {
        opacity: 0,
        y: 80,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.95
    })

    if (!isMobile) {
        ;[".shape-left", ".shape-right"].forEach((sel, i) => {
            const el = document.querySelector(sel)
            if (!el) return
            gsap.fromTo(
                el,
                { y: 300, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1.4,
                    ease: "power4.out",
                    delay: 1 + i * 0.1
                }
            )
        })

    }
}

function initMobileNavScroll() {
    const mq = window.matchMedia("(max-width: 992px)")

    const update = () => {
        if (!mq.matches) {
            document.body.classList.remove("hero-nav-compact")
            return
        }
        document.body.classList.toggle("hero-nav-compact", window.scrollY > 48)
    }

    window.addEventListener("scroll", update, { passive: true })
    mq.addEventListener("change", update)
    update()
}

function afterLoaderComplete() {
    playHeroIntro()
    initMobileNavScroll()
    requestAnimationFrame(() => ScrollTrigger.refresh())
    gsap.delayedCall(1.4, () => {
        initFloatingDecor()
        ScrollTrigger.refresh()
    })
}

initSiteLoader(afterLoaderComplete)
/* =========================
   NAV HOVER
========================= */

document.querySelectorAll("nav a").forEach((link)=>{

    link.addEventListener("mouseenter",()=>{

        gsap.to(link,{
            y:-4,
            duration:0.25,
            ease:"power2.out"
        })

    })

    link.addEventListener("mouseleave",()=>{

        gsap.to(link,{
            y:0,
            duration:0.25,
            ease:"power2.out"
        })

    })

})

/* =========================
   SECOND PAGE
========================= */

fromIfExists(".heading h1",{
    y:220,
    opacity:0,
    stagger:0.08,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container2",
        start:"top 70%",
        once: true
    }
})

function initPrintFarmBadge() {
    const badge = document.querySelector(".container2 .badge")
    if (!badge || typeof gsap === "undefined" || prefersReducedMotion) return

    const lines = badge.querySelectorAll(".badge-line")
    gsap.set(badge, { transformOrigin: "50% 50%" })
    gsap.set(lines, { opacity: 0, y: 14 })

    const reveal = gsap.timeline({
        paused: true,
        onComplete() {
            startFloat(badge, {
                y: -16,
                rotation: 10,
                duration: 2.5,
                ease: "sine.inOut"
            })
        }
    })

    reveal
        .from(badge, {
            scale: 0,
            rotation: -220,
            opacity: 0,
            duration: 1.15,
            ease: "back.out(2.4)"
        })
        .to(
            lines,
            {
                opacity: 1,
                y: 0,
                duration: 0.55,
                stagger: 0.14,
                ease: "power2.out"
            },
            "-=0.42"
        )

    ScrollTrigger.create({
        trigger: badge,
        start: "top 82%",
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => reveal.play()
    })
}

initPrintFarmBadge()

fromIfExists(".description p",{
    x:-220,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".description",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".img1",{
    y:180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img1",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".img2",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.08,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img2",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".img3",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img3",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".img4",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.22,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img4",
        start:"top 85%",
        once: true
    }
})

/* =========================
   PRODUCTS SECTION
========================= */

fromIfExists(".product-heading h1",{
    y:180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container3",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".products-grid .product-img",{
    y:120,
    opacity:0,
    stagger:0.12,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".products-grid",
        start:"top 82%",
        once: true
    }
})

fromIfExists(".bottom-title h1",{
    x:-220,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".bottom-title",
        start:"top 90%",
        once: true
    }
})

/* =========================
   PRODUCT IMAGE HOVER (fallback when tilt off)
========================= */

if (isMobile || prefersReducedMotion || !window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".product-img").forEach((img) => {
        img.addEventListener("mouseenter", () => {
            gsap.to(img, { scale: 1.03, duration: 0.4, ease: "power2.out" })
        })
        img.addEventListener("mouseleave", () => {
            gsap.to(img, { scale: 1, duration: 0.4, ease: "power2.out" })
        })
    })
}

/* =========================
   EXPERIENCE SECTION
========================= */

fromIfExists(".experience-video",{
    x:-180,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container4",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".experience-title h1",{
    x:180,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".experience-title",
        start:"top 82%",
        once: true
    }
})

fromIfExists(".experience-title p",{
    x:120,
    opacity:0,
    duration:1.2,
    delay:0.1,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".experience-title",
        start:"top 82%",
        once: true
    }
})

fromIfExists(".stat-item",{
    y:100,
    opacity:0,
    stagger:0.15,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".stats",
        start:"top 85%",
        once: true
    }
})

/* =========================
   ELEVATE SECTION
========================= */

fromIfExists(".elevate-content h1",{
    y:-220,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".elevate-content h2",{
    y:120,
    opacity:0,
    duration:1.2,
    delay:0.1,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".elevate-content p",{
    opacity:0,
    y:60,
    duration:1.2,
    delay:0.2,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".elevate-content button",{
    scale:0.7,
    opacity:0,
    duration:1.1,
    delay:0.3,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%",
        once: true
    }
})

/* =========================
   DECORATIVE FLOATING MOTION
========================= */

function startFloat(el, vars, delay = 0) {
    if (!el || prefersReducedMotion) return

    gsap.killTweensOf(el)

    gsap.delayedCall(delay, () => {
        gsap.to(el, {
            ...vars,
            repeat: -1,
            yoyo: true,
            force3D: true,
            transformOrigin: "50% 50%"
        })
    })
}

function initFloatingDecor() {
    if (prefersReducedMotion) return

    startFloat(document.querySelector(".spiral-top"), {
        y: -24,
        rotation: 12,
        duration: 2.4,
        ease: "sine.inOut"
    })

    startFloat(document.querySelector(".star-shape"), {
        y: -18,
        rotation: -14,
        duration: 2,
        ease: "sine.inOut"
    })

    gsap.utils.toArray(".tag").forEach((el, i) => {
        startFloat(el, {
            y: -12,
            rotation: i % 2 ? 8 : -8,
            duration: 2.1 + i * 0.2,
            ease: "sine.inOut"
        }, 0.3 + i * 0.15)
    })

}

/* =========================
   CONTACT SECTION
========================= */

fromIfExists(".contact-heading h1",{
    x:-180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container9",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".question-btn",{
    scale:0,
    rotate:-120,
    opacity:0,
    duration:1,
    delay:0.15,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".container9",
        start:"top 75%",
        once: true
    }
})

fromIfExists(".contact-text",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".contact-text",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".social-icons",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".social-icons",
        start:"top 90%",
        once: true
    }
})

fromIfExists(".email-section",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.25,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".email-section",
        start:"top 90%",
        once: true
    }
})

fromIfExists(".contact-form-box",{
    x:220,
    opacity:0,
    duration:1.5,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".contact-form-box",
        start:"top 80%",
        once: true
    }
})

/* =========================
   FOOTER
========================= */

fromIfExists(".footer-brand h1",{
    y:180,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".footer-brand p",{
    y:60,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer",
        start:"top 85%",
        once: true
    }
})

fromIfExists(".footer-icon",{
    scale:0,
    opacity:0,
    stagger:0.1,
    duration:0.9,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".footer-social",
        start:"top 90%",
        once: true
    }
})

fromIfExists(".footer-btn",{
    y:80,
    opacity:0,
    duration:1,
    delay:0.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer-btn",
        start:"top 92%",
        once: true
    }
})

fromIfExists(".footer-bottom",{
    opacity:0,
    y:40,
    duration:1,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".footer-bottom",
        start:"top 95%",
        once: true
    }
})

/* =========================
   VANILLA TILT
========================= */

function initVanillaTilt() {
    if (typeof VanillaTilt === "undefined") return
    if (isMobile || prefersReducedMotion) return
    if (!window.matchMedia("(hover: hover)").matches) return

    document.querySelectorAll(".product-img").forEach((img) => {
        if (img.closest(".tilt-wrap")) return

        const wrap = document.createElement("div")
        wrap.className = "tilt-wrap"
        img.parentNode.insertBefore(wrap, img)
        wrap.appendChild(img)
    })

    const tiltElements = document.querySelectorAll(".tilt-wrap, .main-card, .side-card")
    if (!tiltElements.length) return

    VanillaTilt.init(tiltElements, {
        max: 12,
        speed: 500,
        glare: true,
        "max-glare": 0.25,
        scale: 1.03
    })
}

/* =========================
   HERO PRINT IT MARQUEE — fill strip on any screen width
========================= */

function fillHeroMarquee() {
    const track = document.querySelector(".print-marquee--hero .print-marquee-track")
    if (!track) return

    const blocks = [...track.querySelectorAll(".print-marquee-content")]
    const source = blocks[0]
    if (!source) return

    const pairCount = Math.floor(source.children.length / 2)
    if (!pairCount) return

    const pairs = []
    for (let i = 0; i < pairCount; i++) {
        pairs.push([source.children[i * 2], source.children[i * 2 + 1]])
    }

    let guard = 0
    while (source.scrollWidth < window.innerWidth * 1.2 && guard < 48) {
        pairs.forEach(([item, dot]) => {
            if (item) source.appendChild(item.cloneNode(true))
            if (dot) source.appendChild(dot.cloneNode(true))
        })
        guard++
    }

    blocks.slice(1).forEach((block) => {
        block.innerHTML = source.innerHTML
    })
}

let heroMarqueeTimer

function scheduleHeroMarqueeFill() {
    clearTimeout(heroMarqueeTimer)
    heroMarqueeTimer = setTimeout(fillHeroMarquee, 80)
}

window.addEventListener("load", () => {
    fillHeroMarquee()
    setTimeout(initVanillaTilt, 400)
})

window.addEventListener("resize", scheduleHeroMarqueeFill)

/* =========================
   ORDER NOW TRANSITION (home -> products.html)
   Keep it simple: show overlay 1s, then navigate.
========================= */

function initOrderNowTransition() {
    const overlay = document.getElementById("order-transition")
    if (!overlay) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const DURATION_MS = prefersReduced ? 0 : 1200

    function shouldHandle(el) {
        const a = el?.closest?.("a[href]")
        if (!a) return null

        const href = a.getAttribute("href") || ""
        if (!href) return null

        // Only intercept links to products page (avoid breaking other nav).
        if (href === "products.html" || href.endsWith("/products.html")) return { a, href: "products.html" }
        return null
    }

    document.addEventListener(
        "click",
        (e) => {
            const hit = shouldHandle(e.target)
            if (!hit) return

            // Respect new tab / modifier keys / non-left clicks.
            if (e.defaultPrevented) return
            if (e.button !== 0) return
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

            e.preventDefault()

            // Activate overlay + lock scroll.
            document.body.classList.add("is-order-transitioning")
            // Restart animation on repeated clicks.
            overlay.classList.remove("is-active")
            void overlay.offsetWidth
            overlay.classList.add("is-active")
            overlay.setAttribute("aria-hidden", "false")

            if (prefersReduced) {
                window.location.href = hit.href
                return
            }

            const track = overlay.querySelector(".order-transition__track")
            const words = overlay.querySelectorAll(".order-transition__word")
            let didGo = false

            const go = () => {
                if (didGo) return
                didGo = true
                track?.removeEventListener("animationend", onEnd)
                words.forEach((w) => w.removeEventListener("animationend", onEnd))
                try {
                    sessionStorage.setItem("susi:productsIntro", "1")
                } catch {}
                window.location.href = hit.href
            }

            const onEnd = (e) => {
                // Navigate when the fade-out finishes (last ~30% of timeline).
                if (e.animationName === "orderTransitionTextFade") go()
            }

            if (track) {
                track.addEventListener("animationend", onEnd)
                words.forEach((w) => w.addEventListener("animationend", onEnd))
                // Safety fallback (in case animationend doesn't fire).
                window.setTimeout(go, DURATION_MS + 80)
            } else {
                window.setTimeout(go, DURATION_MS)
            }
        },
        { capture: true }
    )
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOrderNowTransition, { once: true })
} else {
    initOrderNowTransition()
}
