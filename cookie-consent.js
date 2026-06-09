/* Cookie consent — shown once until Accept or Deny */

;(function () {
    const STORAGE_KEY = "susi:cookieConsent"

    try {
        if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
        return
    }

    function dismiss(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value)
        } catch {}
        banner.classList.add("cookie-banner--hide")
        window.setTimeout(() => banner.remove(), 320)
    }

    const banner = document.createElement("div")
    banner.className = "cookie-banner"
    banner.setAttribute("role", "dialog")
    banner.setAttribute("aria-label", "Cookie notice")
    banner.innerHTML =
        '<p class="cookie-banner__text">We use essential cookies and local storage to run the shop and remember your cart. See our <a href="privacy-policy.html">Privacy Policy</a>.</p>' +
        '<div class="cookie-banner__actions">' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--deny" id="cookie-deny-btn">Deny</button>' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" id="cookie-accept-btn">Accept</button>' +
        "</div>"

    document.body.appendChild(banner)

    document.getElementById("cookie-accept-btn")?.addEventListener("click", () => dismiss("accepted"))
    document.getElementById("cookie-deny-btn")?.addEventListener("click", () => dismiss("denied"))
})()
