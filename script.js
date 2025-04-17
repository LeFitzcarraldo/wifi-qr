// --- WiFi QR Code Generator (Neon Version - Updated) ---

// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    console.log("App loaded. Setting up elements...");
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
            // Limpia el nombre del archivo para que sea seguro como nombre de archivo
            const safeSSID = currentSSID.replace(/[^a-z0-9_\-]/gi, '_') || 'qrcode';
            hiddenDownloadLink.download = `wifi_${safeSSID}.png`;
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

            // Limpiar instancia anterior si existe (opcional, limpiar div suele ser suficiente)
            // if (qrCodeInstance) {
            //     qrCodeInstance.clear();
            // }

            qrCodeInstance = new QRCode(qrCodeDiv, {
                text: wifiString,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                // Nivel de corrección de errores MEDIO (Solución al error overflow)
                correctLevel: QRCode.CorrectLevel.M
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
                    // Deshabilitar botones si no se obtuvo URL
                    downloadPngButton.disabled = true;
                    downloadPdfButton.disabled = true;
                }
            }, 150); // Pequeño delay para asegurar renderizado

        } catch (error) {
            console.error("Error generando QR:", error);
            // Proporcionar el mensaje de error específico de la librería si es overflow
            if (error.message.includes("code length overflow")) {
                 showError(`Error al generar QR: Los datos (SSID/Contraseña) son demasiado largos para el estándar QR. Intenta con datos más cortos.`);
            } else {
                 showError(`Error al generar QR: ${error.message}`);
            }
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

            // --- Título ---
            doc.setFontSize(18);
            doc.setTextColor(40); // Gris oscuro
            const title = "Conéctate a nuestra red WiFi";
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, margin + 5); // Centrado

            // --- Nombre de la Red (SSID) ---
            doc.setFontSize(12);
            doc.setTextColor(80); // Gris medio
            const safeSSID_PDF = currentSSID || '(Nombre no disponible)';
            const networkLabel = `Red: ${safeSSID_PDF}`;
            const networkLabelWidth = doc.getTextWidth(networkLabel);
            doc.text(networkLabel, (pageWidth - networkLabelWidth) / 2, margin + 15); // Centrado

            // --- Código QR ---
            const qrSizeOnPdf = 80; // Tamaño del QR en mm en el PDF
            const qrPosX = (pageWidth - qrSizeOnPdf) / 2; // Centrado horizontal
            const qrPosY = margin + 30; // Posición vertical

            if (currentQrDataUrl) {
                // Validar que el DataURL no esté vacío o corrupto (básico)
                 if (!currentQrDataUrl.startsWith('data:image')) {
                    throw new Error('QR Data URL inválido para añadir a PDF.');
                 }
                doc.addImage(currentQrDataUrl, 'PNG', qrPosX, qrPosY, qrSizeOnPdf, qrSizeOnPdf);
            } else {
                // Si no hay QR, mostrar mensaje en el PDF
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text("Error: No se pudo generar el código QR.", margin, qrPosY + 10);
                throw new Error('No hay QR Data URL disponible para el PDF.'); // Detener la generación del PDF
            }

            // --- Instrucciones ---
            doc.setFontSize(10);
            doc.setTextColor(100); // Gris claro
            const instructions = [
                "Instrucciones:",
                "1. Abre la aplicación de cámara de tu teléfono.",
                "2. Apunta la cámara hacia el código QR.",
                "3. Espera a que aparezca una notificación o botón.",
                "4. Toca la notificación para conectarte a la red WiFi."
            ];
            const instructionStartY = qrPosY + qrSizeOnPdf + 15; // Debajo del QR
            doc.text(instructions, margin, instructionStartY, { align: 'left' }); // Alinear a la izquierda

            // --- Pie de página opcional ---
            doc.setFontSize(8);
            doc.setTextColor(150); // Muy claro
            const footerText = "Generado con WiFi QR Neon Generator";
            const footerWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - (margin / 2) - 5); // Un poco más arriba

            // Guardar el PDF
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
