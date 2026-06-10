/* Hero profile icon — auth modal or account dashboard */

function showHeroAuthError(formId, msg) {
    const el = document.getElementById(formId === "signin" ? "hero-auth-error-signin" : "hero-auth-error-signup")
    if (!el) return
    if (msg) {
        el.textContent = msg
        el.hidden = false
    } else {
        el.textContent = ""
        el.hidden = true
    }
}

function setHeroAuthLoading(formId, loading) {
    const btn = document.getElementById(formId === "signin" ? "hero-auth-submit-signin" : "hero-auth-submit-signup")
    if (!btn) return
    btn.disabled = loading
    btn.textContent = loading
        ? formId === "signin"
            ? "Signing in…"
            : "Creating…"
        : formId === "signin"
          ? "Sign in"
          : "Create account"
}

function switchHeroAuthTab(tab) {
    const signIn = tab === "signin"
    document.getElementById("hero-auth-form-signin").hidden = !signIn
    document.getElementById("hero-auth-form-signup").hidden = signIn
    document.getElementById("hero-auth-tab-signin").classList.toggle("is-active", signIn)
    document.getElementById("hero-auth-tab-signup").classList.toggle("is-active", !signIn)
    document.getElementById("hero-auth-tab-signin").setAttribute("aria-selected", signIn ? "true" : "false")
    document.getElementById("hero-auth-tab-signup").setAttribute("aria-selected", signIn ? "false" : "true")
    showHeroAuthError("signin", "")
    showHeroAuthError("signup", "")
}

function openHeroAuthModal(tab) {
    const modal = document.getElementById("hero-auth-modal")
    const btn = document.getElementById("hero-profile-btn")
    if (!modal) return
    switchHeroAuthTab(tab || "signin")
    modal.hidden = false
    document.body.classList.add("hero-auth-open")
    if (btn) btn.setAttribute("aria-expanded", "true")
    modal.querySelector("input[name=email]")?.focus()
}

function closeHeroAuthModal() {
    const modal = document.getElementById("hero-auth-modal")
    const btn = document.getElementById("hero-profile-btn")
    if (!modal) return
    modal.hidden = true
    document.body.classList.remove("hero-auth-open")
    if (btn) btn.setAttribute("aria-expanded", "false")
}

async function refreshHeroProfileBtn() {
    const btn = document.getElementById("hero-profile-btn")
    if (!btn || !window.SUSI_AUTH) return

    try {
        const session = await window.SUSI_AUTH.getSession()
        btn.classList.toggle("profile-nav--signed-in", Boolean(session?.user))
        btn.setAttribute("aria-label", session?.user ? "Open account dashboard" : "Sign in or create account")
    } catch {
        btn.classList.remove("profile-nav--signed-in")
    }
}

async function handleProfileClick() {
    if (!window.SUSI_AUTH) {
        openHeroAuthModal("signin")
        return
    }

    try {
        const session = await window.SUSI_AUTH.getSession()
        if (session?.user) {
            window.location.href = "account.html"
            return
        }
    } catch {}

    openHeroAuthModal("signin")
}

function initHeroProfile() {
    const btn = document.getElementById("hero-profile-btn")
    const modal = document.getElementById("hero-auth-modal")
    if (!btn) return

    btn.addEventListener("click", handleProfileClick)

    modal?.querySelectorAll("[data-hero-auth-close]").forEach((el) => {
        el.addEventListener("click", closeHeroAuthModal)
    })

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal?.hidden) closeHeroAuthModal()
    })

    document.getElementById("hero-auth-tab-signin")?.addEventListener("click", () => switchHeroAuthTab("signin"))
    document.getElementById("hero-auth-tab-signup")?.addEventListener("click", () => switchHeroAuthTab("signup"))

    document.getElementById("hero-auth-form-signin")?.addEventListener("submit", async (e) => {
        e.preventDefault()
        showHeroAuthError("signin", "")
        const form = e.target
        setHeroAuthLoading("signin", true)
        try {
            await window.SUSI_AUTH.signIn(form.email.value.trim(), form.password.value)
            closeHeroAuthModal()
            window.location.href = "account.html"
        } catch (err) {
            showHeroAuthError("signin", err.message || "Could not sign in.")
        } finally {
            setHeroAuthLoading("signin", false)
        }
    })

    document.getElementById("hero-auth-form-signup")?.addEventListener("submit", async (e) => {
        e.preventDefault()
        showHeroAuthError("signup", "")
        const note = document.getElementById("hero-auth-note-signup")
        if (note) note.hidden = true

        const form = e.target
        if (form.password.value !== form.confirmPassword.value) {
            showHeroAuthError("signup", "Passwords do not match.")
            return
        }

        setHeroAuthLoading("signup", true)
        try {
            const data = await window.SUSI_AUTH.signUp(form.email.value.trim(), form.password.value)
            if (data.session) {
                await window.SUSI_AUTH.linkGuestOrders()
                closeHeroAuthModal()
                window.location.href = "account.html"
                return
            }
            if (note) {
                note.textContent = "Check your email to confirm, then sign in."
                note.hidden = false
            }
            switchHeroAuthTab("signin")
        } catch (err) {
            showHeroAuthError("signup", err.message || "Could not create account.")
        } finally {
            setHeroAuthLoading("signup", false)
        }
    })

    refreshHeroProfileBtn()
    window.SUSI_AUTH?.onAuthStateChange?.(() => refreshHeroProfileBtn())

    const params = new URLSearchParams(window.location.search)
    if (params.get("auth") === "1") {
        openHeroAuthModal(params.get("tab") === "signup" ? "signup" : "signin")
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroProfile, { once: true })
} else {
    initHeroProfile()
}

window.SUSI_HERO_PROFILE = { openHeroAuthModal, closeHeroAuthModal, refreshHeroProfileBtn }
