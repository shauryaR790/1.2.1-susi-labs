/* =========================
   GSAP + SCROLLTRIGGER
========================= */

gsap.registerPlugin(ScrollTrigger)

/* =========================
   LENIS SMOOTH SCROLL
========================= */

const isMobile = window.matchMedia("(max-width: 768px)").matches

let lenis

if (!isMobile) {
    lenis = new Lenis({
        duration:1.2,
        smoothWheel:true,
        easing:(t)=>1 - Math.pow(1 - t, 4)
    })

    lenis.on("scroll", ScrollTrigger.update)

    gsap.ticker.add((time)=>{
        lenis.raf(time * 1000)
    })
} else {
    window.addEventListener("scroll", ScrollTrigger.update, { passive: true })
}

gsap.ticker.lagSmoothing(0)

let resizeTimer

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200)
})

/* =========================
   HERO SECTION
========================= */

gsap.from(".upper",{
    y: isMobile ? 0 : -400,
    opacity: isMobile ? 0 : 1,
    duration: isMobile ? 0.8 : 1.4,
    ease:"power4.out"
})

gsap.from(".lower",{
    y: isMobile ? 0 : 500,
    opacity: isMobile ? 0 : 1,
    duration: isMobile ? 0.8 : 1.4,
    ease:"power4.out",
    delay:0.08
})

gsap.from("nav a",{
    y: isMobile ? -20 : -80,
    opacity:0,
    stagger:0.12,
    duration: isMobile ? 0.8 : 1,
    ease:"power3.out",
    delay: isMobile ? 0.3 : 0.8
})

gsap.from(".info p",{
    opacity:0,
    y:80,
    duration:1.2,
    ease:"power3.out",
    delay:0.95
})

gsap.from(".shape-left",{
    y:300,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    delay:1
})

gsap.from(".shape-right",{
    y:300,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    delay:1.1
})

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

gsap.from(".heading h1",{
    y:220,
    opacity:0,
    stagger:0.08,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container2",
        start:"top 70%"
    }
})

gsap.from(".badge",{
    scale:0.7,
    opacity:0,
    duration:1.2,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".badge",
        start:"top 85%"
    }
})

gsap.from(".description p",{
    x:-220,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".description",
        start:"top 85%"
    }
})

gsap.from(".img1",{
    y:180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img1",
        start:"top 85%"
    }
})

gsap.from(".img2",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.08,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img2",
        start:"top 85%"
    }
})

gsap.from(".img3",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img3",
        start:"top 85%"
    }
})

gsap.from(".img4",{
    y:180,
    opacity:0,
    duration:1.3,
    delay:0.22,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".img4",
        start:"top 85%"
    }
})

/* =========================
   PRODUCTS SECTION
========================= */

gsap.from(".product-heading h1",{
    y:180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container3",
        start:"top 75%"
    }
})

gsap.from(".products-grid:not(.products-grid-clone) .product-img",{
    y:120,
    opacity:0,
    stagger:0.12,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".products-carousel",
        start:"top 82%"
    }
})

gsap.from(".bottom-title h1",{
    x:-220,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".bottom-title",
        start:"top 90%"
    }
})

/* =========================
   PRODUCT IMAGE HOVER
========================= */

document.querySelectorAll(".product-img").forEach((img)=>{

    img.addEventListener("mouseenter",()=>{

        gsap.to(img,{
            scale:1.03,
            duration:0.4,
            ease:"power2.out"
        })

    })

    img.addEventListener("mouseleave",()=>{

        gsap.to(img,{
            scale:1,
            duration:0.4,
            ease:"power2.out"
        })

    })

})

/* =========================
   MOBILE PRODUCT CAROUSEL
========================= */

function initProductCarousel() {
    const carousel = document.querySelector(".products-carousel")
    const track = carousel?.querySelector(".products-track")
    const grid = carousel?.querySelector(".products-grid:not(.products-grid-clone)")

    if (!carousel || !track || !grid) return

    const mobileQuery = window.matchMedia("(max-width: 768px)")

    const updateCarousel = () => {
        track.querySelectorAll(".products-grid-clone").forEach((clone) => clone.remove())
        track.style.removeProperty("--marquee-duration")
        track.style.removeProperty("--marquee-distance")
        carousel.classList.remove("is-carousel")

        if (!mobileQuery.matches) return

        const clone = grid.cloneNode(true)
        clone.classList.add("products-grid-clone")
        clone.setAttribute("aria-hidden", "true")
        track.appendChild(clone)

        carousel.classList.add("is-carousel")

        const loopWidth = grid.offsetWidth + 16
        const speed = 55

        track.style.setProperty("--marquee-distance", `-${loopWidth}px`)
        track.style.setProperty("--marquee-duration", `${loopWidth / speed}s`)
    }

    const scheduleUpdate = () => {
        clearTimeout(initProductCarousel._timer)
        initProductCarousel._timer = setTimeout(updateCarousel, 200)
    }

    updateCarousel()

    mobileQuery.addEventListener("change", updateCarousel)
    window.addEventListener("resize", scheduleUpdate)
    window.addEventListener("load", updateCarousel)
}

initProductCarousel()

/* =========================
   EXPERIENCE SECTION
========================= */

gsap.from(".experience-img",{
    x:-180,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container4",
        start:"top 75%"
    }
})

gsap.from(".experience-title h1",{
    x:180,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".experience-title",
        start:"top 82%"
    }
})

gsap.from(".experience-title p",{
    x:120,
    opacity:0,
    duration:1.2,
    delay:0.1,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".experience-title",
        start:"top 82%"
    }
})

gsap.from(".stat-item",{
    y:100,
    opacity:0,
    stagger:0.15,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".stats",
        start:"top 85%"
    }
})

/* =========================
   GRID GALLERY SECTION
========================= */

gsap.from(".grid1",{
    x:-180,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container5",
        start:"top 75%"
    }
})

gsap.from(".grid2",{
    y:-180,
    opacity:0,
    duration:1.2,
    delay:0.08,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container5",
        start:"top 75%"
    }
})

gsap.from(".grid3",{
    x:180,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container5",
        start:"top 75%"
    }
})

gsap.from(".grid4",{
    y:180,
    opacity:0,
    duration:1.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".bottom-grid",
        start:"top 82%"
    }
})

gsap.from(".grid5",{
    y:180,
    opacity:0,
    duration:1.2,
    delay:0.08,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".bottom-grid",
        start:"top 82%"
    }
})

gsap.from(".grid6",{
    y:180,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".bottom-grid",
        start:"top 82%"
    }
})

/* HOVER */

document.querySelectorAll(".grid-img").forEach((img)=>{

    img.addEventListener("mouseenter",()=>{

        gsap.to(img,{
            scale:1.03,
            duration:0.45,
            ease:"power2.out"
        })

    })

    img.addEventListener("mouseleave",()=>{

        gsap.to(img,{
            scale:1,
            duration:0.45,
            ease:"power2.out"
        })

    })

})

/* =========================
   ELEVATE SECTION
========================= */

gsap.from(".elevate-content h1",{
    y:-220,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%"
    }
})

gsap.from(".elevate-content h2",{
    y:120,
    opacity:0,
    duration:1.2,
    delay:0.1,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%"
    }
})

gsap.from(".elevate-content p",{
    opacity:0,
    y:60,
    duration:1.2,
    delay:0.2,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%"
    }
})

gsap.from(".elevate-content button",{
    scale:0.7,
    opacity:0,
    duration:1.1,
    delay:0.3,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".container6",
        start:"top 75%"
    }
})

/* =========================
   CONTACT SECTION
========================= */

gsap.from(".contact-heading h1",{
    x:-180,
    opacity:0,
    duration:1.3,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".container9",
        start:"top 75%"
    }
})

gsap.from(".question-btn",{
    scale:0,
    rotate:-120,
    opacity:0,
    duration:1,
    delay:0.15,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".container9",
        start:"top 75%"
    }
})

gsap.from(".contact-text",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".contact-text",
        start:"top 85%"
    }
})

gsap.from(".social-section",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".social-section",
        start:"top 90%"
    }
})

gsap.from(".email-section",{
    y:80,
    opacity:0,
    duration:1.2,
    delay:0.25,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".email-section",
        start:"top 90%"
    }
})

gsap.from(".contact-form-box",{
    x:220,
    opacity:0,
    duration:1.5,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".contact-form-box",
        start:"top 80%"
    }
})

/* =========================
   FOOTER
========================= */

gsap.from(".footer-brand h1",{
    y:180,
    opacity:0,
    duration:1.4,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer",
        start:"top 85%"
    }
})

gsap.from(".footer-brand p",{
    y:60,
    opacity:0,
    duration:1.2,
    delay:0.15,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer",
        start:"top 85%"
    }
})

gsap.from(".footer-links a",{
    x:-80,
    opacity:0,
    stagger:0.08,
    duration:1,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".footer-links",
        start:"top 90%"
    }
})

gsap.from(".footer-icon",{
    scale:0,
    opacity:0,
    stagger:0.1,
    duration:0.9,
    ease:"expo.out",
    scrollTrigger:{
        trigger:".footer-social",
        start:"top 90%"
    }
})

gsap.from(".footer-btn",{
    y:80,
    opacity:0,
    duration:1,
    delay:0.2,
    ease:"power4.out",
    scrollTrigger:{
        trigger:".footer-btn",
        start:"top 92%"
    }
})

gsap.from(".footer-bottom",{
    opacity:0,
    y:40,
    duration:1,
    ease:"power3.out",
    scrollTrigger:{
        trigger:".footer-bottom",
        start:"top 95%"
    }
})