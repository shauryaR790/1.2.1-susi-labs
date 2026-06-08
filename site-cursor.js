/* =========================
   SUSI LABS — custom desktop arrow cursor
========================= */

;(function () {
    const DESKTOP_MQ = window.matchMedia("(min-width: 769px) and (pointer: fine) and (hover: hover)")
    const REDUCED_MQ = window.matchMedia("(prefers-reduced-motion: reduce)")

    function shouldEnable() {
        return DESKTOP_MQ.matches && !REDUCED_MQ.matches
    }

    function sync() {
        document.documentElement.classList.toggle("susi-custom-cursor", shouldEnable())
    }

    DESKTOP_MQ.addEventListener("change", sync)
    REDUCED_MQ.addEventListener("change", sync)

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sync, { once: true })
    } else {
        sync()
    }
})()
