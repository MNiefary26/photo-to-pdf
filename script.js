const imageInput   = document.getElementById("imageInput");
const dropzone      = document.getElementById("dropzone");
const fileStatus    = document.getElementById("fileStatus");
const previewGrid   = document.getElementById("previewGrid");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue  = document.getElementById("qualityValue");
const sizeSlider    = document.getElementById("sizeSlider");
const sizeValue     = document.getElementById("sizeValue");
const convertBtn    = document.getElementById("convertBtn");
const resultEmpty   = document.getElementById("resultEmpty");
const resultReady   = document.getElementById("resultReady");
const resultMeta    = document.getElementById("resultMeta");
const downloadLink  = document.getElementById("downloadLink");

// Each entry: { file, dataUrl }
let images = [];

/* ---------- helpers ---------- */

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function updateStatus() {
    fileStatus.textContent =
        images.length === 0
            ? "Belum ada file dipilih"
            : `${images.length} file dipilih`;

    convertBtn.disabled = images.length === 0;
    convertBtn.className = images.length === 0
        ? "w-full mt-8 py-4 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed transition-colors"
        : "w-full mt-8 py-4 rounded-lg font-semibold bg-ink text-white hover:bg-black cursor-pointer transition-colors";

    previewGrid.classList.toggle("hidden", images.length === 0);
}

function renderPreview() {
    previewGrid.innerHTML = "";

    images.forEach((entry, index) => {
        const wrap = document.createElement("div");
        wrap.className = "thumb-wrap relative aspect-square rounded-lg overflow-hidden border border-gray-200";

        const img = document.createElement("img");
        img.src = entry.dataUrl;
        img.className = "w-full h-full object-cover";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.className = "thumb-remove absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 text-white text-sm leading-none";
        removeBtn.addEventListener("click", () => {
            images.splice(index, 1);
            renderPreview();
            updateStatus();
            resetResult();
        });

        wrap.appendChild(img);
        wrap.appendChild(removeBtn);
        previewGrid.appendChild(wrap);
    });
}

function resetResult() {
    resultReady.classList.add("hidden");
    resultEmpty.classList.remove("hidden");
    if (downloadLink.href) {
        URL.revokeObjectURL(downloadLink.href);
        downloadLink.removeAttribute("href");
    }
}

function addFiles(fileList) {
    [...fileList]
        .filter(file => file.type.startsWith("image/"))
        .forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                images.push({ file, dataUrl: e.target.result });
                renderPreview();
                updateStatus();
            };
            reader.readAsDataURL(file);
        });
    resetResult();
}

/* ---------- input events ---------- */

imageInput.addEventListener("change", () => {
    addFiles(imageInput.files);
    imageInput.value = "";
});

["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    })
);

["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
    })
);

dropzone.addEventListener("drop", e => {
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});

qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
});

sizeSlider.addEventListener("input", () => {
    sizeValue.textContent = `${sizeSlider.value}%`;
});

/* ---------- canvas re-encode (applies the Kualitas slider) ---------- */

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function encodeAtQuality(img, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", quality);
}

/* ---------- convert ---------- */

convertBtn.addEventListener("click", async () => {
    if (images.length === 0) return;

    convertBtn.disabled = true;
    convertBtn.textContent = "Memproses...";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const quality    = Number(qualitySlider.value) / 100;
    const sizeRatio  = Number(sizeSlider.value) / 100;
    const margin     = 10;

    for (let i = 0; i < images.length; i++) {
        const img = await loadImage(images[i].dataUrl);
        const jpeg = encodeAtQuality(img, quality);

        const maxWidth  = (pageWidth - margin * 2) * sizeRatio;
        const maxHeight = (pageHeight - margin * 2) * sizeRatio;

        let width  = maxWidth;
        let height = (img.height * width) / img.width;

        if (height > maxHeight) {
            height = maxHeight;
            width  = (img.width * height) / img.height;
        }

        if (i > 0) pdf.addPage();

        pdf.addImage(
            jpeg,
            "JPEG",
            (pageWidth - width) / 2,
            (pageHeight - height) / 2,
            width,
            height
        );
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);

    downloadLink.href = url;
    resultMeta.textContent = `${images.length} halaman · ${formatBytes(blob.size)}`;
    resultEmpty.classList.add("hidden");
    resultReady.classList.remove("hidden");

    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to PDF";
});

updateStatus();
