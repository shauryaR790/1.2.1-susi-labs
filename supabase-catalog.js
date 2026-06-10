/* Public catalog client — always reads as anon, never uses login session */

;(function () {
    let client = null

    function getCatalogClient() {
        const cfg = window.SUSI_SUPABASE
        if (!cfg?.url || !cfg?.anonKey || cfg.anonKey === "PASTE_YOUR_ANON_KEY_HERE") {
            return null
        }
        if (!window.supabase?.createClient) {
            return null
        }
        if (!client) {
            client = window.supabase.createClient(cfg.url, cfg.anonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                    storage: {
                        getItem: () => null,
                        setItem: () => {},
                        removeItem: () => {}
                    }
                }
            })
        }
        return client
    }

    window.SUSI_SUPABASE_CATALOG = { getCatalogClient }
})()
