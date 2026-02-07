// Variables
let scanner = null;
let isScanning = false;
let scanCount = 0;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const codeInput = document.getElementById('code');
const nameInput = document.getElementById('name');
const productForm = document.getElementById('productForm');

// Debug elements
const debugCode = document.getElementById('debugCode');
const debugTime = document.getElementById('debugTime');
const debugCount = document.getElementById('debugCount');
const debugFormat = document.getElementById('debugFormat');
const scanHistory = document.getElementById('scanHistory');

// Event Listeners
startBtn.addEventListener('click', startScanner);
stopBtn.addEventListener('click', stopScanner);
productForm.addEventListener('submit', handleSubmit);

// Start Scanner
async function startScanner() {
    if (isScanning) return;
    
    try {
        // Primero obtener lista de cámaras
        const cameras = await Html5Qrcode.getCameras();
        
        if (!cameras || cameras.length === 0) {
            addToHistory('❌ No se encontraron cámaras', 'error');
            return;
        }
        
        // Buscar cámara trasera (back/rear) o usar la última
        const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('trasera')
        ) || cameras[cameras.length - 1];
        
        addToHistory(`📷 Usando: ${backCamera.label}`, 'info');
        console.log('Cámara seleccionada:', backCamera);
        console.log('Todas las cámaras:', cameras);
        
        scanner = new Html5Qrcode("reader");
        
        // Configuración SIMPLE y de ALTA CALIDAD
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            // Pedir alta resolución
            videoConstraints: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        // Usar el ID de la cámara directamente en lugar de facingMode
        await scanner.start(
            backCamera.id,  // ← CAMBIO CLAVE: usar ID directo
            config,
            onScanSuccess,
            onScanError
        );
        
        isScanning = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        
        addToHistory('✅ Escáner iniciado en ALTA calidad', 'success');
        
    } catch (err) {
        console.error('Error:', err);
        addToHistory('❌ Error: ' + err.message, 'error');
    }
}

// Stop Scanner
async function stopScanner() {
    if (!scanner || !isScanning) return;
    
    try {
        await scanner.stop();
        isScanning = false;
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        
        addToHistory('⏹️ Escáner detenido', 'info');
        
    } catch (err) {
        console.error('Error al detener:', err);
    }
}

// Callback cuando se escanea con éxito
function onScanSuccess(decodedText, decodedResult) {
    scanCount++;
    
    // Actualizar debug info
    debugCode.textContent = decodedText;
    debugTime.textContent = new Date().toLocaleTimeString();
    debugCount.textContent = scanCount;
    debugFormat.textContent = decodedResult.result.format?.formatName || 'Desconocido';
    
    // Actualizar formulario
    codeInput.value = decodedText;
    
    // Log en historial con TODOS los detalles
    const timestamp = new Date().toLocaleTimeString();
    addToHistory(
        `[${timestamp}] Código: ${decodedText} | Formato: ${decodedResult.result.format?.formatName || 'N/A'}`,
        'scan'
    );
    
    // Console log para debug
    console.log('═══════════════════════════════');
    console.log('ESCANEO #' + scanCount);
    console.log('Código:', decodedText);
    console.log('Formato:', decodedResult.result.format);
    console.log('Resultado completo:', decodedResult);
    console.log('═══════════════════════════════');
}

// Callback para errores (normalmente solo ruido)
function onScanError(errorMessage) {
    // No mostrar errores de escaneo porque son muy frecuentes
    // console.log('Scan error:', errorMessage);
}

// Handle form submit
function handleSubmit(e) {
    e.preventDefault();
    
    const code = codeInput.value;
    const name = nameInput.value;
    
    if (!code || !name) {
        addToHistory('⚠️ Completa todos los campos', 'warning');
        return;
    }
    
    addToHistory(`💾 Guardado: ${name} (${code})`, 'success');
    
    // Limpiar formulario
    nameInput.value = '';
    codeInput.value = '';
    debugCode.textContent = '-';
}

// Add message to history
function addToHistory(message, type = 'info') {
    // Si es el primer mensaje, limpiar el placeholder
    if (scanHistory.querySelector('.text-gray-500')) {
        scanHistory.innerHTML = '';
    }
    
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-300',
        error: 'bg-red-100 text-red-800 border-red-300',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        info: 'bg-blue-100 text-blue-800 border-blue-300',
        scan: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    
    const div = document.createElement('div');
    div.className = `p-3 rounded border ${colors[type] || colors.info} text-sm`;
    div.textContent = message;
    
    // Insertar al inicio
    scanHistory.insertBefore(div, scanHistory.firstChild);
    
    // Mantener solo los últimos 20
    while (scanHistory.children.length > 20) {
        scanHistory.removeChild(scanHistory.lastChild);
    }
}
