// Equipment Data is loaded from data.js (variable: equipmentData)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Loaded Equipment Data:", typeof equipmentData !== 'undefined' ? Object.keys(equipmentData).length : "undefined");

    if (typeof equipmentData === 'undefined') {
        console.error("equipmentData is not loaded!");
        return;
    }

    // organize data by Category -> Subcategory -> Items
    const organizedData = {};
    for (const [key, item] of Object.entries(equipmentData)) {
        // Normalizing category casing
        const catName = item.category || 'Other';
        const subName = item.subcategory || 'General';

        if (!organizedData[catName]) organizedData[catName] = {};
        if (!organizedData[catName][subName]) organizedData[catName][subName] = [];

        organizedData[catName][subName].push({ key, ...item });
    }

    // Determine Page Type
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    // Page: Home (index.html or /)
    if (path.endsWith('index.html') || path.endsWith('/')) {
        renderHomePage(organizedData);
    }
    // Page: Category (category.html)
    else if (path.endsWith('category.html')) {
        const type = urlParams.get('type');
        renderCategoryPage(organizedData, type);
    }
    // Page: Products (products.html)
    else if (path.endsWith('products.html')) {
        const type = urlParams.get('type');
        const sub = urlParams.get('sub');
        renderProductsPage(organizedData, type, sub);
    }

    // Initialize Modal Logic
    initModal();
    // Initialize Header (Search & Menu)
    initHeader(organizedData);

    // Page: Quote (quote.html)
    if (path.endsWith('quote.html')) {
        renderQuotePage(organizedData);
    }
});

function initHeader(organizedData) {
    // Menu Logic Removed as per request

    // Search Logic
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    if (!searchInput || !resultsContainer) return;

    // Flatten data for search
    let allProducts = [];
    Object.values(organizedData).forEach(cats => {
        Object.values(cats).forEach(subList => {
            subList.forEach(item => allProducts.push(item));
        });
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }

        // Broad Match Logic: Split query into words
        const tokens = query.split(/\s+/).filter(t => t.length > 0);

        const matches = allProducts.filter(p => {
            // Create a searchable string for each item
            const searchableText = `${p.name} ${p.category} ${p.subcategory}`.toLowerCase();

            // Check if ALL tokens are present in the searchable text
            return tokens.every(token => searchableText.includes(token));
        }).slice(0, 10); // Limit to 10

        if (matches.length > 0) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.innerHTML = matches.map(item => `
                <div class="search-item" onclick='openModalFromSearch(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
                    <span>${item.name}</span>
                    <span style="font-size: 0.8rem; opacity: 0.6;">${item.category}</span>
                </div>
            `).join('');
        } else {
            resultsContainer.classList.remove('hidden');
            resultsContainer.innerHTML = '<div class="search-item" style="justify-content:center;">No matches found</div>';
        }
    });

    // Close search on outside click
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}

// Helper for global access from search string
window.openModalFromSearch = function (item) {
    // Determine context: we might be on a page where openModal isn't loaded yet?
    // script.js is loaded on all pages so openModal is available.
    openModal(item);
    // Hide search results
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('search-input').value = '';
};

// --- RENDERERS ---

function renderHomePage(organizedData) {
    const showcaseContainer = document.getElementById('category-showcase');
    if (!showcaseContainer) return;

    showcaseContainer.innerHTML = '';

    const desiredCategories = [
        'Plate Loaded Equipments',
        'Selectorized Equipments',
        'Racks and rigs',
        'Multifunctional and functional equipments',
        'Weight Benches and Storage',
        'Accessories'
    ];

    const findKey = (search) => Object.keys(organizedData).find(k => k.toLowerCase() === search.toLowerCase());

    desiredCategories.forEach(label => {
        const realKey = findKey(label);

        let randomImage = 'https://placehold.co/600x800/1e293b/FFF?text=No+Image';
        if (realKey && organizedData[realKey]) {
            let allImages = [];
            Object.values(organizedData[realKey]).forEach(list => {
                list.forEach(i => { if (i.images?.length) allImages.push(i.images[0]); });
            });
            if (allImages.length > 0) {
                randomImage = allImages[Math.floor(Math.random() * allImages.length)];
            }
        }

        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => {
            if (realKey) {
                // Feature: Bypass subcategory view for Weight Benches and Storage
                if (realKey.toLowerCase() === 'weight benches and storage') {
                    window.location.href = `products.html?type=${encodeURIComponent(realKey)}&sub=all`;
                } else {
                    window.location.href = `category.html?type=${encodeURIComponent(realKey)}`;
                }
            } else {
                alert('No products found for this category.');
            }
        };

        const displayLabel = label.replace('Equipments', '').replace('and', '&').trim();

        card.innerHTML = `
            <img src="${randomImage}" alt="${displayLabel}" loading="lazy">
            <div class="card-overlay">
                <h3>${displayLabel}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;
        showcaseContainer.appendChild(card);
    });
}

function renderCategoryPage(organizedData, categoryType) {
    const grid = document.getElementById('subcategory-grid');
    const title = document.getElementById('page-title');
    if (!grid) return;

    if (!categoryType || !organizedData[categoryType]) {
        grid.innerHTML = '<p style="color:white; text-align:center;">Category not found.</p>';
        return;
    }

    title.textContent = categoryType;
    grid.innerHTML = '';

    const subcats = organizedData[categoryType];
    const sortedSubKeys = Object.keys(subcats).sort();

    sortedSubKeys.forEach(subName => {
        const items = subcats[subName];

        let randomImage = 'https://placehold.co/600x800/1e293b/FFF?text=No+Image';
        const validImages = items.map(i => i.images?.[0]).filter(Boolean);
        if (validImages.length > 0) {
            randomImage = validImages[Math.floor(Math.random() * validImages.length)];
        }

        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => {
            window.location.href = `products.html?type=${encodeURIComponent(categoryType)}&sub=${encodeURIComponent(subName)}`;
        };

        card.innerHTML = `
            <img src="${randomImage}" alt="${subName}" loading="lazy">
            <div class="card-overlay">
                <h3>${subName}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderProductsPage(organizedData, categoryType, subCategory) {
    const grid = document.getElementById('product-grid');
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    const backBtn = document.getElementById('back-button');

    if (!grid) return;

    // Check validity
    // If subCategory is 'all', we only need organizedData[categoryType]
    if (!categoryType || !subCategory) {
        grid.innerHTML = '<p style="color:white; text-align:center;">Invalid parameters.</p>';
        return;
    }

    if (subCategory !== 'all' && !organizedData[categoryType]?.[subCategory]) {
        grid.innerHTML = '<p style="color:white; text-align:center;">No products found.</p>';
        return;
    }

    // For 'all', verify category exists
    if (subCategory === 'all' && !organizedData[categoryType]) {
        grid.innerHTML = '<p style="color:white; text-align:center;">Category not found.</p>';
        return;
    }

    if (subCategory === 'all') {
        title.textContent = categoryType; // Title is the Main Category
        subtitle.textContent = 'All Products';
        if (backBtn) backBtn.href = 'index.html'; // Go back to Home
    } else {
        title.textContent = subCategory;
        subtitle.textContent = categoryType;
        if (backBtn) backBtn.href = `category.html?type=${encodeURIComponent(categoryType)}`;
    }

    grid.innerHTML = '';

    let items = [];
    if (subCategory === 'all') {
        // Flatten all subcategories
        Object.values(organizedData[categoryType]).forEach(subList => {
            items = items.concat(subList);
        });
    } else {
        items = organizedData[categoryType][subCategory];
    }

    // UPDATED: Using 'category-card' class to match home/category page style exactly
    items.forEach(item => {
        const card = document.createElement('div');
        // REUSE existing styling
        card.className = 'category-card';
        card.setAttribute('data-id', item.key);
        card.dataset.json = JSON.stringify(item);

        let imgSrc = 'https://placehold.co/400x400/1e293b/FFF?text=No+Image';
        if (item.images && item.images.length > 0) {
            imgSrc = item.images[0];
        }

        card.onclick = () => openModal(item);

        // Overlay Style Structure
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" loading="lazy" style="object-fit: contain; padding: 20px;">
            <div class="card-overlay">
                <h3>${item.name}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

// --- SHARED MODAL LOGIC ---
let currentImages = [];
let currentIndex = 0;

function initModal() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (!modalBackdrop) return;

    const modalCloseBtn = document.getElementById('modal-close');
    const prevBtn = document.getElementById('prev-img');
    const nextBtn = document.getElementById('next-img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const modalImage = document.getElementById('modal-img');

    // Close Events
    const closeModal = () => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => modalBackdrop.classList.add('hidden'), 300);
        document.body.style.overflow = '';
        currentImages = []; // Clear
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    // Carousel Events
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (modalBackdrop.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        }
    });

    // Lightbox
    if (lightbox && modalImage) {
        modalImage.addEventListener('click', () => {
            if (currentImages.length > 0) {
                if (lightboxImg) lightboxImg.src = currentImages[currentIndex];
                lightbox.classList.remove('hidden');
                setTimeout(() => lightbox.classList.add('active'), 10);
            }
        });
    }
    if (lightboxClose) {
        lightboxClose.addEventListener('click', (e) => {
            e.stopPropagation();
            lightbox.classList.remove('active');
            setTimeout(() => lightbox.classList.add('hidden'), 300);
        });
    }
}

function openModal(item) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');

    if (!modalBackdrop) return;

    modalTitle.textContent = item.name;
    modalCategory.textContent = item.category;

    currentImages = (item.images && item.images.length > 0)
        ? item.images
        : ['https://placehold.co/600x400?text=No+Image'];
    currentIndex = 0;

    updateCarousel();

    modalBackdrop.classList.remove('hidden');
    void modalBackdrop.offsetWidth;
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateCarousel() {
    const modalImage = document.getElementById('modal-img');
    const prevBtn = document.getElementById('prev-img');
    const nextBtn = document.getElementById('next-img');
    const dotsContainer = document.getElementById('carousel-dots');

    if (!modalImage) return;

    modalImage.src = currentImages[currentIndex];

    const hasMultiple = currentImages.length > 1;
    if (prevBtn) prevBtn.style.display = hasMultiple ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = hasMultiple ? 'flex' : 'none';

    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        if (hasMultiple) {
            currentImages.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `dot ${idx === currentIndex ? 'active' : ''}`;
                dot.onclick = (e) => {
                    e.stopPropagation();
                    currentIndex = idx;
                    updateCarousel();
                };
                dotsContainer.appendChild(dot);
            });
        }
    }
}

function nextImage() {
    if (currentImages.length <= 1) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateCarousel();
}

function prevImage() {
    if (currentImages.length <= 1) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
}

// --- QUOTE PAGE LOGIC ---

function renderQuotePage(organizedData) {
    const listContainer = document.getElementById('quote-list');
    const countSpan = document.getElementById('selected-count');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Sort categories based on custom order
    const customOrder = [
        'Plate Loaded Equipments',
        'Selectorized Equipments',
        'Weight Benches and Storage',
        'Racks and rigs',
        'Multifunctional and functional equipments',
        'Accessories'
    ];

    const categories = Object.keys(organizedData).sort((a, b) => {
        const norm = s => s.toLowerCase().trim();
        const indexA = customOrder.findIndex(order => norm(order) === norm(a));
        const indexB = customOrder.findIndex(order => norm(order) === norm(b));

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    categories.forEach(catName => {
        // Create Category Group
        const group = document.createElement('div');
        group.className = 'quote-category-group';

        // Title Row
        const titleRow = document.createElement('div');
        titleRow.innerHTML = `
            <div class="quote-category-title">${catName}</div>
            <div class="quote-header-row">
                <button class="select-all-btn" onclick="toggleCategory('${catName.replace(/'/g, "\\'")}', true)">Select All</button>
                <button class="select-all-btn" onclick="toggleCategory('${catName.replace(/'/g, "\\'")}', false)" style="margin-left:5px;">Clear</button>
            </div>
        `;
        group.appendChild(titleRow);

        // Render Products
        const subcats = organizedData[catName];
        Object.keys(subcats).sort().forEach(subName => {
            const items = subcats[subName];

            // Subcategory Header
            const subHeader = document.createElement('div');
            subHeader.className = 'quote-subcategory-title';
            subHeader.textContent = subName;
            group.appendChild(subHeader);

            items.forEach(item => {
                const itemRow = document.createElement('div');
                itemRow.className = 'quote-item';

                // itemRow.onclick logic moved to specific elements to separate image click from check click


                let imgSrc = 'https://placehold.co/100x100?text=No+Image';
                // UPDATED: Check for specific thumbnail first
                if (typeof thumbnailData !== 'undefined' && thumbnailData[item.key]) {
                    imgSrc = thumbnailData[item.key];
                } else if (item.images && item.images.length > 0) {
                    imgSrc = item.images[0];
                }

                itemRow.innerHTML = `
                    <input type="checkbox" class="quote-checkbox" data-cat="${catName}" data-name="${item.name}" value="${item.key}">
                    <img src="${imgSrc}" class="quote-img" alt="${item.name}" onclick="openQuoteModal(event, '${item.key.replace(/'/g, "\\'")}')">
                    <div class="quote-info" onclick="toggleRowCheckbox(event)">
                        <span class="quote-name">${item.name}</span>
                        <span class="quote-sub">${subName}</span>
                    </div>
                `;
                group.appendChild(itemRow);
            });
        });

        listContainer.appendChild(group);
    });

    // Helper functions global
    window.openQuoteModal = (e, itemKey) => {
        e.stopPropagation(); // prevent checkbox toggle

        // Find item data
        let foundItem = null;
        Object.values(organizedData).forEach(cat => {
            Object.values(cat).forEach(sub => {
                const i = sub.find(k => k.key === itemKey);
                if (i) foundItem = i;
            });
        });

        if (foundItem) {
            openModal(foundItem);

            // Inject "Select for Quote" Toggle in Modal
            const actionContainer = document.getElementById('modal-quote-action');
            if (actionContainer) {
                const cb = document.querySelector(`.quote-checkbox[value="${itemKey}"]`);
                const isChecked = cb ? cb.checked : false;

                actionContainer.innerHTML = `
                    <button id="modal-select-btn" class="btn-primary" style="background: ${isChecked ? '#e6c200' : 'transparent'}; border: 1px solid var(--primary-color); color: ${isChecked ? '#000' : 'var(--primary-color)'};" onclick="modalToggleQuote('${itemKey}')">
                        ${isChecked ? 'Selected for Quote ✔' : 'Select for Quote'}
                    </button>
                `;
            }
        }
    };

    window.modalToggleQuote = (itemKey) => {
        const cb = document.querySelector(`.quote-checkbox[value="${itemKey}"]`);
        if (cb) {
            cb.checked = !cb.checked;
            updateQuoteCount();

            // Update button visual
            const btn = document.getElementById('modal-select-btn');
            if (btn) {
                if (cb.checked) {
                    btn.style.background = '#e6c200';
                    btn.style.color = '#000';
                    btn.textContent = 'Selected for Quote ✔';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--primary-color)';
                    btn.textContent = 'Select for Quote';
                }
            }
        }
    };

    window.toggleRowCheckbox = (e) => {
        // Triggered by clicking the info text area
        const row = e.target.closest('.quote-item');
        if (row) {
            const cb = row.querySelector('.quote-checkbox');
            if (cb) {
                cb.checked = !cb.checked;
                updateQuoteCount();
            }
        }
    };

    window.toggleCategory = (catName, select) => {
        const checkboxes = document.querySelectorAll(`.quote-checkbox[data-cat="${catName}"]`);
        checkboxes.forEach(cb => cb.checked = select);
        updateQuoteCount();
    };

    window.updateQuoteCount = () => {
        const count = document.querySelectorAll('.quote-checkbox:checked').length;
        if (countSpan) countSpan.textContent = count;
    };

    window.submitQuote = () => {
        // Validation
        const nameInput = document.getElementById('user-name');
        const contactInput = document.getElementById('contact-number');
        const emailInput = document.getElementById('email-address');
        const facilityInput = document.getElementById('facility-name');

        if (!nameInput || !contactInput || !emailInput) {
            console.error("Form inputs not found");
            return;
        }

        if (!nameInput.value.trim() || !contactInput.value.trim() || !emailInput.value.trim()) {
            alert('Please fill in all mandatory fields (Name, Contact, Email).');
            return;
        }

        const selected = document.querySelectorAll('.quote-checkbox:checked');
        if (selected.length === 0) {
            alert('Please select at least one item.');
            return;
        }

        let message = `Hello, I would like to request a quote.\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${nameInput.value.trim()}\n`;
        message += `Contact: ${contactInput.value.trim()}\n`;
        message += `Email: ${emailInput.value.trim()}\n`;
        if (facilityInput && facilityInput.value.trim()) {
            message += `Facility: ${facilityInput.value.trim()}\n`;
        }
        message += `\n*Requested Equipment:*\n\n`;

        // Group by Category for cleaner message
        const groups = {};
        selected.forEach(cb => {
            const cat = cb.dataset.cat;
            const name = cb.dataset.name;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(name);
        });

        Object.keys(groups).sort().forEach(cat => {
            message += `*${cat}:*\n`;
            groups[cat].sort().forEach(item => {
                message += `- ${item}\n`;
            });
            message += `\n`;
        });

        const url = `https://wa.me/919382117096?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };
}
