// App State
let html5QrCode = null;
let isScanning = false;

// DOM Elements
const reader = document.getElementById('reader');
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const productForm = document.getElementById('productForm');
const codeInput = document.getElementById('code');
const nameInput = document.getElementById('name');
const priceInput = document.getElementById('price');
const clearFormBtn = document.getElementById('clearFormBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const productsList = document.getElementById('productsList');
const emptyState = document.getElementById('emptyState');
const alertArea = document.getElementById('alertArea');
const totalProducts = document.getElementById('totalProducts');
const totalValue = document.getElementById('totalValue');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateStatistics();
});

// Scanner Functions
startScanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', stopScanner);

function startScanner() {
    if (isScanning) return;

    html5QrCode = new Html5Qrcode("reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        // Configuración mejorada para mejor calidad
        videoConstraints: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 },
            facingMode: "environment",
            focusMode: "continuous"
        },
        // Configurar para evitar borrosidad
        disableFlip: false
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
    ).then(() => {
        isScanning = true;
        startScanBtn.classList.add('hidden');
        stopScanBtn.classList.remove('hidden');
        showAlert('Escáner activado. Apunta la cámara al código de barras', 'info');
    }).catch(err => {
        console.error('Error al iniciar el escáner:', err);
        showAlert('Error al iniciar la cámara. Verifica los permisos.', 'error');
    });
}

function stopScanner() {
    if (!html5QrCode || !isScanning) return;

    html5QrCode.stop().then(() => {
        isScanning = false;
        startScanBtn.classList.remove('hidden');
        stopScanBtn.classList.add('hidden');
        showAlert('Escáner detenido', 'info');
    }).catch(err => {
        console.error('Error al detener el escáner:', err);
    });
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('Código escaneado:', decodedText);
    
    // Set the code in the input field
    codeInput.value = decodedText;
    
    // Check if product already exists
    const products = getProducts();
    const existingProduct = products.find(p => p.code === decodedText);
    
    if (existingProduct) {
        showAlert(`⚠️ El producto "${existingProduct.name}" con código ${decodedText} ya está registrado`, 'warning');
        // Stop scanner automatically when duplicate is found
        stopScanner();
    } else {
        showAlert(`✓ Código ${decodedText} escaneado correctamente. Completa la información del producto.`, 'success');
        // Focus on name input
        nameInput.focus();
    }
}

function onScanError(errorMessage) {
    // Ignore scan errors (they happen frequently while scanning)
    // console.log('Scan error:', errorMessage);
}

// Form Functions
productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProduct();
});

clearFormBtn.addEventListener('click', () => {
    productForm.reset();
    showAlert('Formulario limpiado', 'info');
});

function saveProduct() {
    const code = codeInput.value.trim();
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!code || !name || isNaN(price) || price < 0) {
        showAlert('Por favor completa todos los campos correctamente', 'error');
        return;
    }

    const products = getProducts();
    
    // Check if product with this code already exists
    const existingProduct = products.find(p => p.code === code);
    
    if (existingProduct) {
        showAlert(`❌ El producto con código ${code} ya existe: "${existingProduct.name}"`, 'error');
        return;
    }

    // Create new product
    const newProduct = {
        id: Date.now().toString(),
        code: code,
        name: name,
        price: price,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    products.push(newProduct);
    localStorage.setItem('products', JSON.stringify(products));

    // Reset form
    productForm.reset();
    
    // Reload products list
    loadProducts();
    updateStatistics();
    
    showAlert(`✅ Producto "${name}" guardado exitosamente`, 'success');
    
    // If scanner is running, stop it
    if (isScanning) {
        stopScanner();
    }
}

// LocalStorage Functions
function getProducts() {
    const products = localStorage.getItem('products');
    return products ? JSON.parse(products) : [];
}

function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    let products = getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
    
    loadProducts();
    updateStatistics();
    showAlert('Producto eliminado', 'success');
}

clearAllBtn.addEventListener('click', () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los productos? Esta acción no se puede deshacer.')) return;
    
    localStorage.removeItem('products');
    loadProducts();
    updateStatistics();
    showAlert('Todos los productos han sido eliminados', 'success');
});

// Display Functions
function loadProducts() {
    const products = getProducts();
    
    if (products.length === 0) {
        productsList.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    productsList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Sort by most recent first
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    productsList.innerHTML = products.map(product => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 text-lg">${escapeHtml(product.name)}</h3>
                    <p class="text-gray-600 text-sm mt-1">
                        <span class="font-medium">Código:</span> ${escapeHtml(product.code)}
                    </p>
                    <p class="text-green-600 font-bold text-lg mt-2">$${product.price.toFixed(2)}</p>
                    <p class="text-gray-400 text-xs mt-2">${formatDate(product.createdAt)}</p>
                </div>
                <button onclick="deleteProduct('${product.id}')" 
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 ml-4">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function updateStatistics() {
    const products = getProducts();
    const total = products.length;
    const totalVal = products.reduce((sum, p) => sum + p.price, 0);
    
    totalProducts.textContent = total;
    totalValue.textContent = `$${totalVal.toFixed(2)}`;
}

function showAlert(message, type = 'info') {
    const alertColors = {
        success: 'bg-green-100 border-green-500 text-green-700',
        error: 'bg-red-100 border-red-500 text-red-700',
        warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
        info: 'bg-blue-100 border-blue-500 text-blue-700'
    };
    
    const alertIcons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const alert = document.createElement('div');
    alert.className = `${alertColors[type]} border-l-4 p-4 rounded-lg shadow-md mb-4`;
    alert.innerHTML = `
        <div class="flex justify-between items-center">
            <p class="font-medium">${alertIcons[type]} ${escapeHtml(message)}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="text-xl font-bold ml-4">×</button>
        </div>
    `;
    
    alertArea.innerHTML = '';
    alertArea.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
