/* Login / sign-up page */

function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search)
    const target = params.get("redirect") || "account.html"
    if (!target || target.includes("://") || target.startsWith("//")) return "account.html"
    return target
}

function showAuthError(formId, msg) {
    const el = document.getElementById(formId === "signin" ? "auth-error-signin" : "auth-error-signup")
    if (!el) return
    if (msg) {
        el.textContent = msg
        el.hidden = false
    } else {
        el.textContent = ""
        el.hidden = true
    }
}

function setLoading(formId, loading) {
    const btn = document.getElementById(formId === "signin" ? "auth-submit-signin" : "auth-submit-signup")
    if (!btn) return
    btn.disabled = loading
    if (formId === "signin") {
        btn.textContent = loading ? "Signing in…" : "Sign in"
    } else {
        btn.textContent = loading ? "Creating…" : "Create account"
    }
}

function switchTab(tab) {
    const signIn = tab === "signin"
    document.getElementById("auth-form-signin").hidden = !signIn
    document.getElementById("auth-form-signup").hidden = signIn
    document.getElementById("auth-tab-signin").classList.toggle("is-active", signIn)
    document.getElementById("auth-tab-signup").classList.toggle("is-active", !signIn)
    document.getElementById("auth-tab-signin").setAttribute("aria-selected", signIn ? "true" : "false")
    document.getElementById("auth-tab-signup").setAttribute("aria-selected", signIn ? "false" : "true")
    showAuthError("signin", "")
    showAuthError("signup", "")
}

async function initAuthPage() {
    if (!window.SUSI_AUTH) {
        showAuthError("signin", "Account sign-in is not configured yet.")
        return
    }

    try {
        const session = await window.SUSI_AUTH.getSession()
        if (session?.user) {
            window.location.replace(getRedirectTarget())
            return
        }
    } catch {}

    document.getElementById("auth-tab-signin")?.addEventListener("click", () => switchTab("signin"))
    document.getElementById("auth-tab-signup")?.addEventListener("click", () => switchTab("signup"))

    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "signup") switchTab("signup")

    document.getElementById("auth-form-signin")?.addEventListener("submit", async (e) => {
        e.preventDefault()
        showAuthError("signin", "")
        const form = e.target
        const email = form.email.value.trim()
        const password = form.password.value

        setLoading("signin", true)
        try {
            await window.SUSI_AUTH.signIn(email, password)
            window.location.href = getRedirectTarget()
        } catch (err) {
            showAuthError("signin", err.message || "Could not sign in.")
        } finally {
            setLoading("signin", false)
        }
    })

    document.getElementById("auth-form-signup")?.addEventListener("submit", async (e) => {
        e.preventDefault()
        showAuthError("signup", "")
        const note = document.getElementById("auth-note-signup")
        if (note) note.hidden = true

        const form = e.target
        const email = form.email.value.trim()
        const password = form.password.value
        const confirm = form.confirmPassword.value

        if (password !== confirm) {
            showAuthError("signup", "Passwords do not match.")
            return
        }
        if (password.length < 8) {
            showAuthError("signup", "Password must be at least 8 characters.")
            return
        }

        setLoading("signup", true)
        try {
            const data = await window.SUSI_AUTH.signUp(email, password)
            if (data.session) {
                await window.SUSI_AUTH.linkGuestOrders()
                window.location.href = getRedirectTarget()
                return
            }
            if (note) {
                note.textContent = "Check your email to confirm your account, then sign in."
                note.hidden = false
            }
            switchTab("signin")
        } catch (err) {
            showAuthError("signup", err.message || "Could not create account.")
        } finally {
            setLoading("signup", false)
        }
    })
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuthPage, { once: true })
} else {
    initAuthPage()
}
