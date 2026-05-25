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

function finishSiteLoader(loader, onComplete) {
    const inner = loader?.querySelector(".loader-inner")
    const squad = loader?.querySelector(".loader-squad")
    const marquee = loader?.querySelector(".loader-marquee")
    const panelTop = loader?.querySelector(".loader-panel--top")
    const panelBottom = loader?.querySelector(".loader-panel--bottom")

    const exit = gsap.timeline({
        onComplete() {
            loader?.remove()
            document.body.classList.remove("is-loading")
            document.body.classList.add("site-ready")
            onComplete()
            ScrollTrigger.refresh()
        }
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

    const scope = loader
    const bar = loader.querySelector(".loader-bar")
    const percentEl = loader.querySelector(".loader-percent span")
    const statusEl = loader.querySelector(".loader-status")
    const progress = { val: 0 }
    let pageLoaded = document.readyState === "complete"
    let minTimeDone = false
    let exiting = false

    gsap.set(loader.querySelector(".loader-panel--top"), { yPercent: -100 })
    gsap.set(loader.querySelector(".loader-panel--bottom"), { yPercent: 100 })

    const minDuration = prefersReducedMotion ? 1.1 : 2.85
    const progressDuration = prefersReducedMotion ? 0.9 : 2.8

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } })

    intro
        .from(scope.querySelectorAll(".loader-tag"), { y: 24, opacity: 0, duration: 0.45 })
        .from(
            scope.querySelectorAll(".loader-juggler"),
            { scale: 0.5, opacity: 0, duration: 0.5, ease: "back.out(1.7)" },
            "-=0.05"
        )
        .from(scope.querySelectorAll(".loader-word--a"), { y: 90, opacity: 0, duration: 0.75 }, "-=0.25")
        .from(scope.querySelectorAll(".loader-word--b"), { y: 90, opacity: 0, duration: 0.75 }, "-=0.55")
        .from(scope.querySelectorAll(".loader-track"), { scaleX: 0, duration: 0.65, transformOrigin: "left center" }, "-=0.3")
        .from(scope.querySelectorAll(".loader-percent"), { y: 20, opacity: 0, duration: 0.45 }, "-=0.35")
        .from(scope.querySelectorAll(".loader-status"), { opacity: 0, duration: 0.35 }, "-=0.4")

    if (!prefersReducedMotion) {
        initLoaderSquad(scope)
        initLoaderPikachu(scope)
    }

    const progressTween = gsap.to(progress, {
        val: 100,
        duration: progressDuration,
        ease: "power2.inOut",
        onUpdate() {
            const n = Math.round(progress.val)
            if (percentEl) percentEl.textContent = String(n)
            if (bar) bar.style.width = `${n}%`
            if (statusEl) {
                const idx = Math.min(
                    LOADER_STATUSES.length - 1,
                    Math.floor((progress.val / 100) * LOADER_STATUSES.length)
                )
                statusEl.textContent = LOADER_STATUSES[idx]
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

let heroSpideyInit = false

function initHeroSpidey() {
    const spidey = document.querySelector(".hero-spidey")
    const rider = document.querySelector(".hero-spidey-rider")
    const webLine = document.querySelector(".hero-spidey-web-line")
    const hero = document.querySelector(".container")
    if (!spidey || !rider || !webLine || !hero || prefersReducedMotion || isMobile || typeof gsap === "undefined") return
    if (heroSpideyInit) return
    heroSpideyInit = true

    const img = rider.querySelector(".hero-spidey-img")

    const dropDistance = () => {
        const imgH = img?.offsetHeight || 120
        const shapes = document.querySelector(".container .shapes")
        const gap = 32

        if (shapes) {
            const spideyTop = spidey.getBoundingClientRect().top
            const shapesTop = shapes.getBoundingClientRect().top
            const stopAt = shapesTop - spideyTop - imgH - gap
            return Math.max(stopAt, 140)
        }

        return Math.max(hero.offsetHeight * 0.55 - imgH, 180)
    }

    gsap.set(spidey, { opacity: 1, visibility: "visible", autoAlpha: 1, rotation: 0 })
    gsap.set(rider, { top: 0, clearProps: "transform" })
    gsap.set(webLine, {
        height: dropDistance,
        scaleY: 0,
        transformOrigin: "top center"
    })

    const scrollConfig = {
        id: "hero-spidey-scroll",
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        pin: spidey,
        pinType: "fixed",
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => {
            gsap.set(webLine, { height: dropDistance() })
            gsap.set(rider, { top: 0, rotation: 0 })
            gsap.set(spidey, { rotation: 0 })
        },
        onLeave: () => gsap.set(spidey, { autoAlpha: 0 }),
        onEnterBack: () => gsap.set(spidey, { autoAlpha: 1 })
    }

    gsap
        .timeline({ scrollTrigger: scrollConfig })
        .to(webLine, { scaleY: 1, ease: "none" }, 0)
        .to(rider, { top: dropDistance, ease: "none" }, 0)
}

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

function afterLoaderComplete() {
    playHeroIntro()
    requestAnimationFrame(() => {
        initHeroSpidey()
        ScrollTrigger.refresh()
    })
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

fromIfExists(".experience-img",{
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

window.addEventListener("load", () => {
    setTimeout(initVanillaTilt, 400)
})
