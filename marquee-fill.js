/* Fill hero/product tickers so the strip is seamless and scrolls at hero speed */

;(function () {
    let timer

    function fillMarquee() {
        const track = document.querySelector(".print-marquee--hero .print-marquee-track")
        if (!track) return

        const blocks = [...track.querySelectorAll(".print-marquee-content")]
        const source = blocks[0]
        if (!source) return

        const pairCount = Math.floor(source.children.length / 2)
        if (!pairCount) return

        const pairs = []
        for (let i = 0; i < pairCount; i++) {
            pairs.push([source.children[i * 2], source.children[i * 2 + 1]])
        }

        let guard = 0
        while (source.scrollWidth < window.innerWidth * 1.2 && guard < 48) {
            pairs.forEach(([item, dot]) => {
                if (item) source.appendChild(item.cloneNode(true))
                if (dot) source.appendChild(dot.cloneNode(true))
            })
            guard++
        }

        blocks.slice(1).forEach((block) => {
            block.innerHTML = source.innerHTML
        })
    }

    function scheduleFill() {
        clearTimeout(timer)
        timer = setTimeout(fillMarquee, 80)
    }

    window.SUSI_MARQUEE_FILL = { fill: fillMarquee, schedule: scheduleFill }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fillMarquee, { once: true })
    } else {
        fillMarquee()
    }

    window.addEventListener("load", fillMarquee)
    window.addEventListener("resize", scheduleFill)
})()
