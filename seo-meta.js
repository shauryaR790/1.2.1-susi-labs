(function () {
    const SITE = {
        url: "https://susilabs.in",
        name: "SUSI LABS",
        defaultImage: "https://susilabs.in/images/hero-product-1.jpeg"
    }

    function upsertMeta(attr, key, value) {
        if (!value) return
        let el = document.querySelector(`meta[${attr}="${key}"]`)
        if (!el) {
            el = document.createElement("meta")
            el.setAttribute(attr, key)
            document.head.appendChild(el)
        }
        el.setAttribute("content", value)
    }

    function setDescription(text) {
        upsertMeta("name", "description", text)
        upsertMeta("property", "og:description", text)
        upsertMeta("name", "twitter:description", text)
    }

    function setTitle(title) {
        document.title = title
        upsertMeta("property", "og:title", title)
        upsertMeta("name", "twitter:title", title)
    }

    function setCanonical(pathOrUrl) {
        const url = pathOrUrl.startsWith("http")
            ? pathOrUrl
            : `${SITE.url}/${pathOrUrl.replace(/^\//, "")}`
        let link = document.querySelector('link[rel="canonical"]')
        if (!link) {
            link = document.createElement("link")
            link.rel = "canonical"
            document.head.appendChild(link)
        }
        link.href = url
        upsertMeta("property", "og:url", url)
    }

    function setOgImage(url, alt) {
        const image = url || SITE.defaultImage
        upsertMeta("property", "og:image", image)
        upsertMeta("name", "twitter:image", image)
        if (alt) upsertMeta("property", "og:image:alt", alt)
    }

    function setJsonLd(id, data) {
        const scriptId = `susi-jsonld-${id}`
        let script = document.getElementById(scriptId)
        if (!script) {
            script = document.createElement("script")
            script.type = "application/ld+json"
            script.id = scriptId
            document.head.appendChild(script)
        }
        script.textContent = JSON.stringify(data)
    }

    function parseInrPrice(raw) {
        const num = String(raw ?? "").replace(/[^\d.]/g, "")
        return num && Number.isFinite(Number(num)) ? num : ""
    }

    function applyProductSeo(product, imageUrl) {
        const name = product.name || "Product"
        const desc =
            String(product.description || "").trim().slice(0, 160) ||
            `Buy ${name} from SUSI LABS — custom 3D printing with premium materials, shipped across India.`
        const title = `${name} | SUSI LABS`
        const canonical = `${SITE.url}/product.html?id=${encodeURIComponent(product.id)}`
        const image = imageUrl || product.image_url || SITE.defaultImage

        setTitle(title)
        setDescription(desc)
        setCanonical(canonical)
        setOgImage(image, `${name} — SUSI LABS 3D print`)

        const offers = {
            "@type": "Offer",
            url: canonical,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: SITE.name }
        }
        const price = parseInrPrice(product.price)
        if (price) offers.price = price

        setJsonLd("product", {
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: String(product.description || "").trim() || desc,
            image,
            url: canonical,
            brand: { "@type": "Brand", name: SITE.name },
            offers
        })

        setJsonLd("breadcrumb", {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
                { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE.url}/products.html` },
                { "@type": "ListItem", position: 3, name, item: canonical }
            ]
        })
    }

    function applyProductsListSeo(products) {
        if (!products?.length) return

        setJsonLd("products-list", {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "SUSI LABS Shop",
            url: `${SITE.url}/products.html`,
            numberOfItems: products.length,
            itemListElement: products.slice(0, 100).map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${SITE.url}/product.html?id=${encodeURIComponent(product.id)}`,
                name: product.name || "Product"
            }))
        })
    }

    window.SUSI_SEO = {
        SITE,
        setTitle,
        setDescription,
        setCanonical,
        setOgImage,
        setJsonLd,
        applyProductSeo,
        applyProductsListSeo
    }
})()
