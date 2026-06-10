/* Hero claw drop — GSAP arcade grab → release SUSI LABS */

;(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isMobile = window.matchMedia("(max-width: 992px)").matches

    function getOffsets(container, clawPoint, elements) {
        const cRect = container.getBoundingClientRect()
        return elements.map((el) => {
            const r = el.getBoundingClientRect()
            return {
                el,
                x: clawPoint.x - (r.left + r.width / 2 - cRect.left),
                y: clawPoint.y - (r.top - cRect.top)
            }
        })
    }

    function getClawPoint(container) {
        const rect = container.getBoundingClientRect()
        return {
            x: rect.width * (isMobile ? 0.5 : 0.34),
            y: rect.height * (isMobile ? 0.38 : 0.3)
        }
    }

    function playHeroClawDrop(onAside) {
        const scene = document.querySelector(".hero-claw")
        const container = document.querySelector(".container")
        const rig = document.querySelector(".hero-claw__rig")
        const cable = document.querySelector(".hero-claw__cable")
        const prongs = gsap.utils.toArray(".hero-claw__prong")
        const rail = document.querySelector(".hero-claw__rail")
        const motor = document.querySelector(".hero-claw__motor")
        const spark = document.querySelector(".hero-claw__spark")
        const upper = document.querySelector(".upper")
        const lower = document.querySelector(".lower")

        if (
            prefersReducedMotion ||
            !window.gsap ||
            !scene ||
            !container ||
            !rig ||
            !cable ||
            !upper ||
            !lower
        ) {
            return false
        }

        document.body.classList.add("hero-claw-active")

        const clawPoint = getClawPoint(container)
        const offsets = getOffsets(container, clawPoint, [upper, lower])
        const cableLen = isMobile ? 148 : 220
        const dropY = isMobile ? 168 : 248

        offsets.forEach(({ el, x, y }) => {
            gsap.set(el, {
                x,
                y,
                scale: 0.18,
                opacity: 0,
                transformOrigin: "50% 0%"
            })
        })

        gsap.set(scene, { opacity: 1, pointerEvents: "none" })
        gsap.set(rig, { left: clawPoint.x, xPercent: -50, y: -120 })
        gsap.set(cable, { height: 0, opacity: 1 })
        gsap.set(prongs, { rotate: 0, transformOrigin: "50% 0%" })
        gsap.set([rail, motor], { opacity: 0, scaleX: 0.6 })
        gsap.set(spark, { opacity: 0, scale: 0.4 })

        const tl = gsap.timeline({
            defaults: { ease: "power3.inOut" },
            onComplete: () => {
                gsap.set(scene, { opacity: 0 })
                gsap.set([upper, lower], { clearProps: "transform,opacity" })
                document.body.classList.remove("hero-claw-active")
                onAside?.()
            }
        })

        const clawOpen = () =>
            gsap.to(prongs, {
                rotate: (i) => (i === 0 ? -34 : i === 2 ? 34 : 0),
                duration: 0.28,
                ease: "power2.out"
            })

        const clawClose = () =>
            gsap.to(prongs, {
                rotate: (i) => (i === 0 ? 18 : i === 2 ? -18 : 8),
                duration: 0.22,
                ease: "power2.in"
            })

        tl.to(rail, { opacity: 1, scaleX: 1, duration: 0.45, ease: "power2.out" }, 0)
            .to(motor, { opacity: 1, scaleX: 1, duration: 0.4, ease: "back.out(1.6)" }, 0.08)
            .to(rig, { y: clawPoint.y - dropY, duration: 1.05, ease: "power2.inOut" }, 0.12)
            .to(cable, { height: cableLen, duration: 1.05, ease: "power2.inOut" }, 0.12)
            .add(clawOpen, 0.95)
            .to(
                offsets.map((o) => o.el),
                {
                    opacity: 1,
                    scale: 0.26,
                    duration: 0.35,
                    stagger: 0.05,
                    ease: "power2.out"
                },
                1.05
            )
            .add(clawClose, 1.38)
            .to(rig, { left: clawPoint.x + (isMobile ? 0 : 28), duration: 0.55, ease: "sine.inOut" }, 1.55)
            .to(rig, { left: clawPoint.x - (isMobile ? 0 : 18), duration: 0.45, ease: "sine.inOut" }, 2.1)
            .to(rig, { left: clawPoint.x, duration: 0.4, ease: "sine.inOut" }, 2.55)
            .to(rig, { y: clawPoint.y - dropY + 36, duration: 0.55, ease: "power2.in" }, 2.75)
            .to(cable, { height: cableLen + 36, duration: 0.55, ease: "power2.in" }, 2.75)
            .add(clawOpen, 3.15)
            .to(
                offsets.map((o) => o.el),
                {
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    duration: 1.15,
                    stagger: 0.07,
                    ease: "bounce.out"
                },
                3.22
            )
            .to(
                spark,
                {
                    opacity: 1,
                    scale: 1,
                    duration: 0.2,
                    ease: "power2.out",
                    onComplete: () => {
                        gsap.to(spark, { opacity: 0, scale: 1.4, duration: 0.5, delay: 0.1 })
                    }
                },
                3.22
            )
            .to(rig, { y: -140, opacity: 0, duration: 0.85, ease: "power2.in" }, 3.45)
            .to([rail, motor], { opacity: 0, duration: 0.45, ease: "power2.in" }, 3.65)

        return true
    }

    window.SUSI_HERO_CLAW = { play: playHeroClawDrop }
})()
