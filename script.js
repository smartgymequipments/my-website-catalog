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
    const searchButton = document.querySelector('.search-icon-btn');

    if (!searchInput || !resultsContainer) return;

    // Secret Admin Access Logic
    const checkAdminCode = () => {
        if (searchInput.value.trim().toLowerCase() === 'khamrade') {
            window.location.href = 'portal-access-99.php';
        }
    };

    if (searchButton) {
        searchButton.addEventListener('click', checkAdminCode);
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            checkAdminCode();
        }
    });

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
    const minSize = 0.5; // rem
    const step = 0.05;

    // Iteratively shrink if overflowing
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

/// --- Latest Products Carousel ---
const renderLatestProducts = () => {
    const container = document.getElementById('latest-arrivals-container');
    const track = document.getElementById('latest-track');

    if (!container || !track) return;

    // Convert data object to array
    const products = Object.values(equipmentData);

    // Filter items that have a date_added > 0 (or fallback if all are 0)
    // For now, if no dates, we might show nothing or random. 
    // Let's sort by date desc.
    // Let's sort by date desc, then by name asc for stability
    const sorted = products.filter(p => p.date_added).sort((a, b) => (b.date_added - a.date_added) || a.name.localeCompare(b.name));

    // If no "new" products, just show random 5 or nothing. 
    // User asked for "Newly Added". If none added yet with new system, let's hide or show nothing.
    // BUT for UI Verification, I should show something.
    let displayList = sorted.slice(0, 10);

    if (displayList.length === 0) {
        // Fallback: If no metadata exists yet, don't show the section.
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    track.innerHTML = displayList.map(p => {
        let img = '';
        if (p.images && p.images.length) {
            const found = p.images.find(i => !/\.(mp4|webm|ogg|mov)$/i.test(i));
            img = found || p.images[0]; // Fallback to first item
        }
        if (typeof thumbnailData !== 'undefined' && thumbnailData[p.key]) {
            img = thumbnailData[p.key];
        }
        return `
            <div class="min-w-[200px] sm:min-w-[240px] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden group cursor-pointer hover:border-yellow-400/50 transition relative" onclick="openModalFromSearch(${JSON.stringify(p).replace(/'/g, "&#39;")})">
                 <div class="h-48 overflow-hidden">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 opactiy-90 group-hover:opacity-100">
                 </div>
                 <div class="p-4 h-[80px] flex items-center justify-center text-center">
                    <h3 class="text-white font-bold text-sm dynamic-text leading-tight">${p.name}</h3>
                 </div>
                 <div class="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded">NEW</div>
            </div>
        `;
    }).join('');

    // Apply scaling
    track.querySelectorAll('.dynamic-text').forEach(el => fitTextToContainer(el));

    // Carousel Logic
    const prevBtn = document.getElementById('latest-prev');
    const nextBtn = document.getElementById('latest-next');
    let scrollPos = 0;

    prevBtn.onclick = () => {
        scrollPos = Math.max(0, scrollPos - 300);
        track.parentElement.scrollTo({ left: scrollPos, behavior: 'smooth' });
    };

    nextBtn.onclick = () => {
        scrollPos = Math.min(track.scrollWidth - track.parentElement.clientWidth, scrollPos + 300);
        track.parentElement.scrollTo({ left: scrollPos, behavior: 'smooth' });
    };
};

// --- RENDERERS ---

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

        let imgSrc = 'https://placehold.co/600x800/1e293b/FFF?text=No+Image';

        if (realKey) {
            // Priority 1: Manual Thumbnail from database
            if (typeof thumbnailData !== 'undefined' && thumbnailData[`category:${realKey}`]) {
                imgSrc = thumbnailData[`category:${realKey}`];
            }
            // Priority 2: First image of first product (Determinism)
            else if (organizedData[realKey]) {
                // Find first available image in deterministic order
                let found = false;
                const subCats = Object.keys(organizedData[realKey]).sort();
                for (const sub of subCats) {
                    const products = organizedData[realKey][sub];
                    if (products.length > 0) {
                        // Ensure determinism by sorting products by name
                        products.sort((a, b) => a.name.localeCompare(b.name));

                        const p = products[0];
                        if (p.images && p.images.length > 0) {
                            const found = p.images.find(i => !/\.(mp4|webm|ogg|mov)$/i.test(i));
                            imgSrc = found || p.images[0];
                            found = true;
                            break;
                        }
                    }
                }
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
            <img src="${imgSrc}" alt="${displayLabel}" loading="lazy">
            <div class="card-overlay">
                <h3 class="dynamic-text">${displayLabel}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;
        showcaseContainer.appendChild(card);
    });

    // Apply scaling
    requestAnimationFrame(() => {
        showcaseContainer.querySelectorAll('.dynamic-text').forEach(el => fitTextToContainer(el));
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

    // Separate "General" items from other subcategories
    let generalItems = [];
    if (subcats['General']) {
        generalItems = subcats['General'];
    }

    sortedSubKeys.forEach(subName => {
        if (subName === 'General') return; // Skip General folder rendering

        const items = subcats[subName];
        let imgSrc = 'https://placehold.co/600x800/1e293b/FFF?text=No+Image';

        if (typeof thumbnailData !== 'undefined' && thumbnailData[`subcategory:${subName}`]) {
            imgSrc = thumbnailData[`subcategory:${subName}`];
        } else {
            // Find valid images (non-video)
            const validImages = items.map(i => i.images?.find(img => !/\.(mp4|webm|ogg|mov)$/i.test(img))).filter(Boolean);
            if (validImages.length > 0) {
                imgSrc = validImages[0];
            }
        }

        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => {
            // If subcategory has only 1 item, maybe open it? Current behavior: go to sub page
            // Keep existing behavior for consistency
            window.location.href = `products.html?type=${encodeURIComponent(categoryType)}&sub=${encodeURIComponent(subName)}`;
        };

        card.innerHTML = `
            <img src="${imgSrc}" alt="${subName}" loading="lazy">
            <div class="card-overlay">
                <h3 class="dynamic-text">${subName}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;
        grid.appendChild(card);
    });

    // Render "General" items directly as products
    generalItems.forEach(item => {
        const card = document.createElement('div');
        // Use category-card style but it opens modal
        card.className = 'category-card';

        let imgSrc = 'https://placehold.co/600x800/1e293b/FFF?text=No+Image';
        // Check product thumbnail
        if (typeof thumbnailData !== 'undefined' && thumbnailData[item.key]) {
            imgSrc = thumbnailData[item.key];
        } else if (item.images && item.images.length > 0) {
            // Find first non-video image
            const img = item.images.find(i => !/\.(mp4|webm|ogg|mov)$/i.test(i));
            if (img) imgSrc = img;
            else imgSrc = item.images[0];
        }

        card.onclick = () => {
            openModal(item);
        };

        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" loading="lazy">
            <div class="card-overlay">
                 <h3 class="dynamic-text">${item.name}</h3>
                 <span class="card-arrow">+</span>
            </div>
        `;
        grid.appendChild(card);
    });

    // Apply scaling
    requestAnimationFrame(() => {
        grid.querySelectorAll('.dynamic-text').forEach(el => fitTextToContainer(el));
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

        // Priority 1: Manual Thumbnail
        if (typeof thumbnailData !== 'undefined' && thumbnailData[item.key]) {
            imgSrc = thumbnailData[item.key];
        }
        // Priority 2: First Image (Non-Video)
        else if (item.images && item.images.length > 0) {
            // Find first non-video image
            const img = item.images.find(i => !/\.(mp4|webm|ogg|mov)$/i.test(i));
            if (img) imgSrc = img;
            else imgSrc = item.images[0]; // Fallback to first item (video?) if no images

            // If fallback is video, maybe we should show a placeholder?
            // For now, let's leave it, but HTML <img> won't render video.
            // A better approach if it's a video is to render a video tag or a generic icon.
            if (/\.(mp4|webm|ogg|mov)$/i.test(imgSrc)) {
                // It's a video and we are in a grid. 
                // Let's use a placeholder or try to render video??
                // Render video tag in grid might be heavy but let's try strict object-fit 
                // Actually the user wants to see the equipment. 
                // Let's rely on the fact they said "upload videos too ALONG with images".
            }
        }

        card.onclick = () => openModal(item);

        // Overlay Style Structure
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" loading="lazy" style="object-fit: contain; padding: 20px;">
            <div class="card-overlay">
                <h3 class="dynamic-text">${item.name}</h3>
                <span class="card-arrow">❯</span>
            </div>
        `;

        grid.appendChild(card);
    });

    // Apply scaling
    requestAnimationFrame(() => {
        grid.querySelectorAll('.dynamic-text').forEach(el => fitTextToContainer(el));
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

        // Swipe Support (Touch Events)
        let touchStartX = 0;
        let touchEndX = 0;
        const swipeThreshold = 50;

        modalImage.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        modalImage.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        const handleSwipe = () => {
            if (currentImages.length <= 1) return;

            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) < swipeThreshold) return; // Ignore small swipes

            if (diff > 0) {
                // Swiped Left -> Next Image
                nextImage();
            } else {
                // Swiped Right -> Previous Image
                prevImage();
            }
        };
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

    // Prioritize Videos: Sort so video files come first
    // Check if there is a YouTube link
    let mediaList = (item.images && item.images.length > 0)
        ? [...item.images]
        : [];

    if (item.youtube) {
        mediaList.unshift(item.youtube);
    }

    if (mediaList.length === 0) mediaList = ['https://placehold.co/600x400?text=No+Image'];

    // Sort: Local Videos first (after YouTube which is already unshifted to 0)
    // Actually, if we unshift YouTube, it's at index 0.
    // Now just sort the rest? No, existing images might be mixed.
    // Let's keep YouTube at top, then local videos, then images.

    mediaList.sort((a, b) => {
        // YouTube always first
        const isYtA = a.includes('youtube.com') || a.includes('youtu.be');
        const isYtB = b.includes('youtube.com') || b.includes('youtu.be');
        if (isYtA && !isYtB) return -1;
        if (!isYtA && isYtB) return 1;

        const isVideoA = /\.(mp4|webm|ogg|mov)$/i.test(a);
        const isVideoB = /\.(mp4|webm|ogg|mov)$/i.test(b);
        return (isVideoA === isVideoB) ? 0 : isVideoA ? -1 : 1;
    });

    currentImages = mediaList;
    currentIndex = 0;

    updateCarousel();

    modalBackdrop.classList.remove('hidden');
    void modalBackdrop.offsetWidth;
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateCarousel() {
    const modalImageContainer = document.getElementById('modal-img-container');
    // We need a container now because we might replace img with video
    // But existing HTML likely has just <img id="modal-img">
    // Let's check existing HTML structure or just manipulate the DOM to replace the element.

    // Quick fix: Use the parent of 'modal-img' to swap content
    let modalImage = document.getElementById('modal-img');
    const prevBtn = document.getElementById('prev-img');
    const nextBtn = document.getElementById('next-img');
    const dotsContainer = document.getElementById('carousel-dots');

    if (!modalImage) return;
    const parent = modalImage.parentElement;

    const currentSrc = currentImages[currentIndex];

    // Check if it's a YouTube URL (simple check)
    // We expect the backend to store the full URL, but we need the ID for embed.
    // Or we can simple store the embed URL? let's assume standard URL and extract ID.
    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const ytId = currentSrc.includes('youtube.com') || currentSrc.includes('youtu.be') ? getYouTubeId(currentSrc) : null;
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(currentSrc);

    // Swap Element if needed
    let newElement;

    if (ytId) {
        if (modalImage.tagName !== 'IFRAME') {
            newElement = document.createElement('iframe');
            newElement.id = 'modal-img';
            newElement.className = modalImage.className;
            newElement.width = "100%";
            newElement.height = "100%";
            newElement.frameBorder = "0";
            newElement.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            newElement.allowFullscreen = true;
            parent.replaceChild(newElement, modalImage);
            modalImage = newElement;
        }
        modalImage.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}`;
    }
    else if (isVideo) {
        if (modalImage.tagName !== 'VIDEO') {
            newElement = document.createElement('video');
            newElement.id = 'modal-img';
            newElement.className = modalImage.className; // Maintain classes
            newElement.controls = true;
            newElement.autoplay = true;
            newElement.muted = false; // User can unmute
            newElement.setAttribute('playsinline', ''); // iOS support
            newElement.setAttribute('preload', 'auto');
            newElement.loop = true; // Seamless loop
            parent.replaceChild(newElement, modalImage);
            modalImage = newElement;
        }
        modalImage.src = currentSrc;
        modalImage.play().catch(e => console.log("Autoplay blocked", e));
    } else {
        if (modalImage.tagName !== 'IMG') {
            newElement = document.createElement('img');
            newElement.id = 'modal-img';
            newElement.className = modalImage.className;
            parent.replaceChild(newElement, modalImage);
            modalImage = newElement;
        }
        modalImage.src = currentSrc;
    }

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


                let imgSrc = 'https://placehold.co/90x120?text=No+Image';

                // 1. Try Metadata Thumbnail
                if (typeof thumbnailData !== 'undefined' && thumbnailData[item.key]) {
                    imgSrc = thumbnailData[item.key];
                }
                // 2. Try First Non-Video Image
                else if (item.images && item.images.length > 0) {
                    const image = item.images.find(img => !/\.(mp4|webm|ogg|mov)$/i.test(img) && !img.includes('youtube'));
                    if (image) {
                        imgSrc = image;
                    } else {
                        // All are videos? Try to use the first video as source (might not work well in img tag)
                        // Or just show placeholder.
                        // Ideally, we want a placeholder for video-only products.
                        imgSrc = 'https://placehold.co/90x120?text=Video+Only';

                        // If it's a YouTube video, maybe we can get the thumbnail?
                        if (item.youtube) {
                            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                            const match = item.youtube.match(regExp);
                            if (match && match[2].length === 11) {
                                imgSrc = `https://img.youtube.com/vi/${match[2]}/0.jpg`;
                            }
                        }
                    }
                } else if (item.youtube) {
                    // No images, but has YouTube
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                    const match = item.youtube.match(regExp);
                    if (match && match[2].length === 11) {
                        imgSrc = `https://img.youtube.com/vi/${match[2]}/0.jpg`;
                    }
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
/* --- Initialize --- */
document.addEventListener('DOMContentLoaded', () => {
    // Check if on homepage
    if (document.getElementById('category-showcase')) {
        renderCategories();
        // if (typeof renderLatestProducts === 'function') {
        //     renderLatestProducts();
        // }
    }

    // Check if on Quote page
    if (document.getElementById('quote-list')) {
        renderQuoteList();
    }
});
