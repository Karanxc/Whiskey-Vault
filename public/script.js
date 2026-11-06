/**
 * Whiskey Vault - Client Application Engine
 * Handles decentralized provenance search, filtering, modal inspection, and auth state.
 */

let currentUser = null;
let isAuthenticated = false;
let currentView = 'grid';
let searchTimeout = null;
let allFetchedDocs = [];

// --- Authentication State Management ---
function checkAuthStatus() {
    const token = localStorage.getItem('whiskey_token') || localStorage.getItem('token');
    const userData = localStorage.getItem('whiskey_user') || localStorage.getItem('docchain_user');
    
    if (token) {
        isAuthenticated = true;
        try {
            currentUser = userData ? JSON.parse(userData) : { email: 'Collector' };
        } catch (e) {
            currentUser = { email: 'Collector' };
        }
    } else {
        isAuthenticated = false;
        currentUser = null;
    }
    updateNavigation();
}

function updateNavigation() {
    const authNav = document.getElementById('auth-nav');
    const uploadNav = document.getElementById('upload-nav');
    const logoutNav = document.getElementById('logout-nav');
    
    if (!authNav || !uploadNav || !logoutNav) return;
    
    if (isAuthenticated) {
        authNav.style.display = 'none';
        uploadNav.style.display = 'block';
        logoutNav.style.display = 'block';
    } else {
        authNav.style.display = 'block';
        uploadNav.style.display = 'none';
        logoutNav.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('whiskey_token');
    localStorage.removeItem('whiskey_user');
    localStorage.removeItem('token');
    localStorage.removeItem('docchain_user');
    isAuthenticated = false;
    currentUser = null;
    updateNavigation();
    window.location.href = 'index.html';
}

// --- Fetch Records from Backend / Blockchain ---
async function fetchDocumentsFromVault() {
    try {
        const res = await fetch('/api/search');
        if (!res.ok) throw new Error('Search failed');
        const docs = await res.json();
        
        allFetchedDocs = docs.map((doc, idx) => {
            const rawTags = doc.tags || '';
            const tagArray = Array.isArray(rawTags) 
                ? rawTags 
                : rawTags.split(',').map(t => t.trim()).filter(Boolean);

            // Infer category or badge
            let category = 'Bottle Provenance';
            if (rawTags.toLowerCase().includes('cask deed')) category = 'Cask Deed';
            else if (rawTags.toLowerCase().includes('certificate')) category = 'Authenticity Certificate';
            else if (rawTags.toLowerCase().includes('distillation')) category = 'Distillation Log';
            else if (rawTags.toLowerCase().includes('analysis') || rawTags.toLowerCase().includes('assay')) category = 'Lab Chemical Assay';
            else if (rawTags.toLowerCase().includes('receipt')) category = 'Purchase Receipt';

            return {
                id: doc.id !== undefined ? doc.id : idx,
                title: doc.title || 'Untitled Whiskey Record',
                description: doc.description || 'No description provided.',
                category,
                date: doc.timestamp ? new Date(doc.timestamp * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                rawTimestamp: doc.timestamp || 0,
                ipfsCid: doc.ipfsCid || '',
                blockHash: doc.blockHash || '',
                txHash: doc.txHash || '',
                tags: tagArray,
                size: doc.size ? formatSize(doc.size) : 'N/A',
                author: doc.author || 'Vault Archivist',
                fileUrl: doc.fileUrl || `/ipfs/${doc.ipfsCid}`
            };
        });
        return allFetchedDocs;
    } catch (err) {
        console.warn('Vault search notice; returning cached/empty records:', err);
        return allFetchedDocs;
    }
}

// --- Search & Filter Logic ---
async function performDocumentSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const docs = await fetchDocumentsFromVault();

    const filtered = docs.filter(doc =>
        !query ||
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query)) ||
        doc.author.toLowerCase().includes(query) ||
        doc.ipfsCid.toLowerCase().includes(query) ||
        doc.txHash.toLowerCase().includes(query)
    );

    displaySearchResults(filtered, query);
}

function performSearchDebounced() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performDocumentSearch, 250);
}

async function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const dateValue = dateFilter ? dateFilter.value : '';
    const categoryValue = categoryFilter ? categoryFilter.value.toLowerCase() : '';

    let docs = await fetchDocumentsFromVault();

    let filtered = docs.filter(doc => {
        const matchesQuery = !query ||
            doc.title.toLowerCase().includes(query) ||
            doc.description.toLowerCase().includes(query) ||
            doc.tags.some(tag => tag.toLowerCase().includes(query)) ||
            doc.author.toLowerCase().includes(query);

        const matchesCategory = !categoryValue || 
            doc.category.toLowerCase().includes(categoryValue) ||
            doc.tags.some(tag => tag.toLowerCase().includes(categoryValue));

        return matchesQuery && matchesCategory;
    });

    if (dateValue) {
        const now = new Date();
        filtered = filtered.filter(doc => {
            const docDate = new Date(doc.date);
            if (dateValue === 'today') {
                return docDate.toDateString() === now.toDateString();
            } else if (dateValue === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return docDate >= weekAgo;
            } else if (dateValue === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return docDate >= monthAgo;
            } else if (dateValue === 'year') {
                return docDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    displaySearchResults(filtered, query);
}

// --- Render Search Results ---
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('results-container');
    const resultsCount = document.getElementById('results-count');
    const noResults = document.getElementById('no-results');
    
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.style.display = 'none';
        if (noResults) noResults.style.display = 'block';
        if (resultsCount) resultsCount.textContent = 'No records found';
        return;
    }
    
    resultsContainer.style.display = 'grid';
    if (noResults) noResults.style.display = 'none';
    
    if (resultsCount) {
        const countText = query ? 
            `${results.length} record${results.length !== 1 ? 's' : ''} found for "${query}"` :
            `${results.length} authenticated whiskey record${results.length !== 1 ? 's' : ''}`;
        resultsCount.textContent = countText;
    }
    
    resultsContainer.innerHTML = results.map(doc => `
        <div class="document-card glass-card" onclick="showDocumentDetails(${doc.id})">
            <div>
                <div class="document-header">
                    <h3 class="document-title">${escapeHtml(doc.title)}</h3>
                    <span class="document-badge">${escapeHtml(doc.category)}</span>
                </div>
                <div class="document-description">${escapeHtml(doc.description)}</div>
                <div class="document-tags">
                    ${doc.tags.slice(0, 4).map(t => `<span class="document-badge" style="font-size:0.7rem; padding: 2px 7px;">${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
            <div class="document-meta">
                <div class="document-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatDate(doc.date)}
                </div>
                <div class="document-hash" title="${doc.ipfsCid}">IPFS: ${doc.ipfsCid.substring(0, 10)}...</div>
            </div>
        </div>
    `).join('');
    
    if (typeof gsap !== 'undefined') {
        gsap.fromTo('.document-card', 
            {opacity: 0, y: 20}, 
            {opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power2.out"}
        );
    }
}

// --- Toggle Grid / List View ---
function setView(viewType) {
    const resultsContainer = document.getElementById('results-container');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    currentView = viewType;
    
    viewButtons.forEach(btn => {
        if (btn.dataset.view === viewType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (resultsContainer) {
        resultsContainer.className = `results-container ${viewType}-view`;
    }
}

// --- Inspect Record Modal ---
function showDocumentDetails(docId) {
    const doc = allFetchedDocs.find(d => d.id === docId);
    if (!doc) return;
    
    const modal = document.getElementById('document-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = doc.title;
    
    const downloadUrl = doc.ipfsCid ? `/ipfs/${doc.ipfsCid}` : '#';
    const verifyUrl = doc.txHash && doc.txHash.startsWith('0x') 
        ? `https://sepolia.etherscan.io/tx/${doc.txHash}` 
        : '#';
    
    modalBody.innerHTML = `
        <div class="document-details">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <span class="document-badge" style="font-size: 0.85rem; padding: 6px 12px;">${escapeHtml(doc.category)}</span>
                <span style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(doc.date)}</span>
            </div>

            <div class="detail-group" style="margin-bottom: 20px;">
                <label style="color:var(--amber-bright); font-size: 0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px;">Provenance & Cask Description</label>
                <p style="color:var(--text-secondary); line-height: 1.6;">${escapeHtml(doc.description)}</p>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div class="detail-group">
                    <label style="color:var(--amber-bright); font-size: 0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px;">Archivist / Signatory</label>
                    <p style="color:var(--text-primary); font-weight:500;">${escapeHtml(doc.author)}</p>
                </div>
                <div class="detail-group">
                    <label style="color:var(--amber-bright); font-size: 0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px;">Document Size</label>
                    <p style="color:var(--text-primary);">${escapeHtml(doc.size)}</p>
                </div>
            </div>

            <div class="detail-group" style="margin-bottom: 24px;">
                <label style="color:var(--amber-bright); font-size: 0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:8px;">Authentication Tags</label>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${doc.tags.map(t => `<span class="document-badge" style="font-size:0.75rem;">${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>

            <div class="blockchain-info" style="background:rgba(12,9,6,0.85); border:1px solid rgba(229,169,59,0.25); border-radius:10px; padding:18px; margin-bottom:24px;">
                <h4 style="color:var(--amber-bright); margin-bottom:14px; font-size:1.05rem;">Cryptographic Blockchain Proof</h4>
                
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">IPFS Decentralized CID</div>
                    <div style="font-family:'Monaco',monospace; font-size:0.82rem; color:var(--text-primary); word-break:break-all; background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:6px; border:1px solid rgba(229,169,59,0.15);">
                        ${doc.ipfsCid}
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">Ethereum Transaction Hash</div>
                    <div style="font-family:'Monaco',monospace; font-size:0.82rem; color:var(--amber-bright); word-break:break-all; background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:6px; border:1px solid rgba(229,169,59,0.15);">
                        ${doc.txHash}
                    </div>
                </div>

                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">Block Header Hash</div>
                    <div style="font-family:'Monaco',monospace; font-size:0.82rem; color:var(--text-secondary); word-break:break-all; background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:6px; border:1px solid rgba(229,169,59,0.15);">
                        ${doc.blockHash}
                    </div>
                </div>
            </div>

            <div style="display:flex; gap:14px; flex-wrap:wrap;">
                <a href="${downloadUrl}" target="_blank" class="btn-primary" style="flex:1; text-align:center;">Download Certificate</a>
                <a href="${verifyUrl}" target="_blank" class="btn-secondary" style="flex:1; text-align:center;">Verify on Ledger</a>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(modal.querySelector('.modal-content'), 
            {scale: 0.9, opacity: 0}, 
            {scale: 1, opacity: 1, duration: 0.25, ease: "power2.out"}
        );
    }
}

function closeModal() {
    const modal = document.getElementById('document-modal');
    if (modal) modal.classList.remove('active');
}

// --- Live Stats Loader for Index Page ---
async function loadVaultStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.stats) {
            const totalEl = document.getElementById('stat-total');
            const casksEl = document.getElementById('stat-casks');
            const bottlesEl = document.getElementById('stat-bottles');
            const distilleriesEl = document.getElementById('stat-distilleries');

            if (totalEl) totalEl.textContent = data.stats.totalVaultItems;
            if (casksEl) casksEl.textContent = data.stats.casksProtected;
            if (bottlesEl) bottlesEl.textContent = data.stats.bottlesAuthenticated;
            if (distilleriesEl) distilleriesEl.textContent = data.stats.verifiedDistilleries;
        }
    } catch (e) {
        // Silently preserve static defaults
    }
}

// --- Utilities ---
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatSize(bytes) {
    const num = Number(bytes);
    if (isNaN(num) || num <= 0) return '0 B';
    if (num >= 1024 * 1024) return (num / (1024 * 1024)).toFixed(2) + ' MB';
    if (num >= 1024) return (num / 1024).toFixed(1) + ' KB';
    return num + ' B';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// --- Page Initialization ---
function initializePage() {
    checkAuthStatus();
    setupNavigation();

    // Check if on search page
    if (document.getElementById('search-input')) {
        performDocumentSearch();
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') performDocumentSearch();
        });
        searchInput.addEventListener('input', performSearchDebounced);
        
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) dateFilter.addEventListener('change', applyFilters);

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    }

    // Check if modal exists
    const modalOverlay = document.getElementById('document-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Check if stats banner exists
    if (document.getElementById('stat-total')) {
        loadVaultStats();
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
