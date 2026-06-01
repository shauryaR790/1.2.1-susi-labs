/* =========================
   CUSTOM BUILD PAGE
========================= */

const TOTAL_STEPS = 4
const MAX_FILES = 5
const MAX_FILE_BYTES = 4 * 1024 * 1024

const ALLOWED_EXT = [
    "stl",
    "obj",
    "3mf",
    "step",
    "stp",
    "png",
    "jpg",
    "jpeg",
    "pdf",
    "zip",
    "rar",
    "gif",
    "webp"
]

let currentStep = 1
let selectedFiles = []

function $(sel) {
    return document.querySelector(sel)
}

function showError(msg) {
    const el = $("#custom-build-error")
    if (!el) return
    if (msg) {
        el.textContent = msg
        el.hidden = false
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    } else {
        el.textContent = ""
        el.hidden = true
    }
}

function getRadio(form, name) {
    const el = form.querySelector(`input[name="${name}"]:checked`)
    return el ? el.value : ""
}

function syncCardSelection(containerSelector, inputSelector) {
    document.querySelectorAll(containerSelector).forEach((container) => {
        container.querySelectorAll(inputSelector).forEach((input) => {
            const parent = input.closest("label")
            if (!parent) return
            const onChange = () => {
                container.querySelectorAll("label").forEach((l) => l.classList.remove("is-selected"))
                if (input.checked) parent.classList.add("is-selected")
            }
            input.addEventListener("change", onChange)
        })
    })
}

function validateStep(step) {
    const form = $("#custom-build-form")
    if (!form) return false

    if (step === 1) {
        const name = form.projectName.value.trim()
        if (!name) {
            showError("Add a project name.")
            form.projectName.focus()
            return false
        }
        if (!getRadio(form, "category")) {
            showError("Pick a category.")
            return false
        }
    }

    if (step === 2) {
        if (!getRadio(form, "material")) {
            showError("Pick a material.")
            return false
        }
        if (!getRadio(form, "color")) {
            showError("Pick a color.")
            return false
        }
        const qty = Number(form.quantity.value)
        if (!Number.isFinite(qty) || qty < 1) {
            showError("Enter a valid quantity.")
            return false
        }
    }

    if (step === 4) {
        if (!form.contactName.value.trim()) {
            showError("Add your name.")
            form.contactName.focus()
            return false
        }
        if (!form.email.checkValidity()) {
            showError("Enter a valid email.")
            form.email.focus()
            return false
        }
        if (form.phone.value.trim().length < 8) {
            showError("Enter a valid phone number.")
            form.phone.focus()
            return false
        }
    }

    showError("")
    return true
}

function updateProgressUI() {
    const fill = document.querySelector("[data-progress-fill]")
    if (fill) {
        fill.style.width = `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`
    }

    document.querySelectorAll("[data-step-label]").forEach((li) => {
        const n = Number(li.getAttribute("data-step-label"))
        li.classList.toggle("is-active", n === currentStep)
        li.classList.toggle("is-done", n < currentStep)
    })

    document.querySelectorAll(".custom-build-step").forEach((section) => {
        const n = Number(section.getAttribute("data-step"))
        const active = n === currentStep
        section.classList.toggle("is-active", active)
        section.hidden = !active
    })

    const prev = $("#cb-prev")
    const next = $("#cb-next")
    const submit = $("#cb-submit")

    if (prev) prev.hidden = currentStep === 1
    if (next) next.hidden = currentStep === TOTAL_STEPS
    if (submit) submit.hidden = currentStep !== TOTAL_STEPS

    if (currentStep === TOTAL_STEPS) renderSummary()
}

function labelCategory(v) {
    return v || "—"
}

function labelUrgency(v) {
    const map = {
        standard: "standard (5–7 days)",
        express: "express (2–3 days)",
        rush: "rush (24 hours)"
    }
    return map[v] || v
}

function renderSummary() {
    const form = $("#custom-build-form")
    const box = $("#cb-summary")
    if (!form || !box) return

    const dims = [form.dimLength.value, form.dimWidth.value, form.dimHeight.value]
        .map((x) => x.trim())
        .filter(Boolean)
    const dimStr = dims.length ? `${dims.join(" × ")} mm` : "—"

    const files =
        selectedFiles.length > 0
            ? selectedFiles.map((f) => f.name).join(", ")
            : "none attached"

    box.innerHTML = `
        <p class="cb-summary__head">order summary</p>
        <dl class="cb-summary__grid">
            <div><dt>project</dt><dd>${escapeHtml(form.projectName.value.trim())}</dd></div>
            <div><dt>category</dt><dd>${escapeHtml(labelCategory(getRadio(form, "category")))}</dd></div>
            <div><dt>material</dt><dd>${escapeHtml(getRadio(form, "material"))}</dd></div>
            <div><dt>color</dt><dd>${escapeHtml(getRadio(form, "color"))}</dd></div>
            <div><dt>quantity</dt><dd>${escapeHtml(form.quantity.value)}</dd></div>
            <div><dt>urgency</dt><dd>${escapeHtml(labelUrgency(getRadio(form, "urgency")))}</dd></div>
            <div><dt>dimensions</dt><dd>${escapeHtml(dimStr)}</dd></div>
            <div><dt>infill</dt><dd>${escapeHtml(getRadio(form, "infill") || "—")}</dd></div>
            <div><dt>finish</dt><dd>${escapeHtml(getRadio(form, "finish") || "—")}</dd></div>
            <div><dt>budget</dt><dd>${escapeHtml(form.budgetRange.value || "—")}</dd></div>
            <div class="cb-summary__full"><dt>files</dt><dd>${escapeHtml(files)}</dd></div>
        </dl>
    `
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = String(reader.result || "")
            const base64 = result.includes(",") ? result.split(",")[1] : result
            resolve(base64)
        }
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
        reader.readAsDataURL(file)
    })
}

async function collectPayload() {
    const form = $("#custom-build-form")
    const files = []

    for (const file of selectedFiles) {
        const ext = file.name.split(".").pop()?.toLowerCase() || ""
        if (!ALLOWED_EXT.includes(ext)) {
            throw new Error(`File type not allowed: ${file.name}`)
        }
        if (file.size > MAX_FILE_BYTES) {
            throw new Error(`${file.name} is too large (max 4 MB each)`)
        }
        const content = await readFileAsBase64(file)
        files.push({ name: file.name, content })
    }

    return {
        projectName: form.projectName.value.trim(),
        description: form.description.value.trim(),
        category: getRadio(form, "category"),
        dimensions: {
            length: form.dimLength.value.trim(),
            width: form.dimWidth.value.trim(),
            height: form.dimHeight.value.trim()
        },
        referenceLink: form.referenceLink.value.trim(),
        application: form.application.value.trim(),
        material: getRadio(form, "material"),
        color: getRadio(form, "color"),
        quantity: Number(form.quantity.value),
        urgency: getRadio(form, "urgency"),
        infill: getRadio(form, "infill"),
        finish: getRadio(form, "finish"),
        budgetRange: form.budgetRange.value,
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        contactMethod: form.contactMethod.value,
        contactName: form.contactName.value.trim(),
        files
    }
}

function renderFileList() {
    const list = $("#cb-file-list")
    if (!list) return

    if (!selectedFiles.length) {
        list.hidden = true
        list.innerHTML = ""
        return
    }

    list.hidden = false
    list.innerHTML = selectedFiles
        .map(
            (file, i) =>
                `<li class="cb-file-list__item"><span>${escapeHtml(file.name)}</span><button type="button" data-remove-file="${i}" aria-label="Remove ${escapeHtml(file.name)}">×</button></li>`
        )
        .join("")

    list.querySelectorAll("[data-remove-file]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-remove-file"))
            selectedFiles.splice(idx, 1)
            renderFileList()
        })
    })
}

function addFiles(fileList) {
    for (const file of fileList) {
        if (selectedFiles.length >= MAX_FILES) {
            showError(`Maximum ${MAX_FILES} files.`)
            break
        }
        if (selectedFiles.some((f) => f.name === file.name && f.size === file.size)) continue
        selectedFiles.push(file)
    }
    renderFileList()
    showError("")
}

function initFileUpload() {
    const input = $("#cb-file-input")
    const zone = $("#cb-upload-zone")
    const browse = $("#cb-upload-browse")

    if (!input || !zone) return

    browse?.addEventListener("click", (e) => {
        e.preventDefault()
        input.click()
    })

    zone.addEventListener("click", (e) => {
        if (e.target.closest(".cb-upload__browse")) return
        input.click()
    })

    input.addEventListener("change", () => {
        addFiles(input.files)
        input.value = ""
    })

    zone.addEventListener("dragover", (e) => {
        e.preventDefault()
        zone.classList.add("is-dragover")
    })
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"))
    zone.addEventListener("drop", (e) => {
        e.preventDefault()
        zone.classList.remove("is-dragover")
        addFiles(e.dataTransfer?.files || [])
    })
}

async function submitForm(e) {
    e.preventDefault()
    if (!validateStep(4)) return

    const submit = $("#cb-submit")
    const next = $("#cb-next")

    submit.disabled = true
    if (next) next.disabled = true
    submit.textContent = "sending…"
    showError("")

    try {
        const payload = await collectPayload()
        const res = await fetch("/api/custom-build-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Could not send request")

        try {
            sessionStorage.setItem("susi:customBuildRequestId", data.requestId || "")
        } catch {}

        const ref = data.requestId ? `?ref=${encodeURIComponent(data.requestId)}` : ""
        window.location.href = `custom-build-success.html${ref}`
    } catch (err) {
        handleSubmitError(err)
        submit.disabled = false
        if (next) next.disabled = false
        submit.textContent = "send request"
    }
}

function handleSubmitError(err) {
    const msg = String(err.message || err)
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        showError("Could not reach the server. Try again or email us directly.")
    } else {
        showError(msg)
    }
}

function initCustomBuildPage() {
    const form = $("#custom-build-form")
    if (!form) return

    syncCardSelection(".cb-cards", 'input[type="radio"]')
    syncCardSelection(".cb-materials", 'input[type="radio"]')
    syncCardSelection(".cb-colors", 'input[type="radio"]')
    syncCardSelection(".cb-pills", 'input[type="radio"]')
    syncCardSelection(".cb-urgency", 'input[type="radio"]')

    initFileUpload()
    updateProgressUI()

    $("#cb-next")?.addEventListener("click", () => {
        if (!validateStep(currentStep)) return
        if (currentStep < TOTAL_STEPS) {
            currentStep++
            updateProgressUI()
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    })

    $("#cb-prev")?.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--
            updateProgressUI()
            showError("")
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    })

    form.addEventListener("submit", submitForm)
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCustomBuildPage, { once: true })
} else {
    initCustomBuildPage()
}
