/* Hero claw — letter-by-letter placement with layout-safe slots */

;(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isMobile = window.matchMedia("(max-width: 992px)").matches

    const SELECTORS = [
        ".upper .hero-letter-slot:nth-child(1) .hero-letter",
        ".upper .hero-letter-slot:nth-child(2) .hero-letter",
        ".upper .hero-letter-slot:nth-child(3) .hero-letter",
        ".upper .hero-letter-slot:nth-child(4) .hero-letter",
        ".lower .hero-letter-slot:nth-child(1) .hero-letter",
        ".lower .hero-letter-slot:nth-child(2) .hero-letter",
        ".lower .hero-letter-slot:nth-child(3) .hero-letter",
        ".lower .hero-letter-slot:nth-child(4) .hero-letter"
    ]

    function relBox(el, root) {
        const r = el.getBoundingClientRect()
        const o = root.getBoundingClientRect()
        return {
            left: r.left - o.left,
            top: r.top - o.top,
            width: r.width,
            height: r.height,
            cx: r.left - o.left + r.width / 2,
            cy: r.top - o.top + r.height / 2
        }
    }

    function clawOpen(arms) {
        return gsap.to(arms, {
            rotate: (i) => (i === 0 ? -28 : 28),
            duration: 0.22,
            ease: "power2.out"
        })
    }

    function clawClose(arms) {
        return gsap.to(arms, {
            rotate: (i) => (i === 0 ? 8 : -8),
            duration: 0.18,
            ease: "power2.in"
        })
    }

    function rigMetrics(container, track) {
        const c = container.getBoundingClientRect()
        const t = track.getBoundingClientRect()
        return {
            railY: t.top - c.top + 10,
            motorH: 44,
            headH: isMobile ? 104 : 128,
            pickX: c.width * (isMobile ? 0.68 : 0.76),
            pickY: c.height * (isMobile ? 0.16 : 0.14)
        }
    }

    function setReach(rig, cable, metrics, targetX, targetY) {
        const cableLen = Math.max(
            40,
            targetY - metrics.railY - 8 - metrics.motorH - metrics.headH
        )
        gsap.set(rig, { left: targetX, xPercent: -50, y: metrics.railY })
        gsap.set(cable, { height: cableLen })
    }

    function makeFlyClone(letter, container) {
        const clone = letter.cloneNode(true)
        clone.classList.add("hero-letter--fly")
        clone.setAttribute("aria-hidden", "true")
        const box = relBox(letter, container)
        gsap.set(clone, {
            position: "absolute",
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            margin: 0,
            opacity: 1,
            zIndex: 40
        })
        container.appendChild(clone)
        return { clone, box }
    }

    function playHeroClawDrop(onAside) {
        const scene = document.querySelector(".hero-claw")
        const container = document.querySelector(".container")
        const hero = document.querySelector(".hero--claw-drop")
        const track = document.querySelector(".hero-claw__track")
        const rig = document.querySelector(".hero-claw__rig")
        const cable = document.querySelector(".hero-claw__cable")
        const armL = document.querySelector(".hero-claw__arm--l")
        const armR = document.querySelector(".hero-claw__arm--r")
        const arms = [armL, armR].filter(Boolean)
        const rail = document.querySelector(".hero-claw__rail")
        const motor = document.querySelector(".hero-claw__motor")
        const motorLight = document.querySelector(".hero-claw__motor-light")
        const cargo = document.querySelector(".hero-claw__cargo")

        const letters = SELECTORS.map((s) => document.querySelector(s)).filter(Boolean)
        const slots = letters.map((letter) => letter.closest(".hero-letter-slot"))

        if (
            prefersReducedMotion ||
            !window.gsap ||
            !scene ||
            !container ||
            !hero ||
            !track ||
            !rig ||
            !cable ||
            letters.length !== 8
        ) {
            return false
        }

        slots.forEach((s) => s?.classList.remove("is-set"))
        letters.forEach((l) => gsap.set(l, { opacity: 0 }))

        const metrics = rigMetrics(container, track)
        const slotTargets = slots.map((slot) => relBox(slot, container))

        document.body.classList.add("hero-claw-active")
        hero.classList.add("hero--placing")

        gsap.set(scene, { opacity: 1 })
        if (armL) gsap.set(armL, { transformOrigin: "52px 44px", rotate: 0 })
        if (armR) gsap.set(armR, { transformOrigin: "108px 44px", rotate: 0 })
        gsap.set([rail, motor], { opacity: 0 })
        gsap.set(cargo, { opacity: 0, textContent: "" })
        setReach(rig, cable, metrics, metrics.pickX, metrics.pickY)

        const tl = gsap.timeline({
            onComplete: () => {
                container.querySelectorAll(".hero-letter--fly").forEach((n) => n.remove())
                letters.forEach((l) => gsap.set(l, { clearProps: "opacity" }))
                hero.classList.remove("hero--placing")
                gsap.set(scene, { opacity: 0 })
                document.body.classList.remove("hero-claw-active")
                onAside?.()
            }
        })

        const step = isMobile ? 0.62 : 0.68

        tl.to(rail, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
            .to(motor, { opacity: 1, duration: 0.35, ease: "back.out(1.4)" }, 0.06)
            .fromTo(rig, { y: metrics.railY - 90 }, { y: metrics.railY, duration: 0.5, ease: "power2.out" }, 0.08)

        letters.forEach((letter, i) => {
            const slot = slots[i]
            const target = slotTargets[i]
            const t0 = 0.55 + i * step
            const flyRef = { el: null }

            tl.add(() => setReach(rig, cable, metrics, metrics.pickX, metrics.pickY), t0)
                .add(clawOpen(arms), t0 + 0.06)
                .add(() => {
                    const fly = makeFlyClone(letter, container)
                    flyRef.el = fly.clone
                    gsap.set(flyRef.el, {
                        left: metrics.pickX - fly.box.width / 2,
                        top: metrics.pickY - 10
                    })
                    cargo.textContent = letter.textContent
                    cargo.className =
                        "hero-claw__cargo " +
                        (letter.classList.contains("hero-letter--orange")
                            ? "hero-claw__cargo--orange"
                            : "hero-claw__cargo--dark")
                    cargo.style.fontSize = `${Math.round(fly.box.height * 0.88)}px`
                    gsap.set(cargo, { opacity: 1 })
                }, t0 + 0.12)
                .add(clawClose(arms), t0 + 0.17)
                .add(() => gsap.set(cargo, { opacity: 0, textContent: "" }), t0 + 0.2)
                .add(
                    () => setReach(rig, cable, metrics, target.cx, target.cy + target.height * 0.06),
                    t0 + 0.22
                )
                .add(() => {
                    if (!flyRef.el) return
                    gsap.to(flyRef.el, {
                        left: target.left,
                        top: target.top,
                        width: target.width,
                        height: target.height,
                        duration: 0.38,
                        ease: "power2.inOut",
                        onComplete: () => {
                            flyRef.el?.remove()
                            flyRef.el = null
                            slot.classList.add("is-set")
                            gsap.fromTo(
                                letter,
                                { opacity: 0, y: -10 },
                                { opacity: 1, y: 0, duration: 0.32, ease: "bounce.out" }
                            )
                        }
                    })
                }, t0 + 0.24)
                .add(clawOpen(arms), t0 + 0.58)
                .add(clawClose(arms), t0 + 0.64)

            if (motorLight) {
                tl.to(motorLight, { backgroundColor: "#ff7f00", duration: 0.08, yoyo: true, repeat: 1 }, t0 + 0.17)
            }
        })

        const end = 0.55 + letters.length * step + 0.35
        tl.to(rig, { y: -100, opacity: 0, duration: 0.5, ease: "power2.in" }, end)
            .to(rail, { opacity: 0, duration: 0.35 }, end + 0.12)
            .to(motor, { opacity: 0, duration: 0.35 }, end + 0.12)

        return true
    }

    window.SUSI_HERO_CLAW = { play: playHeroClawDrop }
})()
