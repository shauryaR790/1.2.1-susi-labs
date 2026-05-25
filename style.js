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
   HERO SECTION
========================= */

fromIfExists(".upper",{
    y: isMobile ? 0 : -400,
    opacity: isMobile ? 0 : 1,
    duration: isMobile ? 0.8 : 1.4,
    ease:"power4.out"
})

fromIfExists(".lower",{
    y: isMobile ? 0 : 500,
    opacity: isMobile ? 0 : 1,
    duration: isMobile ? 0.8 : 1.4,
    ease:"power4.out",
    delay:0.08
})

fromIfExists("nav a",{
    y: isMobile ? -20 : -80,
    opacity:0,
    stagger:0.12,
    duration: isMobile ? 0.8 : 1,
    ease:"power3.out",
    delay: isMobile ? 0.3 : 0.8
})

fromIfExists(".info p",{
    opacity:0,
    y:80,
    duration:1.2,
    ease:"power3.out",
    delay:0.95
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

fromIfExists(".badge",{
    scale:0.7,
    opacity:0,
    duration:1.2,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".badge",
        start:"top 85%",
        once: true
    }
})

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

    startFloat(document.querySelector(".badge"), {
        y: -14,
        rotation: 5,
        duration: 2.6,
        ease: "sine.inOut"
    })

    gsap.utils.toArray(".shape-left, .shape-right").forEach((el, i) => {
        startFloat(el, {
            y: -16,
            rotation: i % 2 ? 6 : -6,
            duration: 2.8,
            ease: "sine.inOut"
        }, 2.4)
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

window.addEventListener("load", () => {
    initFloatingDecor()
    ScrollTrigger.refresh()
})

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

fromIfExists(".footer-links a",{
    x:-80,
    opacity:0,
    stagger:0.08,
    duration:1,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".footer-links",
        start:"top 90%",
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

window.addEventListener("load", () => {
    // Wait slightly longer for the intro animations to clear 
    setTimeout(() => {
        initFloatingDecor()
        ScrollTrigger.refresh()
    }, 500) 
})