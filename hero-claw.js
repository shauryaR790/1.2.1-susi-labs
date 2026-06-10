/* Hero claw — places SUSI LABS letter by letter */

;(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isMobile = window.matchMedia("(max-width: 992px)").matches

    const LETTER_ORDER = [
        { sel: ".upper .hero-letter:nth-child(1)", char: "S" },
        { sel: ".upper .hero-letter:nth-child(2)", char: "U" },
        { sel: ".upper .hero-letter:nth-child(3)", char: "S" },
        { sel: ".upper .hero-letter:nth-child(4)", char: "I" },
        { sel: ".lower .hero-letter:nth-child(1)", char: "L" },
        { sel: ".lower .hero-letter:nth-child(2)", char: "A" },
        { sel: ".lower .hero-letter:nth-child(3)", char: "B" },
        { sel: ".lower .hero-letter:nth-child(4)", char: "S" }
    ]

    function clawOpen(prongs) {
        return gsap.to(prongs, {
            rotate: (i) => (i === 0 ? -38 : i === 2 ? 38 : 0),
            duration: 0.2,
            ease: "power2.out"
        })
    }

    function clawClose(prongs) {
        return gsap.to(prongs, {
            rotate: (i) => (i === 0 ? 16 : i === 2 ? -16 : 6),
            duration: 0.16,
            ease: "power2.in"
        })
    }

    function measureLetterSlots(container) {
        const cRect = container.getBoundingClientRect()
        const letters = LETTER_ORDER.map(({ sel }) => document.querySelector(sel)).filter(Boolean)

        letters.forEach((el) => {
            el.classList.remove("hero-letter--placed")
            el.style.visibility = "hidden"
        })

        const slots = letters.map((el) => {
            const r = el.getBoundingClientRect()
            return {
                el,
                left: r.left - cRect.left,
                top: r.top - cRect.top,
                width: r.width,
                height: r.height
            }
        })

        letters.forEach((el) => {
            el.style.visibility = ""
        })

        return slots
    }

    function parkLettersInHopper(slots, hopper) {
        slots.forEach((slot, i) => {
            gsap.set(slot.el, {
                position: "absolute",
                left: hopper.left,
                top: hopper.top + i * (isMobile ? 5 : 7),
                width: slot.width,
                height: slot.height,
                x: 0,
                y: 0,
                rotate: (Math.random() - 0.5) * 10,
                opacity: 0,
                scale: 1,
                zIndex: 5
            })
        })
    }

    function playHeroClawDrop(onAside) {
        const scene = document.querySelector(".hero-claw")
        const container = document.querySelector(".container")
        const hero = document.querySelector(".hero--claw-drop")
        const rig = document.querySelector(".hero-claw__rig")
        const cable = document.querySelector(".hero-claw__cable")
        const prongs = gsap.utils.toArray(".hero-claw__prong")
        const rail = document.querySelector(".hero-claw__rail")
        const motor = document.querySelector(".hero-claw__motor")
        const hopperEl = document.querySelector(".hero-claw__hopper")
        const cargo = document.querySelector(".hero-claw__cargo")

        if (
            prefersReducedMotion ||
            !window.gsap ||
            !scene ||
            !container ||
            !hero ||
            !rig ||
            !cable ||
            !cargo
        ) {
            return false
        }

        const slots = measureLetterSlots(container)
        if (slots.length !== LETTER_ORDER.length) return false

        hero.classList.add("hero--placing")

        const cRect = container.getBoundingClientRect()
        const hopper = {
            x: cRect.width * (isMobile ? 0.78 : 0.84),
            y: cRect.height * (isMobile ? 0.2 : 0.18),
            left: cRect.width * (isMobile ? 0.78 : 0.84) - slots[0].width / 2,
            top: cRect.height * (isMobile ? 0.2 : 0.18)
        }

        const railY = isMobile ? 118 : 88
        const cableBase = isMobile ? 72 : 96

        document.body.classList.add("hero-claw-active")
        parkLettersInHopper(slots, hopper)

        gsap.set(scene, { opacity: 1 })
        gsap.set(rig, { left: hopper.x, xPercent: -50, y: railY })
        gsap.set(cable, { height: cableBase })
        gsap.set(prongs, { rotate: 0, transformOrigin: "50% 0%" })
        gsap.set([rail, motor, hopperEl], { opacity: 0 })
        gsap.set(cargo, { opacity: 0, scale: 1 })

        const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            onComplete: () => {
                slots.forEach((s) => {
                    s.el.classList.add("hero-letter--placed")
                    gsap.set(s.el, { clearProps: "all" })
                })
                hero.classList.remove("hero--placing")
                gsap.set(scene, { opacity: 0 })
                gsap.set(cargo, { opacity: 0, textContent: "" })
                document.body.classList.remove("hero-claw-active")
                onAside?.()
            }
        })

        tl.to(rail, { opacity: 1, duration: 0.35 }, 0)
            .to(motor, { opacity: 1, duration: 0.3 }, 0.05)
            .to(hopperEl, { opacity: 1, duration: 0.35 }, 0.08)
            .fromTo(rig, { y: -80 }, { y: railY, duration: 0.55, ease: "power2.out" }, 0.1)

        slots.forEach((slot, index) => {
            const placeX = slot.left + slot.width / 2
            const pickY = hopper.top + index * (isMobile ? 5 : 7) + slot.height * 0.55
            const placeY = slot.top + slot.height * 0.92
            const pickCable = cableBase + (pickY - railY)
            const placeCable = cableBase + (placeY - railY)
            const t = 0.75 + index * (isMobile ? 0.72 : 0.82)

            tl.to(rig, { left: hopper.x, duration: 0.38, ease: "power2.inOut" }, t)
                .to(cable, { height: pickCable, duration: 0.34, ease: "power2.in" }, t + 0.02)
                .add(clawOpen(prongs), t + 0.3)
                .to(slot.el, { opacity: 1, duration: 0.12 }, t + 0.32)
                .add(clawClose(prongs), t + 0.38)
                .call(
                    () => {
                        cargo.textContent = slot.el.textContent
                        cargo.className =
                            "hero-claw__cargo " +
                            (slot.el.classList.contains("hero-letter--orange")
                                ? "hero-claw__cargo--orange"
                                : "hero-claw__cargo--dark")
                        cargo.style.fontSize = `${Math.max(28, slot.width * 0.92)}px`
                        gsap.set(cargo, { opacity: 1 })
                        gsap.set(slot.el, { opacity: 0 })
                    },
                    null,
                    t + 0.42
                )
                .to(cable, { height: cableBase, duration: 0.28, ease: "power2.out" }, t + 0.44)
                .to(rig, { left: placeX, duration: 0.48, ease: "power2.inOut" }, t + 0.5)
                .to(cable, { height: placeCable, duration: 0.36, ease: "power2.in" }, t + 0.72)
                .add(clawOpen(prongs), t + 0.92)
                .call(
                    () => {
                        gsap.set(cargo, { opacity: 0, textContent: "" })
                        gsap.set(slot.el, {
                            left: slot.left,
                            top: slot.top,
                            width: slot.width,
                            height: slot.height,
                            opacity: 1,
                            rotate: 0,
                            y: -18
                        })
                    },
                    null,
                    t + 0.96
                )
                .to(slot.el, { y: 0, duration: 0.42, ease: "bounce.out" }, t + 0.98)
                .to(cable, { height: cableBase, duration: 0.26, ease: "power2.out" }, t + 1.02)
        })

        const endT = 0.75 + slots.length * (isMobile ? 0.72 : 0.82) + 1.1
        tl.to(rig, { y: -120, opacity: 0, duration: 0.55, ease: "power2.in" }, endT)
            .to([rail, motor, hopperEl], { opacity: 0, duration: 0.35 }, endT + 0.15)

        return true
    }

    window.SUSI_HERO_CLAW = { play: playHeroClawDrop }
})()
