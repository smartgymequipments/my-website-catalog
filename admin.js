document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // bind forms
    document.getElementById('add-form').addEventListener('submit', handleAddProduct);
    document.getElementById('edit-form').addEventListener('submit', handleEditProduct);
});

// Global state
let allProducts = [];
let allFields = [];

async function loadProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">Loading products...</div>';

    // Also background load fields if not loaded
    if (allFields.length === 0) await loadFields();

    try {
        const res = await fetch('admin_backend.php?action=list_products');
        if (!res.ok) {
            if (res.status === 401) window.location.href = 'portal-access-99.php';
            throw new Error('Failed to load products');
        }
        allProducts = await res.json();

        // Apply current filter initial
        filterProducts();
    } catch (e) {
        list.innerHTML = `<div class="col-span-full text-center text-red-500">Error: ${e.message}</div>`;
    }
}

function filterProducts() {
    const category = document.getElementById('filter-category').value;
    const filtered = category === 'all'
        ? allProducts
        : allProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());

    renderProducts(filtered);
}

// --- Dynamic Text Scaling Helper ---
function fitTextToContainer(element) {
    if (!element) return;

    // Strict Uniform Sizes (Small to ensure image visibility)
    const isMobile = window.innerWidth < 768;
    let size = isMobile ? 0.65 : 0.75; // rem

    element.style.fontSize = `${size}rem`;
    element.style.lineHeight = '1.3';
    element.style.whiteSpace = 'normal';

    const parent = element.parentElement;
    if (!parent) return;

    // Constraints
    const minSize = 0.5;
    const step = 0.05;

    let safety = 0;
    while (
        (element.scrollHeight > parent.clientHeight || element.scrollWidth > parent.clientWidth) &&
        size > minSize && safety < 20
    ) {
        size -= step;
        element.style.fontSize = `${size}rem`;
        safety++;
    }
}

function renderProducts(products) {
    const list = document.getElementById('product-list');
    if (products.length === 0) {
        list.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">No products found.</div>';
        return;
    }

    list.innerHTML = products.map(p => {
        // Determine current displayed image
        // Check metadata if available, else fallback
        let imgUrl = p.images && p.images.length > 0 ? p.images[0] : 'https://placehold.co/400x400/1e293b/FFF?text=No+Image';
        if (currentThumbnailMetadata && currentThumbnailMetadata.products && currentThumbnailMetadata.products[p.key]) {
            imgUrl = currentThumbnailMetadata.products[p.key];
        }

        return `
        <div class="relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 hover:border-yellow-400/50 transition-all shadow-lg group bg-black">
            <!-- Full Image - Click to Cycle -->
            <img src="${imgUrl}" alt="${p.name}" 
                onclick='cycleProductThumbnail(event, ${JSON.stringify(p).replace(/'/g, "&#39;")})'
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100 cursor-pointer"
                title="Click to cycle thumbnail">
            
            <!-- Text Overlay -->
            <div class="absolute bottom-0 inset-x-0 p-4 flex flex-col justify-end h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                <div class="flex-1 flex items-end">
                    <h3 class="font-bold text-white dynamic-text leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style="text-shadow: 1px 1px 3px black;">${p.name}</h3>
                </div>
            </div>

            <!-- Action Buttons Overlay -->
            <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                 <button onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' 
                    class="bg-black/50 hover:bg-yellow-400 hover:text-black text-white p-2 rounded-full backdrop-blur-sm border border-white/20 transition" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                </button>
                <button onclick='openDeleteModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' 
                    class="bg-black/50 hover:bg-red-600 hover:text-white text-red-500 p-2 rounded-full backdrop-blur-sm border border-white/20 transition" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
        `;
    }).join('');

    // Apply scaling
    requestAnimationFrame(() => {
        list.querySelectorAll('.dynamic-text').forEach(el => fitTextToContainer(el));
    });
}

// --- CYCLE THUMBNAIL ---
async function cycleProductThumbnail(e, product) {
    if (!product.images || product.images.length === 0) return;

    e.stopPropagation(); // prevent other clicks
    const imgEl = e.target;

    // Find current index
    // The src might be absolute or relative, compare endsWith
    let currentSrc = imgEl.getAttribute('src');
    // Just use the logic: find match in images
    let currentIndex = product.images.findIndex(img => currentSrc.endsWith(img) || img.endsWith(currentSrc));

    if (currentIndex === -1) currentIndex = 0;

    // Next
    const nextIndex = (currentIndex + 1) % product.images.length;
    const nextImg = product.images[nextIndex];

    // Update visuals immediately (Optimistic)
    imgEl.src = nextImg;

    // Save to backend
    // Similar to setThumbnail but we hardcode type='product'
    try {
        const res = await fetch('admin_backend.php?action=set_thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'product',
                key: product.key,
                image_path: nextImg
            })
        });

        if (!res.ok) {
            // Revert on error?
            console.error("Failed to save cycled thumbnail");
        } else {
            // Update local metadata clone so re-renders are correct
            if (!currentThumbnailMetadata) currentThumbnailMetadata = {};
            if (!currentThumbnailMetadata.products) currentThumbnailMetadata.products = {};
            currentThumbnailMetadata.products[product.key] = nextImg;
        }
    } catch (err) {
        console.error("Network error cycling thumbnail");
    }
}

// --- FETCH SUBCATEGORIES ---
async function fetchSubcategories(context, categoryOverride = null) {
    const categorySelect = document.getElementById(context === 'add' ? 'add-category' : 'edit-category');
    const subcategorySelect = document.getElementById(context === 'add' ? 'add-subcategory' : 'edit-subcategory');

    const category = categoryOverride || categorySelect.value;
    if (!category) return;

    try {
        const res = await fetch(`admin_backend.php?action=subcategories&category=${encodeURIComponent(category)}`);
        const subcategories = await res.json();

        subcategorySelect.innerHTML = '<option value="General">General</option>';
        if (subcategories.length > 0) {
            subcategories.forEach(sub => {
                if (sub !== 'General') {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = sub;
                    subcategorySelect.appendChild(option);
                }
            });
        }
    } catch (e) {
        console.error('Failed to fetch subcategories', e);
        subcategorySelect.innerHTML = '<option value="General">General</option>';
    }
}


// --- DYNAMIC FIELDS HELPERS ---
async function loadFields() {
    try {
        const res = await fetch('admin_backend.php?action=get_fields');
        if (res.ok) {
            allFields = await res.json();
        }
    } catch (e) { console.error('Failed to load fields:', e); }
}

function generateDynamicFieldsHTML(productFields = null) {
    const activeFields = allFields.filter(f => f.active);
    if (activeFields.length === 0) return '';

    return activeFields.map(f => {
        const pField = productFields ? productFields[f.id] : null;
        const val = pField ? pField.value : '';
        const isActive = pField && typeof pField.active !== 'undefined' ? pField.active : true;

        return `
            <div class="dynamic-field-row" data-id="${f.id}">
                <div class="flex justify-between items-center mb-1">
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">${f.name}</label>
                    <label class="flex items-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-yellow-400">
                        <input type="checkbox" class="field-active-toggle rounded border-gray-600 bg-gray-700 text-yellow-400 focus:ring-yellow-400" ${isActive ? 'checked' : ''}>
                        <span>Show on Product Page</span>
                    </label>
                </div>
                <input type="text" class="field-value-input block w-full py-3 px-4 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 sm:text-sm" value="${val.replace(/"/g, '&quot;')}">
            </div>
        `;
    }).join('');
}

function getDynamicFieldsData(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.dynamic-field-row');
    const data = {};
    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        const isActive = row.querySelector('.field-active-toggle').checked;
        const value = row.querySelector('.field-value-input').value.trim();
        data[id] = { value, active: isActive };
    });
    return data;
}

// --- FIELDS MANAGEMENT MODAL ---
function openManageFieldsModal() {
    renderFieldsList();
    document.getElementById('fields-modal').classList.remove('hidden');
}

function closeManageFieldsModal() {
    document.getElementById('fields-modal').classList.add('hidden');
}

function renderFieldsList() {
    const list = document.getElementById('fields-list');
    if (allFields.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-500 py-4">No fields added yet.</div>';
        return;
    }

    list.innerHTML = allFields.map((f, i) => `
        <div class="flex items-center justify-between bg-black p-3 rounded border border-gray-700">
            <span class="text-white text-sm font-bold flex-1">${f.name}</span>
            <div class="flex items-center gap-3">
                <label class="flex items-center cursor-pointer" title="Toggle Field Globally">
                    <div class="relative">
                        <input type="checkbox" class="sr-only" ${f.active ? 'checked' : ''} onchange="toggleFieldActive(${i}, this.checked)">
                        <div class="block ${f.active ? 'bg-yellow-400' : 'bg-gray-600'} w-10 h-6 rounded-full transition"></div>
                        <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${f.active ? 'translate-x-4' : ''}"></div>
                    </div>
                </label>
                <button onclick="deleteField(${i})" class="text-red-500 hover:text-red-400 p-1 bg-gray-800 rounded transition" title="Delete Field">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function saveFieldsToServer() {
    try {
        await fetch('admin_backend.php?action=save_fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: allFields })
        });
    } catch (e) { console.error('Failed to save fields', e); }
}

async function addNewField() {
    const input = document.getElementById('new-field-name');
    const name = input.value.trim();
    if (!name) return;

    const id = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    allFields.push({ id, name, active: true });

    input.value = '';
    renderFieldsList();
    await saveFieldsToServer();
}

async function toggleFieldActive(index, isActive) {
    allFields[index].active = isActive;
    renderFieldsList();
    await saveFieldsToServer();
}

async function deleteField(index) {
    if (!confirm('Are you sure you want to delete this field from ALL products?')) return;
    allFields.splice(index, 1);
    renderFieldsList();
    await saveFieldsToServer();
}

// --- ADD MODAL ---
function openAddModal() {
    document.getElementById('add-modal').classList.remove('hidden');

    const container = document.getElementById('add-dynamic-fields');
    if (container) container.innerHTML = generateDynamicFieldsHTML();
}

function closeAddModal() {
    document.getElementById('add-modal').classList.add('hidden');
    document.getElementById('add-form').reset();
    document.getElementById('add-subcategory').innerHTML = '<option value="General">General</option>';
}

async function handleAddProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);

        // Append dynamic fields
        const dynamicData = getDynamicFieldsData('add-dynamic-fields');
        formData.append('fields', JSON.stringify(dynamicData));

        // PHP Backend Call
        const res = await fetch('admin_backend.php?action=add_product', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            closeAddModal();
            loadProducts();
        } else {
            const data = await res.json();
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to connect to server');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- EDIT MODAL ---
let currentEditProduct = null;
let currentThumbnailMetadata = null;

function openEditModal(product) {
    currentEditProduct = product;
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');

    document.getElementById('edit-title').value = product.name;
    document.getElementById('edit-original-folder').value = product.folder_path;

    // Set Category
    document.getElementById('edit-category').value = product.category;

    // Fetch Subcategories then set Subcategory
    fetchSubcategories('edit', product.category).then(() => {
        document.getElementById('edit-subcategory').value = product.subcategory || 'General';
    });

    // Set YouTube URL
    document.getElementById('edit-youtube-url').value = product.youtube || '';

    // Render Dynamic Fields
    const container = document.getElementById('edit-dynamic-fields');
    if (container) container.innerHTML = generateDynamicFieldsHTML(product.fields);

    fetchThumbnailMetadata().then(() => {
        renderImageGallery(product.images);
    });
}

// --- THUMBNAIL LOGIC ---
async function setThumbnail(type, key, imagePath, checkbox) {
    // Optimistic UI update: Uncheck others of same type
    // This is tricky because we don't have references to all checkboxes easily in this function context
    // So we'll reload or just let it stay. Ideally, uncheck others.

    // Actually, force single selection logic UI side
    if (checkbox.checked) {
        const modal = document.getElementById('edit-modal');
        const checkboxes = modal.querySelectorAll(`.thumb-check-${type}`);
        checkboxes.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
    } else {
        // If unchecking, do we allow 'no thumbnail'? Yes.
    }

    // Call Backend
    try {
        const res = await fetch('admin_backend.php?action=set_thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type, // 'product', 'category', 'subcategory'
                key: key,
                image_path: imagePath
            })
        });

        if (!res.ok) {
            checkbox.checked = !checkbox.checked; // Revert
            alert("Failed to save thumbnail setting.");
        }
    } catch (e) {
        checkbox.checked = !checkbox.checked;
        alert("Network error.");
    }
}


function renderImageGallery(images) {
    const list = document.getElementById('edit-image-list');
    list.innerHTML = '';

    if (!images || images.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm col-span-3">No images.</p>';
        return;
    }

    // Metadata Helpers
    const isProductThumb = (img) => currentThumbnailMetadata?.products?.[currentEditProduct.key] === img;
    const isCategoryThumb = (img) => currentThumbnailMetadata?.categories?.[currentEditProduct.category] === img;
    const isSubcatThumb = (img) => currentThumbnailMetadata?.subcategories?.[currentEditProduct.subcategory] === img;

    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col';

        // Image Top
        div.innerHTML = `
            <div class="relative group h-32 w-full bg-black">
                ${img.match(/\.(mp4|webm|ogg|mov)$/i)
                ? `<video src="${img}" class="h-full w-full object-cover" controls muted></video>`
                : `<img src="${img}" class="h-full w-full object-cover">`
            }
                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <button onclick="deleteImage('${img}')" class="bg-red-600 text-white p-1 rounded hover:bg-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    <a href="${img}" target="_blank" class="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>
            
            <!-- Checkbox Area -->
            <div class="p-2 space-y-2 text-[10px] text-gray-300 bg-gray-900 border-t border-gray-700">
                 <!-- Product Thumbnail -->
                 <label class="flex items-center gap-2 cursor-pointer hover:text-yellow-400">
                    <input type="checkbox" class="thumb-check-product rounded border-gray-600 bg-gray-700 text-yellow-400 focus:ring-yellow-400"
                        ${isProductThumb(img) ? 'checked' : ''}
                        onchange="setThumbnail('product', '${currentEditProduct.key}', '${img}', this)">
                    <span>Product Thumb</span>
                 </label>
                 
                 <!-- Category Thumbnail -->
                 <label class="flex items-center gap-2 cursor-pointer hover:text-yellow-400">
                    <input type="checkbox" class="thumb-check-category rounded border-gray-600 bg-gray-700 text-yellow-400 focus:ring-yellow-400"
                        ${isCategoryThumb(img) ? 'checked' : ''}
                        onchange="setThumbnail('category', '${currentEditProduct.category}', '${img}', this)">
                    <span>Category Thumb</span>
                 </label>
                 
                 <!-- Subcategory Thumbnail -->
                 <label class="flex items-center gap-2 cursor-pointer hover:text-yellow-400">
                    <input type="checkbox" class="thumb-check-subcategory rounded border-gray-600 bg-gray-700 text-yellow-400 focus:ring-yellow-400"
                        ${isSubcatThumb(img) ? 'checked' : ''}
                        onchange="setThumbnail('subcategory', '${currentEditProduct.subcategory}', '${img}', this)">
                    <span>Subcat Thumb</span>
                 </label>
            </div>
        `;
        list.appendChild(div);
    });

    // Note: We are NOT pre-filling the checkboxes because we don't have the metadata loaded here yet.
    // Ideally we should fetch metadata and check the boxes.
    // For now, let's trigger a fetch for metadata or assume the user just sets them.
    // Better: Fetch metadata for this product context.
    fetchThumbnailMetadata();
}

async function fetchThumbnailMetadata() {
    try {
        const res = await fetch('admin_backend.php?action=get_thumbnail_metadata');
        if (res.ok) {
            currentThumbnailMetadata = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch metadata", e);
    }
}

async function uploadNewImage() {
    const fileInput = document.getElementById('new-image-input');
    if (!fileInput.files.length) return;

    const btn = document.querySelector('#edit-modal button.bg-blue-600');
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('images[]', fileInput.files[i]);
        }
        formData.append('folder_path', currentEditProduct.folder_path);

        // PHP Backend Call
        const res = await fetch('admin_backend.php?action=add_image', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            await loadProducts();
            // Refresh logic
            const listRes = await fetch('admin_backend.php?action=list_products');
            const products = await listRes.json();
            const updated = products.find(p => p.folder_path === currentEditProduct.folder_path);

            if (updated) {
                currentEditProduct = updated;
                renderImageGallery(updated.images);
                fileInput.value = '';
            }
        } else {
            try {
                const data = await res.json();
                alert('Failed to upload: ' + (data.error || 'Unknown error'));
            } catch (jsonErr) {
                alert('Failed to upload: Server returned invalid JSON');
            }
        }
    } catch (e) {
        console.error(e);
        alert('Error uploading');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function deleteImage(imagePath) {
    if (!confirm('Delete this image?')) return;

    try {
        const res = await fetch('admin_backend.php?action=delete_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: imagePath })
        });

        if (res.ok) {
            const listRes = await fetch('admin_backend.php?action=list_products');
            const products = await listRes.json();
            const updated = products.find(p => p.folder_path === currentEditProduct.folder_path);

            if (updated) {
                currentEditProduct = updated;
                renderImageGallery(updated.images);
                renderProducts(products);
            }
        } else {
            alert('Failed to delete');
        }
    } catch (e) {
        console.error(e);
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-form').reset();
    currentEditProduct = null;
}

async function handleEditProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);

        // Append dynamic fields
        const dynamicData = getDynamicFieldsData('edit-dynamic-fields');
        formData.append('fields', JSON.stringify(dynamicData));

        // PHP Backend Call
        const res = await fetch('admin_backend.php?action=edit_product', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            closeEditModal();
            loadProducts();
        } else {
            const data = await res.json();
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to connect to server');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- DELETE MODAL ---
function openDeleteModal(product) {
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('delete-product-name').textContent = product.name;
    document.getElementById('delete-folder-path').value = product.folder_path;
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
    const folderPath = document.getElementById('delete-folder-path').value;
    const btn = document.querySelector('#delete-modal button.bg-red-600');
    const originalText = btn.textContent;
    btn.textContent = 'Deleting...';
    btn.disabled = true;

    try {
        const res = await fetch('admin_backend.php?action=delete_product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: folderPath })
        });

        if (res.ok) {
            closeDeleteModal();
            loadProducts();
        } else {
            const data = await res.json();
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to connect to server');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function logout() {
    await fetch('admin_backend.php?action=logout');
    window.location.href = 'portal-access-99.php';
}
