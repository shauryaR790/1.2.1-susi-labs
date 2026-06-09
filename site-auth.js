/* SUSI LABS — Supabase Auth (email + password) */

;(function () {
    let client = null

    function requireConfig() {
        if (!window.SUSI_SUPABASE?.url || !window.SUSI_SUPABASE?.anonKey) {
            throw new Error("Supabase is not configured on this site.")
        }
    }

    function getClient() {
        requireConfig()
        if (!client) {
            if (!window.supabase?.createClient) {
                throw new Error("Supabase client library not loaded.")
            }
            client = window.supabase.createClient(window.SUSI_SUPABASE.url, window.SUSI_SUPABASE.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            })
        }
        return client
    }

    async function getSession() {
        const { data } = await getClient().auth.getSession()
        return data.session
    }

    async function getAccessToken() {
        const session = await getSession()
        return session?.access_token || null
    }

    async function getUser() {
        const session = await getSession()
        return session?.user || null
    }

    async function signUp(email, password) {
        const { data, error } = await getClient().auth.signUp({
            email: String(email).trim(),
            password
        })
        if (error) throw error
        return data
    }

    async function signIn(email, password) {
        const { data, error } = await getClient().auth.signInWithPassword({
            email: String(email).trim(),
            password
        })
        if (error) throw error
        await linkGuestOrders()
        return data
    }

    async function signOut() {
        const { error } = await getClient().auth.signOut()
        if (error) throw error
    }

    async function linkGuestOrders() {
        const token = await getAccessToken()
        if (!token) return

        try {
            await fetch("/api/link-orders", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })
        } catch (err) {
            console.warn("[SUSI] link orders:", err)
        }
    }

    function onAuthStateChange(callback) {
        return getClient().auth.onAuthStateChange((_event, session) => {
            callback(session)
        })
    }

    async function refreshNavLinks() {
        const session = await getSession()
        const signedIn = Boolean(session?.user)

        document.querySelectorAll("[data-auth-show='signed-in']").forEach((el) => {
            el.hidden = !signedIn
        })
        document.querySelectorAll("[data-auth-show='signed-out']").forEach((el) => {
            el.hidden = signedIn
        })
    }

    function initNavAuth() {
        refreshNavLinks().catch(() => {})
        try {
            onAuthStateChange(() => {
                refreshNavLinks().catch(() => {})
            })
        } catch {}
    }

    window.SUSI_AUTH = {
        getClient,
        getSession,
        getAccessToken,
        getUser,
        signUp,
        signIn,
        signOut,
        linkGuestOrders,
        onAuthStateChange,
        refreshNavLinks,
        initNavAuth
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavAuth, { once: true })
    } else {
        initNavAuth()
    }
})()
