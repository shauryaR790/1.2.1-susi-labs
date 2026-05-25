/* =========================
   FUNKY SITE DECOR — Pokémon + wizard vibes
========================= */

const decorReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

const SNITCH_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="32" cy="32" r="14" fill="#FFFD46" stroke="#000" stroke-width="3"/>
  <path d="M8 28 Q2 32 8 36" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
  <path d="M56 28 Q62 32 56 36" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 18 L36 8 L40 18 Z" fill="#C7F06F" stroke="#000" stroke-width="2"/>
</svg>`

const GLASSES_SVG = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="22" cy="22" r="14" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="58" cy="22" r="14" fill="none" stroke="#000" stroke-width="4"/>
  <path d="M36 22 H44" stroke="#000" stroke-width="4"/>
  <path d="M8 22 H2 M78 22 H72" stroke="#000" stroke-width="4" stroke-linecap="round"/>
</svg>`

const SITE_DECOR_ITEMS = [
    {
        parent: ".container",
        class: "decor--hero-tl",
        size: 88,
        rotate: -8,
        immediate: true,
        float: { y: -20, rotation: 10, duration: 2.6 },
        pokemon: "images/decor-gengar.gif"
    },
    {
        parent: ".container2",
        class: "decor--c2-r",
        size: 110,
        rotate: 6,
        float: { y: -16, rotation: -6, duration: 3.2 },
        pokemon: "images/decor-snorlax.gif"
    },
    {
        parent: ".container3",
        class: "decor--c3-l",
        size: 96,
        rotate: -12,
        float: { y: -22, rotation: 8, duration: 2.4 },
        pokemon: "images/decor-charizard.gif"
    },
    {
        parent: ".container4",
        class: "decor--c4-tr",
        size: 80,
        rotate: 14,
        float: { y: -18, rotation: -10, duration: 2.8 },
        pokemon: "images/decor-squirtle.gif"
    },
    {
        parent: ".container8",
        class: "decor--c8-t",
        size: 100,
        rotate: 4,
        float: { y: -24, rotation: -8, duration: 3 },
        pokemon: "images/decor-mewtwo.gif"
    },
    {
        parent: ".container7-main",
        class: "decor--c7-snitch",
        size: 72,
        rotate: 0,
        float: { y: -28, rotation: 360, duration: 4 },
        svg: SNITCH_SVG
    },
    {
        parent: ".container9",
        class: "decor--c9-glasses",
        size: 90,
        rotate: -18,
        float: { y: -12, rotation: 5, duration: 2.2 },
        svg: GLASSES_SVG
    }
]

function decorStartFloat(el, vars, delay = 0) {
    if (!el || decorReducedMotion) return

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

function revealDecorPiece(el, item, index, useScroll) {
    gsap.set(el, { opacity: 0, scale: 0.4, rotation: (item.rotate || 0) - 30 })

    const revealVars = {
        opacity: 1,
        scale: 1,
        rotation: item.rotate || 0,
        duration: 1,
        ease: "back.out(1.8)",
        delay: index * 0.06
    }

    if (useScroll) {
        gsap.to(el, {
            ...revealVars,
            scrollTrigger: {
                trigger: el.parentElement,
                start: "top 92%",
                once: true
            }
        })
    } else {
        gsap.to(el, revealVars)
    }

    if (item.float.rotation === 360) {
        gsap.to(el, {
            rotation: (item.rotate || 0) + 360,
            duration: item.float.duration,
            repeat: -1,
            ease: "none"
        })
        gsap.to(el, {
            y: item.float.y,
            duration: item.float.duration * 0.35,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        })
    } else {
        decorStartFloat(el, item.float, index * 0.15)
    }
}

function createDecorPiece(item, index) {
    const parent = document.querySelector(item.parent)
    if (!parent) return null

    if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative"
    }

    const el = document.createElement("div")
    el.className = `site-decor-piece ${item.class}`
    el.setAttribute("aria-hidden", "true")
    el.style.setProperty("--decor-size", `${item.size}px`)
    if (item.rotate) el.style.setProperty("--decor-rotate", `${item.rotate}deg`)

    if (item.pokemon) {
        const img = document.createElement("img")
        img.src = item.pokemon
        img.alt = ""
        img.decoding = "async"
        img.loading = "lazy"
        img.width = item.size
        img.height = item.size
        el.appendChild(img)
    } else if (item.svg) {
        el.innerHTML = item.svg
    }

    parent.appendChild(el)
    return { el, item, index }
}

function initSiteDecor() {
    if (typeof gsap === "undefined" || decorReducedMotion) return

    const narrow = window.matchMedia("(max-width: 992px)").matches
    const items = narrow ? SITE_DECOR_ITEMS.slice(0, 5) : SITE_DECOR_ITEMS

    const pieces = items
        .map((item, index) => createDecorPiece(item, index))
        .filter(Boolean)

    pieces.forEach(({ el, item, index }) => {
        revealDecorPiece(el, item, index, !item.immediate)
    })

    requestAnimationFrame(() => ScrollTrigger.refresh())
}

window.initSiteDecor = initSiteDecor
