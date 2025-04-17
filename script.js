// --- WiFi QR Code Generator (Neon Version) ---

// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const wifiForm = document.getElementById('wifi-form');
    const ssidInput = document.getElementById('ssid');
    const passwordInput = document.getElementById('password');
    const securitySelect = document.getElementById('security');
    const hiddenCheckbox = document.getElementById('hidden');
    const togglePasswordButton = document.getElementById('togglePassword');
    const passwordIcon = togglePasswordButton.querySelector('i'); // Icono dentro del botón

    const qrCodeOutputContainer = document.getElementById('qrcode-output');
    const qrCodeDisplayDiv = document.getElementById('qrcode-display'); // Contenedor blanco del QR
    const qrCodeDiv = document.getElementById('qrcode'); // Div específico para la librería
    const qrPlaceholder = document.getElementById('qrcode-placeholder');
    const errorMessage = document.getElementById('error-message');

    const downloadPngButton = document.getElementById('download-png');
    const downloadPdfButton = document.getElementById('download-pdf');
    const hiddenDownloadLink = document.getElementById('hidden-download-link'); // Enlace oculto para PNG

    let qrCodeInstance = null; // Almacena la instancia de QRCode.js
    let currentQrDataUrl = null; // Almacena el DataURL del QR generado (para PDF/PNG)
    let currentSSID = ''; // Almacena el SSID actual para el PDF

    // --- Event Listeners ---

    // Generar QR al enviar formulario
    wifiForm.addEventListener('submit', (event) => {
        event.preventDefault();
        generateQrCode();
    });

    // Toggle visibilidad contraseña
    togglePasswordButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        // Cambiar icono
        passwordIcon.classList.toggle('bi-eye-fill');
        passwordIcon.classList.toggle('bi-eye-slash-fill');
    });

    // Descargar PNG
    downloadPngButton.addEventListener('click', () => {
        if (currentQrDataUrl) {
            hiddenDownloadLink.href = currentQrDataUrl;
            hiddenDownloadLink.download = `wifi_${currentSSID || 'qrcode'}.png`;
            hiddenDownloadLink.click(); // Simula clic en el enlace oculto
        } else {
            showError("Primero genera un código QR para descargarlo.");
        }
    });

    // Descargar PDF
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
        qrCodeDiv.innerHTML = ''; // Limpia QR anterior
        qrPlaceholder.style.display = 'flex'; // Muestra placeholder (flex para centrar icono)
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

        // Escapar caracteres especiales
        const escape = (str) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/"/g, '\\"').replace(/:/g, '\\:');
        const escapedSsid = escape(ssid);
        const escapedPassword = security === 'nopass' ? '' : escape(password);

        // Construir string WIFI
        let wifiString = `WIFI:S:${escapedSsid};T:${security};`;
        if (security !== 'nopass') wifiString += `P:${escapedPassword};`;
        if (isHidden) wifiString += `H:true;`;
        wifiString += ';';

        console.log("WiFi String:", wifiString);
        currentSSID = ssid; // Guardar SSID para exportación

        // Generar QR con la librería
        try {
            if (typeof QRCode === 'undefined') {
                throw new Error("La librería QRCode no está definida.");
            }

            qrPlaceholder.style.display = 'none'; // Ocultar placeholder

            qrCodeInstance = new QRCode(qrCodeDiv, {
                text: wifiString,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Hacer visible el contenedor con transición
            qrCodeOutputContainer.classList.add('visible');

            // Habilitar botones y guardar DataURL después de que se dibuje
            setTimeout(() => {
                const canvas = qrCodeDiv.querySelector('canvas');
                const img = qrCodeDiv.querySelector('img');
                if (canvas) {
                    currentQrDataUrl = canvas.toDataURL('image/png');
                } else if (img) {
                    currentQrDataUrl = img.src; // IMG src ya es DataURL
                }

                if (currentQrDataUrl) {
                    downloadPngButton.disabled = false;
                    downloadPdfButton.disabled = false;
                    console.log("QR Code generated and DataURL stored.");
                } else {
                    console.warn("Could not get DataURL from generated QR Code.");
                     showError("No se pudo obtener la imagen del QR generado.");
                }
            }, 150); // Pequeño delay

        } catch (error) {
            console.error("Error generando QR:", error);
            showError(`Error al generar QR: ${error.message}`);
            qrPlaceholder.style.display = 'flex'; // Mostrar placeholder en error
            qrCodeOutputContainer.classList.remove('visible');
        }
    }

    function generatePdf() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait', // p o portrait
                unit: 'mm',             // unidades
                format: 'a4'            // tamaño
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20; // Margen en mm
            const contentWidth = pageWidth - (margin * 2);
            // const contentHeight = pageHeight - (margin * 2); // No usado directamente ahora

            // --- Título ---
            doc.setFontSize(18);
            doc.setTextColor(40); // Gris oscuro
             const title = "Conéctate a nuestra red WiFi";
             const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, margin + 5);

            // --- Nombre de la Red (SSID) ---
             doc.setFontSize(12);
             doc.setTextColor(80); // Gris medio
             const networkLabel = `Red: ${currentSSID || '(Nombre no disponible)'}`;
             const networkLabelWidth = doc.getTextWidth(networkLabel);
             doc.text(networkLabel, (pageWidth - networkLabelWidth) / 2, margin + 15);

            // --- Código QR ---
            const qrSizeOnPdf = 80; // Tamaño del QR en mm en el PDF (ajustable)
            const qrPosX = (pageWidth - qrSizeOnPdf) / 2; // Centrado horizontal
            const qrPosY = margin + 30; // Posición vertical (debajo del texto)

            if (currentQrDataUrl) {
                doc.addImage(currentQrDataUrl, 'PNG', qrPosX, qrPosY, qrSizeOnPdf, qrSizeOnPdf);
            } else {
                 doc.text("Error: No se pudo cargar el código QR.", margin, qrPosY + qrSizeOnPdf / 2);
            }

            // --- Instrucciones ---
            doc.setFontSize(10);
            doc.setTextColor(100); // Gris claro
            const instructions = [
                "Instrucciones:",
                "1. Abre la cámara de tu teléfono.",
                "2. Apunta al código QR.",
                "3. Toca la notificación para conectarte."
            ];
             const instructionStartY = qrPosY + qrSizeOnPdf + 15; // Debajo del QR
             doc.text(instructions, margin, instructionStartY);


             // --- Pie de página opcional ---
             doc.setFontSize(8);
             doc.setTextColor(150); // Muy claro
             const footerText = "Generado con WiFi QR Neon Generator";
             const footerWidth = doc.getTextWidth(footerText);
             doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - margin / 2);


            // Guardar el PDF
            doc.save(`wifi_${currentSSID || 'qrcode'}.pdf`);
            console.log("PDF generated successfully.");

        } catch (error) {
            console.error("Error generando PDF:", error);
            showError(`Error al generar PDF: ${error.message}. Asegúrate que jsPDF cargó.`);
        }
    }

    // --- Funciones de UI ---
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        qrCodeOutputContainer.classList.remove('visible'); // Ocultar si hay error
        downloadPngButton.disabled = true;
        downloadPdfButton.disabled = true;
    }

    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    console.log("WiFi QR Generator Initialized");
}); // Fin DOMContentLoaded
