// --- WiFi QR Code Generator (Neon Version - Using qrcode-generator) ---

document.addEventListener('DOMContentLoaded', () => {

    console.log("App loaded. Setting up elements...");
    // --- Element References ---
    const wifiForm = document.getElementById('wifi-form');
    const ssidInput = document.getElementById('ssid');
    const passwordInput = document.getElementById('password');
    const securitySelect = document.getElementById('security');
    const hiddenCheckbox = document.getElementById('hidden');
    const togglePasswordButton = document.getElementById('togglePassword');
    const passwordIcon = togglePasswordButton.querySelector('i');

    const qrCodeOutputContainer = document.getElementById('qrcode-output');
    const qrCodeDisplayDiv = document.getElementById('qrcode-display');
    const qrCodeDiv = document.getElementById('qrcode'); // Div contenedor para el canvas
    const qrPlaceholder = document.getElementById('qrcode-placeholder');
    const errorMessage = document.getElementById('error-message');

    const downloadPngButton = document.getElementById('download-png');
    const downloadPdfButton = document.getElementById('download-pdf');
    const hiddenDownloadLink = document.getElementById('hidden-download-link');

    // No se necesita 'qrCodeInstance' con esta librería de la misma forma
    let currentQrDataUrl = null;
    let currentSSID = '';

    // --- Event Listeners ---
    wifiForm.addEventListener('submit', (event) => {
        event.preventDefault();
        generateQrCode();
    });

    togglePasswordButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordIcon.classList.toggle('bi-eye-fill');
        passwordIcon.classList.toggle('bi-eye-slash-fill');
    });

    downloadPngButton.addEventListener('click', () => {
        if (currentQrDataUrl) {
            hiddenDownloadLink.href = currentQrDataUrl;
            const safeSSID = currentSSID.replace(/[^a-z0-9_\-]/gi, '_') || 'qrcode';
            hiddenDownloadLink.download = `wifi_${safeSSID}.png`;
            hiddenDownloadLink.click();
        } else {
            showError("Primero genera un código QR para descargarlo.");
        }
    });

    downloadPdfButton.addEventListener('click', () => {
        if (currentQrDataUrl && typeof jspdf !== 'undefined') {
            generatePdf();
        } else if (!currentQrDataUrl) {
            showError("Primero genera un código QR para exportarlo a PDF.");
        } else {
            showError("Error: La librería jsPDF no se cargó correctamente.");
            console.error("jsPDF library is not defined.");
        }
    });

    // --- Core Functions ---

    function generateQrCode() {
    // Limpiar estado anterior
    hideError();
    qrCodeDiv.innerHTML = ''; // Limpia canvas/img anterior
    qrPlaceholder.style.display = 'flex';
    qrCodeOutputContainer.classList.remove('visible');
    downloadPngButton.disabled = true;
    downloadPdfButton.disabled = true;
    currentQrDataUrl = null;
    currentSSID = '';

    // Obtener valores
    const ssid = ssidInput.value.trim();
    const password = passwordInput.value;
    const security = securitySelect.value;
    const isHidden = hiddenCheckbox.checked;

    // Validación
    if (!ssid) {
        showError("El nombre de la red (SSID) es obligatorio.");
        return;
    }
    if (security !== 'nopass' && !password) {
        showError("Se requiere contraseña para seguridad WPA/WEP.");
        return;
    }

    // Escapar caracteres especiales (Esta función parece estar bien)
    const escape = (str) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/"/g, '\\"').replace(/:/g, '\\:');
    const escapedSsid = escape(ssid);
    const escapedPassword = security === 'nopass' ? '' : escape(password);

    // --- CORRECCIÓN: Construir string WIFI con concatenación y terminación ;; ---
    let wifiString = 'WIFI:'; // Iniciar string
    wifiString += 'S:' + escapedSsid + ';';
    wifiString += 'T:' + security + ';';
    if (security !== 'nopass') {
        wifiString += 'P:' + escapedPassword + ';';
    }
    if (isHidden) {
        wifiString += 'H:true;';
    }
    wifiString += ';'; // Añadir los dos puntos y coma finales requeridos por el estándar

    // --- IMPORTANTE: Verifica esta salida en la consola (F12) ---
    console.log("WiFi String FINAL a codificar:", wifiString);
    currentSSID = ssid; // Guardar SSID para exportación

    // --- Generar QR con qrcode-generator ---
    try {
        if (typeof qrcode === 'undefined') {
            throw new Error("La librería qrcode (qrcode-generator) no está definida.");
        }
        const errorCorrectionLevel = 'M'; // Mantenemos Nivel M
        const typeNumber = 0; // Auto-detectar versión
        const qr = qrcode(typeNumber, errorCorrectionLevel);

        // Pasar el string CORRECTO a la librería
        qr.addData(wifiString);
        qr.make();

        // --- Dibujar en Canvas (sin cambios en esta parte) ---
        const qrCanvas = document.createElement('canvas');
        const desiredSizePixels = 256;
        const scale = 4;
        const canvasSize = desiredSizePixels * scale;
        renderQrToCanvas(qr, qrCanvas, canvasSize, scale); // Llama a la función de dibujo
        qrPlaceholder.style.display = 'none';
        qrCodeDiv.appendChild(qrCanvas);

        // Guardar DataURL y habilitar botones
        currentQrDataUrl = qrCanvas.toDataURL('image/png');
        if (currentQrDataUrl) {
            downloadPngButton.disabled = false;
            downloadPdfButton.disabled = false;
            qrCodeOutputContainer.classList.add('visible');
            console.log("QR Code generated and DataURL stored.");
        } else {
            throw new Error("No se pudo generar el DataURL del canvas.");
        }

    } catch (error) {
        console.error("Error generando QR:", error);
        if (error.message.toLowerCase().includes("code length overflow")) {
            showError(`Error: Los datos (SSID/Contraseña) son demasiado largos para el estándar QR. Intenta con datos más cortos.`);
        } else {
            showError(`Error al generar QR: ${error.message}`);
        }
        qrPlaceholder.style.display = 'flex';
        qrCodeOutputContainer.classList.remove('visible');
    }
}

// --- NO OLVIDES TENER TAMBIÉN LAS OTRAS FUNCIONES ---
// (renderQrToCanvas, generatePdf, showError, hideError, etc.)
// Debes reemplazar *únicamente* la función generateQrCode en tu script.js actual.
// Asegúrate de que el resto del script permanezca igual.

    // --- Función para dibujar el QR en un Canvas ---
    function renderQrToCanvas(qrModel, canvasElement, canvasSize, scaleFactor = 4) {
        const moduleCount = qrModel.getModuleCount();
        if (moduleCount === 0) return; // No hay nada que dibujar

        // Calcula el tamaño de cada "punto" (módulo) del QR en el canvas escalado
        const moduleSizeScaled = Math.floor(canvasSize / moduleCount);
         // Ajusta el tamaño real del canvas para que sea múltiplo exacto del tamaño del módulo escalado
         const actualCanvasSize = moduleSizeScaled * moduleCount;

        canvasElement.width = actualCanvasSize;
        canvasElement.height = actualCanvasSize;
        // Estilo para que visualmente ocupe el tamaño deseado (e.g., 256px)
         canvasElement.style.width = `${actualCanvasSize / scaleFactor}px`;
         canvasElement.style.height = `${actualCanvasSize / scaleFactor}px`;


        const ctx = canvasElement.getContext('2d');
        if (!ctx) return;

        // Limpiar canvas (fondo blanco)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, actualCanvasSize, actualCanvasSize);

        // Dibujar los módulos oscuros
        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qrModel.isDark(row, col)) {
                    ctx.fillRect(col * moduleSizeScaled, row * moduleSizeScaled, moduleSizeScaled, moduleSizeScaled);
                }
            }
        }
        console.log(`QR dibujado en canvas (<span class="math-inline">\{moduleCount\}x</span>{moduleCount} módulos)`);
    }


    // --- Función para generar PDF (sin cambios, ya usa currentQrDataUrl) ---
    function generatePdf() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;

            // Título
            doc.setFontSize(18); doc.setTextColor(40);
            const title = "Conéctate a nuestra red WiFi";
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, margin + 5);

            // SSID
            doc.setFontSize(12); doc.setTextColor(80);
            const safeSSID_PDF = currentSSID || '(Nombre no disponible)';
            const networkLabel = `Red: ${safeSSID_PDF}`;
            const networkLabelWidth = doc.getTextWidth(networkLabel);
            doc.text(networkLabel, (pageWidth - networkLabelWidth) / 2, margin + 15);

            // Código QR
            const qrSizeOnPdf = 80;
            const qrPosX = (pageWidth - qrSizeOnPdf) / 2;
            const qrPosY = margin + 30;
            if (currentQrDataUrl && currentQrDataUrl.startsWith('data:image')) {
                doc.addImage(currentQrDataUrl, 'PNG', qrPosX, qrPosY, qrSizeOnPdf, qrSizeOnPdf);
            } else {
                throw new Error('QR Data URL inválido para añadir a PDF.');
            }

            // Instrucciones
            doc.setFontSize(10); doc.setTextColor(100);
            const instructions = ["Instrucciones:", "1. Abre la aplicación de cámara de tu teléfono.", "2. Apunta la cámara hacia el código QR.", "3. Espera a que aparezca una notificación o botón.", "4. Toca la notificación para conectarte a la red WiFi."];
            const instructionStartY = qrPosY + qrSizeOnPdf + 15;
            doc.text(instructions, margin, instructionStartY, { align: 'left' });

            // Pie de página
            doc.setFontSize(8); doc.setTextColor(150);
            const footerText = "Generado con WiFi QR Neon Generator";
            const footerWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - (margin / 2) - 5);

            // Guardar
            const safeFileNameSSID = currentSSID.replace(/[^a-z0-9_\-]/gi, '_') || 'qrcode';
            doc.save(`wifi_${safeFileNameSSID}.pdf`);
            console.log("PDF generated successfully.");

        } catch (error) {
            console.error("Error generando PDF:", error);
            showError(`Error al generar PDF: ${error.message}.`);
        }
    }

    // --- Funciones de UI ---
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        qrCodeOutputContainer.classList.remove('visible');
        downloadPngButton.disabled = true;
        downloadPdfButton.disabled = true;
    }

    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    console.log("WiFi QR Generator Initialized (using qrcode-generator)");
}); // Fin DOMContentLoaded
