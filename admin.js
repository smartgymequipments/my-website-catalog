
// Local Admin Server Config
const API_BASE = window.location.origin; // e.g. http://localhost:8000

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 2. Handle Dashboard
    if (window.location.pathname.endsWith('dashboard.html')) {
        initDashboard();
    }
});

// --- AUTHENTICATION ---

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            body: JSON.stringify({ password }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            window.location.href = 'dashboard.html';
        } else {
            if (errorMsg) {
                errorMsg.textContent = data.message;
                errorMsg.style.display = 'block';
            }
        }
    } catch (err) {
        console.error(err);
        if (errorMsg) {
            errorMsg.textContent = "Server connection failed. Is admin_server.py running?";
            errorMsg.style.display = 'block';
        }
    }
}

async function initDashboard() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'portal-access-99.html';
        return;
    }

    // Check Auth
    try {
        const res = await fetch(`${API_BASE}/api/check-auth`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status !== 200) {
            throw new Error('Unauthorized');
        }
    } catch (err) {
        logout();
        return;
    }

    // Load Data
    renderProductList();

    // Search Listener
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderProductList(e.target.value);
        });
    }

    // Form Listener
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleSaveProduct);
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'portal-access-99.html';
}

// --- DASHBOARD LOGIC ---

let allProductsCache = [];

function getAllProducts() {
    if (typeof equipmentData === 'undefined') return [];

    let products = [];
    Object.entries(equipmentData).forEach(([key, item]) => {
        products.push({ key, ...item });
    });
    return products;
}

function renderProductList(searchQuery = '') {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;

    allProductsCache = getAllProducts();

    const filtered = allProductsCache.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.subcategory || '').toLowerCase().includes(q);
    });

    tbody.innerHTML = filtered.map(p => {
        const img = (p.images && p.images.length) ? p.images[0] : 'https://placehold.co/50?text=?';
        return `
            <tr>
                <td><img src="${img}" class="product-thumbnail"></td>
                <td><strong>${p.name}</strong><br><small style="color:#64748b">${p.subcategory || ''}</small></td>
                <td>${p.category}</td>
                <td>
                    <button class="btn-primary" style="padding: 0.5rem; font-size: 0.8rem;" onclick="editProduct('${p.key}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Expose to window for HTML onclick
window.editProduct = function (key) {
    const product = allProductsCache.find(p => p.key === key);
    if (!product) return;

    document.getElementById('edit-key').value = key;
    document.getElementById('p-name').value = product.name;

    // We need to WAIT for dropdowns to load before setting value?
    // Or we set values and rely on dynamic load later?
    // Let's trigger load first.
    initProductFormDropdowns().then(async () => {
        document.getElementById('p-category').value = product.category;

        // Then load subcats
        await loadSubcatsForProductForm();
        document.getElementById('p-subcategory').value = product.subcategory;
    });

    document.getElementById('p-description').value = '';
    document.getElementById('current-image-path').textContent = 'Current Image: ' + (product.images?.[0] || 'None');

    document.getElementById('form-title').textContent = 'Edit Product';
    switchView('add-view');
};

window.logout = logout;

async function handleSaveProduct(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');

    const key = document.getElementById('edit-key').value;
    const name = document.getElementById('p-name').value;
    const category = document.getElementById('p-category').value;
    const subcategory = document.getElementById('p-subcategory').value;
    const description = document.getElementById('p-description').value;
    const imageInput = document.getElementById('p-image');

    // 1. Upload Image (if selected)
    let imagePath = null;
    if (imageInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        formData.append('category', category);
        formData.append('subcategory', subcategory);
        formData.append('name', name);

        try {
            const upRes = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const upData = await upRes.json();
            if (!upData.success) throw new Error(upData.message);
            imagePath = upData.path;
        } catch (err) {
            alert('Image Upload Failed: ' + err.message);
            return;
        }
    }

    // 2. Update Description / Metadata
    const productKey = key || name.toLowerCase().replace(/\s+/g, '-');

    try {
        const res = await fetch(`${API_BASE}/api/update-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                key: productKey,
                description: description,
                // specs: ...
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('Product Saved Locally!');
            switchView('list-view');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        alert('Save Failed');
    }
}

window.publishChanges = async function () {
    if (!confirm('This will regenerate data.js. Proceed?')) return;

    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/publish`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            alert('Success! Website data updated.');
            location.reload(); // Reload to see new data
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        alert('Publish Failed');
    }
};

window.deployToGitHub = async function () {
    if (!confirm('This will upload all changes to GitHub. Ensure you have set up Git on this computer! Proceed?')) return;

    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/deploy-github`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            alert('Success! ' + data.message);
        } else {
            alert('Details: ' + data.message);
        }
    } catch (err) {
        alert('Deploy Failed. Is Git installed?');
    }
};

// --- CATEGORY & SUB MANAGER ---

async function fetchCategoriesAPI() {
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/list-categories`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.success ? data.categories : [];
    } catch { return []; }
}

async function fetchSubCategoriesAPI(category) {
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/list-subcategories`, {
            method: 'POST',
            body: JSON.stringify({ category }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        return data.success ? data.subcategories : [];
    } catch { return []; }
}

// Render the Structure Manager (Left Side)
async function renderStructureManager() {
    const list = document.getElementById('cat-manager-list');
    if (!list) return;

    const cats = await fetchCategoriesAPI();

    list.innerHTML = cats.map(c => `
        <li style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
            <a href="#" onclick="selectCategoryForStructure('${c}')" style="flex: 1; border: none; padding: 10px; color: #94a3b8; text-decoration: none;">${c}</a>
            <button onclick="deleteCategory('${c}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 10px;">&times;</button>
        </li>
    `).join('');
}

// Select Category in Structure Manager -> Load Right Side
window.selectCategoryForStructure = async function (cat) {
    document.getElementById('selected-cat-for-sub').value = cat;
    document.getElementById('sub-manager-title').textContent = `Subcategories of: ${cat}`;
    document.getElementById('sub-manager-content').style.display = 'block';
    document.getElementById('sub-manager-placeholder').style.display = 'none';

    // Highlight
    document.querySelectorAll('#cat-manager-list a').forEach(a => a.style.color = '#94a3b8');
    // Simple active style could be added here

    const subList = document.getElementById('sub-manager-list');
    subList.innerHTML = '<li style="color: #64748b; padding: 1rem;">Loading...</li>';

    const subs = await fetchSubCategoriesAPI(cat);

    if (subs.length === 0) {
        subList.innerHTML = '<li style="color: #64748b; padding: 1rem;">No subcategories yet.</li>';
    } else {
        subList.innerHTML = subs.map(s => `
            <li style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
                <span style="padding: 1rem; color: #cbd5e1;">${s}</span>
                <button onclick="deleteSubCategory('${cat}', '${s}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 10px;">&times;</button>
            </li>
        `).join('');
    }
};

// -- Actions --

window.addCategory = async function () {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (!name) return alert('Enter a name');

    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/add-category`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ category: name })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            renderStructureManager(); // Refresh list
        } else {
            alert(data.message);
        }
    } catch (err) { alert('Failed'); }
};

window.addSubCategory = async function () {
    const cat = document.getElementById('selected-cat-for-sub').value;
    const input = document.getElementById('new-sub-name');
    const name = input.value.trim();
    if (!cat) return alert('Select a category first');
    if (!name) return alert('Enter a name');

    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/add-subcategory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ category: cat, subcategory: name })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            selectCategoryForStructure(cat); // Refresh sub list
        } else {
            alert(data.message);
        }
    } catch (err) { alert('Failed'); }
};

window.deleteCategory = async function (name) {
    if (!confirm(`Delete Category "${name}" and all contents?`)) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/delete-category`, {
            method: 'POST',
            body: JSON.stringify({ category: name }),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if ((await res.json()).success) {
            renderStructureManager();
            document.getElementById('sub-manager-content').style.display = 'none';
            document.getElementById('sub-manager-placeholder').style.display = 'block';
        } else { alert('Failed'); }
    } catch { alert('Failed'); }
};

window.deleteSubCategory = async function (cat, sub) {
    if (!confirm(`Delete Subcategory "${sub}"?`)) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE}/api/delete-subcategory`, {
            method: 'POST',
            body: JSON.stringify({ category: cat, subcategory: sub }),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if ((await res.json()).success) {
            selectCategoryForStructure(cat);
        } else { alert('Failed'); }
    } catch { alert('Failed'); }
};


// --- PRODUCT FORM DYNAMIC DROPDOWNS ---

async function initProductFormDropdowns() {
    const catSelect = document.getElementById('p-category');
    if (!catSelect) return;

    catSelect.innerHTML = '<option value="">Loading...</option>';
    const cats = await fetchCategoriesAPI();

    catSelect.innerHTML = '<option value="">Select Category...</option>' +
        cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

window.loadSubcatsForProductForm = async function () {
    const catSelect = document.getElementById('p-category');
    const subSelect = document.getElementById('p-subcategory');
    const cat = catSelect.value;

    subSelect.innerHTML = '<option value="">Loading...</option>';

    if (!cat) {
        subSelect.innerHTML = '<option value="">Select Category First</option>';
        return;
    }

    const subs = await fetchSubCategoriesAPI(cat);
    if (subs.length === 0) {
        subSelect.innerHTML = '<option value="">No subcategories found</option>';
    } else {
        subSelect.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
    }
};


// Hook switchView
const originalSwitchView = window.switchView || window.switchView; // Ensure it's defined
window.switchView = function (viewId) {
    // switchView might initially be defined inside a switchView variable or window
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    // Reset form Logic
    if (viewId === 'add-view' && !document.getElementById('edit-key').value) {
        document.getElementById('product-form').reset();
        document.getElementById('form-title').textContent = 'Add New Product';
        document.getElementById('current-image-path').textContent = '';
    }
    if (viewId === 'list-view') {
        document.getElementById('edit-key').value = '';
    }

    // New Logic
    if (viewId === 'category-view') {
        renderStructureManager();
    }
    if (viewId === 'add-view') {
        initProductFormDropdowns();
    }
};
