class SellerProfileService {
    constructor() {
        this.baseUrl = window.API_BASE_URL || 'https://localhost:7088/api';
        this.currentSellerId = null;
        this.sellerData = null;
        this.products = [];
        this.categories = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {
            search: '',
            categoryId: null,
            sortBy: 'newest',
            minPrice: null,
            maxPrice: null
        };
        
        this.elements = {};
        this.isLoading = false;
    }

    // ============================================
    // 🔧 INITIALIZATION
    // ============================================

    async init(sellerId) {
        try {
            console.log('🚀 Initializing seller profile service for seller:', sellerId);
            
            this.currentSellerId = sellerId;
            this.cacheElements();
            this.setupEventHandlers();
            
            await this.loadSellerData();
            
            console.log('✅ Seller profile service initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing seller profile:', error);
            this.showError('Không thể tải thông tin cửa hàng. Vui lòng thử lại sau.');
        }
    }

    cacheElements() {
        this.elements = {
            // Seller info elements
            shopName: document.querySelector('.shop-name'),
            shopOwner: document.querySelector('.shop-owner'),
            shopAddress: document.querySelector('.shop-address'),
            shopPhone: document.querySelector('.shop-phone'),
            shopEmail: document.querySelector('.shop-email'),
            shopJoinDate: document.querySelector('.shop-join-date'),
            shopDescription: document.querySelector('.shop-description'),
            shopAvatar: document.querySelector('.shop-avatar'),
            shopRatingText: document.querySelector('.shop-rating-text'),
            
            // Statistics elements (simplified)
            statProducts: document.querySelector('.stat-products'),
            statResponseRate: document.querySelector('.stat-response-rate'),
            
            // Categories & Products
            categoriesContainer: document.querySelector('.categories-container'),
            productsGrid: document.querySelector('.products-grid'),
            productsCount: document.querySelector('.products-count'),
            paginationContainer: document.querySelector('.pagination-container'),
            
            // Filter elements
            searchInput: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-btn'),
            sortSelect: document.getElementById('sort-select'),
            minPriceInput: document.getElementById('min-price'),
            maxPriceInput: document.getElementById('max-price'),
            filterPriceBtn: document.getElementById('filter-price-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            
            // UI elements
            loadingOverlay: document.getElementById('loading-overlay'),
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message'),
            closeErrorModal: document.getElementById('close-error-modal'),
            retryBtn: document.getElementById('retry-btn')
        };
    }

    setupEventHandlers() {
        // Search functionality
        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Sort functionality
        this.elements.sortSelect?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.applyFilters();
        });

        // Price filter
        this.elements.filterPriceBtn?.addEventListener('click', () => this.handlePriceFilter());

        // Clear filters
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());

        // Error modal
        this.elements.closeErrorModal?.addEventListener('click', () => this.hideError());
        this.elements.retryBtn?.addEventListener('click', () => {
            this.hideError();
            this.loadSellerData();
        });
    }

    // ============================================
    // 🌐 API METHODS - FIXED NULL PARAMETER HANDLING
    // ============================================

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error for ${endpoint}:`, error);
            throw error;
        }
    }

    async getSellerProfile(sellerId) {
        console.log(`🔍 Loading seller profile: ${sellerId}`);
        return await this.apiRequest(`/SellerPublic/${sellerId}/profile`);
    }

    async getSellerProducts(sellerId, options = {}) {
        // ✅ FIXED: Proper parameter handling - remove null values completely
        const params = new URLSearchParams();
        
        params.append('page', options.page || this.currentPage);
        params.append('pageSize', options.pageSize || this.pageSize);
        
        // ✅ Only add non-null, non-empty values
        if (this.filters.search && this.filters.search.trim()) {
            params.append('search', this.filters.search.trim());
        }
        
        if (this.filters.categoryId && this.filters.categoryId > 0) {
            params.append('categoryId', this.filters.categoryId);
        }
        
        if (this.filters.sortBy && this.filters.sortBy !== 'newest') {
            params.append('sortBy', this.filters.sortBy);
        }
        
        if (this.filters.minPrice && this.filters.minPrice > 0) {
            params.append('minPrice', this.filters.minPrice);
        }
        
        if (this.filters.maxPrice && this.filters.maxPrice > 0) {
            params.append('maxPrice', this.filters.maxPrice);
        }

        console.log(`🔍 Loading seller products: ${sellerId}`, params.toString());
        return await this.apiRequest(`/SellerPublic/${sellerId}/products?${params}`);
    }

    async getSellerCategories(sellerId) {
        console.log(`📂 Loading seller categories: ${sellerId}`);
        return await this.apiRequest(`/SellerPublic/${sellerId}/categories`);
    }

    // ============================================
    // 📊 DATA LOADING METHODS
    // ============================================

    async loadSellerData() {
        try {
            this.showLoading();

            // Load seller profile and categories in parallel
            const [sellerProfile, categoriesData] = await Promise.all([
                this.getSellerProfile(this.currentSellerId),
                this.getSellerCategories(this.currentSellerId)
            ]);

            this.sellerData = sellerProfile;
            this.categories = categoriesData.categories || [];

            // Render seller profile
            this.renderSellerProfile(sellerProfile);
            this.renderCategories(categoriesData);

            // Load and render products
            await this.loadProducts();

            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            throw error;
        }
    }

    async loadProducts() {
        try {
            this.showProductsLoading();

            const productsData = await this.getSellerProducts(this.currentSellerId, {
                page: this.currentPage,
                pageSize: this.pageSize
            });

            this.products = productsData.products || [];
            this.renderProducts(productsData);
            this.renderPagination(productsData.pagination);

        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showProductsError();
        }
    }

    // ============================================
    // 🎨 RENDERING METHODS - REMOVED REVIEWS & ORDERS
    // ============================================

    renderSellerProfile(seller) {
        try {
            console.log('🎨 Rendering seller profile');

            // Basic info
            this.updateElement(this.elements.shopName, seller.shopName);
            this.updateElement(this.elements.shopOwner, seller.userFullName || 'Chưa cập nhật');
            this.updateElement(this.elements.shopAddress, seller.userAddress || 'Chưa cập nhật địa chỉ');
            this.updateElement(this.elements.shopPhone, seller.phone || 'Chưa cập nhật');
            this.updateElement(this.elements.shopEmail, seller.email || 'Chưa cập nhật');
            this.updateElement(this.elements.shopJoinDate, this.formatDate(seller.joinDate));
            
            // Shop description
            this.updateElement(this.elements.shopDescription, 
                'Chào mừng bạn đến với cửa hàng của chúng tôi! Chúng tôi cam kết cung cấp những sản phẩm chất lượng với dịch vụ tốt nhất.');

            // Avatar
            if (this.elements.shopAvatar && seller.avatar) {
                this.elements.shopAvatar.src = seller.avatar;
                this.elements.shopAvatar.alt = seller.shopName;
            }

            // ✅ REMOVED: Rating display - no more reviews
            this.updateElement(this.elements.shopRatingText, `Cửa hàng uy tín`);

            // ✅ SIMPLIFIED: Statistics - only products and response rate
            this.updateElement(this.elements.statProducts, seller.totalProducts);
            this.updateElement(this.elements.statResponseRate, `${seller.responseRate.toFixed(0)}%`);

            console.log('✅ Seller profile rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering seller profile:', error);
        }
    }

    // ============================================
// 🎨 ENHANCED RENDERING METHODS
// ============================================

renderCategories(categoriesData) {
    try {
        console.log('🎨 Rendering categories with improved design');

        if (!this.elements.categoriesContainer) return;

        const categories = categoriesData.categories || [];
        const totalCategories = categories.length;
        const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);

        // Update category count
        const totalCategoriesElement = document.querySelector('.total-categories');
        if (totalCategoriesElement) {
            totalCategoriesElement.textContent = totalCategories;
        }

        if (categories.length === 0) {
            this.elements.categoriesContainer.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">Chưa có danh mục nào</p>
                    <p class="text-gray-400 text-sm mt-2">Cửa hàng chưa có sản phẩm trong danh mục nào</p>
                </div>
            `;
            return;
        }

        // ✅ ENHANCED: Create category buttons grid
        const allCategoryHtml = `
            <div class="category-button ${!this.filters.categoryId ? 'active' : ''}" 
                 data-category-id=""
                 title="Xem tất cả sản phẩm">
                <div class="text-center">
                    <div class="category-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="category-name">Tất cả</div>
                    <div class="category-count">${totalProducts} sản phẩm</div>
                </div>
                ${totalProducts > 99 ? '<div class="category-badge">99+</div>' : ''}
            </div>
        `;

        // ✅ ENHANCED: Create individual category buttons with icons and improved design
        const categoriesHtml = categories.map((category, index) => {
            const isActive = this.filters.categoryId === category.sellerCategoryID;
            const categoryIcon = this.getCategoryIcon(category.categoryName);
            const productCount = category.productCount;
            
            return `
                <div class="category-button ${isActive ? 'active' : ''}" 
                     data-category-id="${category.sellerCategoryID}"
                     title="${category.categoryName} - ${productCount} sản phẩm">
                    <div class="text-center">
                        <div class="category-icon">
                            <i class="${categoryIcon}"></i>
                        </div>
                        <div class="category-name">${category.categoryName}</div>
                        <div class="category-count">${productCount} sản phẩm</div>
                    </div>
                    ${productCount > 99 ? '<div class="category-badge">99+</div>' : 
                      productCount > 9 ? `<div class="category-badge">${productCount}</div>` : ''}
                </div>
            `;
        }).join('');

        // ✅ RESPONSIVE GRID LAYOUT
        this.elements.categoriesContainer.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                ${allCategoryHtml}
                ${categoriesHtml}
            </div>
        `;

        // ✅ Add enhanced click handlers with animations
        this.elements.categoriesContainer.querySelectorAll('.category-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Add click animation
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);

                const categoryId = e.currentTarget.dataset.categoryId;
                this.filterByCategory(categoryId ? parseInt(categoryId) : null);
            });

            // Add hover sound effect (optional)
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
            });

            button.addEventListener('mouseleave', () => {
                if (!button.classList.contains('active')) {
                    button.style.transform = '';
                }
            });
        });

        console.log('✅ Enhanced categories rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering categories:', error);
    }
}

// ✅ NEW: Get appropriate icon for category
getCategoryIcon(categoryName) {
    const iconMap = {
        // Electronics & Technology
        'điện thoại': 'fas fa-mobile-alt',
        'laptop': 'fas fa-laptop',
        'máy tính': 'fas fa-desktop',
        'tai nghe': 'fas fa-headphones',
        'camera': 'fas fa-camera',
        'điện tử': 'fas fa-microchip',
        'công nghệ': 'fas fa-robot',
        
        // Fashion & Clothing
        'thời trang': 'fas fa-tshirt',
        'quần áo': 'fas fa-tshirt',
        'giày dép': 'fas fa-shoe-prints',
        'túi xách': 'fas fa-shopping-bag',
        'phụ kiện': 'fas fa-gem',
        'đồng hồ': 'fas fa-clock',
        'trang sức': 'fas fa-ring',
        
        // Home & Living
        'nhà cửa': 'fas fa-home',
        'nội thất': 'fas fa-couch',
        'đồ gia dụng': 'fas fa-blender',
        'bếp': 'fas fa-utensils',
        'phòng ngủ': 'fas fa-bed',
        'phòng khách': 'fas fa-tv',
        
        // Health & Beauty
        'sức khỏe': 'fas fa-heartbeat',
        'làm đẹp': 'fas fa-magic',
        'mỹ phẩm': 'fas fa-palette',
        'chăm sóc': 'fas fa-spa',
        'dược phẩm': 'fas fa-pills',
        
        // Sports & Outdoor
        'thể thao': 'fas fa-running',
        'gym': 'fas fa-dumbbell',
        'ngoài trời': 'fas fa-mountain',
        'xe đạp': 'fas fa-bicycle',
        'bơi lội': 'fas fa-swimmer',
        
        // Books & Education
        'sách': 'fas fa-book',
        'giáo dục': 'fas fa-graduation-cap',
        'văn phòng phẩm': 'fas fa-pen',
        'học tập': 'fas fa-user-graduate',
        
        // Food & Beverage
        'thực phẩm': 'fas fa-apple-alt',
        'đồ uống': 'fas fa-coffee',
        'bánh kẹo': 'fas fa-birthday-cake',
        'gia vị': 'fas fa-pepper-hot',
        
        // Baby & Kids
        'trẻ em': 'fas fa-baby',
        'đồ chơi': 'fas fa-gamepad',
        'em bé': 'fas fa-baby-carriage',
        'học sinh': 'fas fa-school',
        
        // Automotive
        'ô tô': 'fas fa-car',
        'xe máy': 'fas fa-motorcycle',
        'phụ tùng': 'fas fa-tools',
        'xăng dầu': 'fas fa-gas-pump',
        
        // Default categories
        'default': 'fas fa-box'
    };

    // Convert to lowercase for matching
    const categoryLower = categoryName.toLowerCase();
    
    // Find matching icon
    for (const [key, icon] of Object.entries(iconMap)) {
        if (categoryLower.includes(key)) {
            return icon;
        }
    }
    
    // Return default icon if no match found
    return iconMap.default;
}

// ✅ ENHANCED: Update filter by category with better UI feedback
async filterByCategory(categoryId) {
    try {
        console.log('🔍 Filtering by category:', categoryId);
        
        // Show loading state on category buttons
        document.querySelectorAll('.category-button').forEach(button => {
            button.style.opacity = '0.6';
            button.style.pointerEvents = 'none';
        });
        
        this.filters.categoryId = categoryId;
        this.currentPage = 1;
        await this.applyFilters();
        
        // Restore category buttons
        document.querySelectorAll('.category-button').forEach(button => {
            button.style.opacity = '';
            button.style.pointerEvents = '';
        });
        
        // Update category pills UI with enhanced animations
        document.querySelectorAll('.category-button').forEach(button => {
            const pillCategoryId = button.dataset.categoryId;
            const isActive = (categoryId === null && pillCategoryId === '') || 
                            (categoryId !== null && parseInt(pillCategoryId) === categoryId);
            
            if (isActive) {
                button.classList.add('active');
                // Add pulse animation for active category
                button.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    button.style.animation = '';
                }, 500);
            } else {
                button.classList.remove('active');
            }
        });
        
        // Scroll to products section smoothly
        document.querySelector('.products-section')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
    } catch (error) {
        console.error('❌ Error filtering by category:', error);
        
        // Restore category buttons on error
        document.querySelectorAll('.category-button').forEach(button => {
            button.style.opacity = '';
            button.style.pointerEvents = '';
        });
    }
}

// ✅ ENHANCED: Product rendering with better cards
renderProducts(productsData) {
    try {
        console.log('🎨 Rendering products with enhanced design');

        if (!this.elements.productsGrid) return;

        const products = productsData.products || [];
        
        // Update products count
        this.updateElement(this.elements.productsCount, 
            `${productsData.pagination?.totalCount || 0} sản phẩm`);

        if (products.length === 0) {
            this.elements.productsGrid.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-box-open text-6xl text-gray-300 mb-6"></i>
                    <h3 class="text-xl font-medium text-gray-600 mb-2">Không có sản phẩm nào</h3>
                    <p class="text-gray-500 mb-6">
                        ${this.hasActiveFilters() ? 
                            'Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại' : 
                            'Cửa hàng chưa có sản phẩm nào'}
                    </p>
                    ${this.hasActiveFilters() ? 
                        `<button class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5" 
                                onclick="window.sellerProfileService.clearFilters()">
                            <i class="fas fa-times mr-2"></i>Xóa bộ lọc
                        </button>` : ''}
                </div>
            `;
            return;
        }

        // ✅ ENHANCED: Product cards with better design
        const productsHtml = products.map(product => `
            <div class="product-card group" data-product-id="${product.productID}">
                <div class="h-48 bg-gray-100 relative overflow-hidden">
                    <img src="${this.getFirstImage(product.imageURL) || '/Customer/assets/images/no-image.png'}" 
                         alt="${product.productName}" 
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                         loading="lazy">
                    
                    <!-- Stock badge -->
                    <div class="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-medium
                                ${product.stockQuantity > 0 ? 
                                  'bg-green-500/90 text-white' : 
                                  'bg-red-500/90 text-white'}">
                        ${product.stockQuantity > 0 ? 
                          `Còn ${product.stockQuantity}` : 
                          'Hết hàng'}
                    </div>
                    
                    <!-- Sold out overlay -->
                    ${product.stockQuantity === 0 ? 
                        `<div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span class="bg-red-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
                                Hết hàng
                            </span>
                        </div>` : ''}
                    
                    <!-- Hover overlay -->
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 
                                flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div class="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-medium shadow-lg 
                                    transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <i class="fas fa-eye mr-2"></i>Xem chi tiết
                        </div>
                    </div>
                </div>
                
                <div class="p-4">
                    <h3 class="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                        ${product.productName}
                    </h3>
                    
                    <div class="price-section mb-3">
                        <span class="text-red-500 font-bold text-lg">
                            ${this.formatPrice(product.price)}
                        </span>
                    </div>
                    
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            ${product.categoryName}
                        </span>
                        <span class="font-medium ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}">
                            ${product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        this.elements.productsGrid.innerHTML = productsHtml;

        // ✅ Enhanced click handlers for products
        this.elements.productsGrid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Add click animation
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                    const productId = e.currentTarget.dataset.productId;
                    this.goToProduct(productId);
                }, 100);
            });
        });

        // Show/hide clear filters button
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.classList.toggle('hidden', !this.hasActiveFilters());
        }

        console.log('✅ Enhanced products rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering products:', error);
    }
}



    renderPagination(pagination) {
        try {
            if (!this.elements.paginationContainer || !pagination) return;

            const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination;

            if (totalPages <= 1) {
                this.elements.paginationContainer.innerHTML = '';
                return;
            }

            let paginationHtml = `
                <div class="flex items-center space-x-2">
                    <button class="pagination-btn ${!hasPreviousPage ? 'disabled' : ''}" 
                            data-page="${currentPage - 1}" 
                            ${!hasPreviousPage ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
            `;

            // Page numbers
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);

            if (startPage > 1) {
                paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
                if (startPage > 2) {
                    paginationHtml += `<span class="px-2 text-gray-500">...</span>`;
                }
            }

            for (let page = startPage; page <= endPage; page++) {
                paginationHtml += `
                    <button class="pagination-btn ${page === currentPage ? 'active' : ''}" 
                            data-page="${page}">
                        ${page}
                    </button>
                `;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHtml += `<span class="px-2 text-gray-500">...</span>`;
                }
                paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            paginationHtml += `
                    <button class="pagination-btn ${!hasNextPage ? 'disabled' : ''}" 
                            data-page="${currentPage + 1}" 
                            ${!hasNextPage ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;

            this.elements.paginationContainer.innerHTML = paginationHtml;

            // Add click handlers
            this.elements.paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.currentTarget.dataset.page);
                    if (page && page !== currentPage) {
                        this.loadPage(page);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error rendering pagination:', error);
        }
    }

    // ============================================
    // 🔍 FILTER & SEARCH METHODS - FIXED CATEGORY FILTERING
    // ============================================

    async handleSearch() {
        const searchValue = this.elements.searchInput?.value.trim() || '';
        this.filters.search = searchValue;
        this.currentPage = 1;
        await this.applyFilters();
    }

    async handlePriceFilter() {
        const minPrice = parseFloat(this.elements.minPriceInput?.value) || null;
        const maxPrice = parseFloat(this.elements.maxPriceInput?.value) || null;
        
        this.filters.minPrice = minPrice;
        this.filters.maxPrice = maxPrice;
        this.currentPage = 1;
        await this.applyFilters();
    }

    async filterByCategory(categoryId) {
        try {
            console.log('🔍 Filtering by category:', categoryId);
            
            this.filters.categoryId = categoryId;
            this.currentPage = 1;
            await this.applyFilters();
            
            // Update category pills UI
            document.querySelectorAll('.category-pill').forEach(pill => {
                const pillCategoryId = pill.dataset.categoryId;
                if ((categoryId === null && pillCategoryId === '') || 
                    (categoryId !== null && parseInt(pillCategoryId) === categoryId)) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });
        } catch (error) {
            console.error('❌ Error filtering by category:', error);
        }
    }

    async applyFilters() {
        try {
            await this.loadProducts();
        } catch (error) {
            console.error('❌ Error applying filters:', error);
        }
    }

    async clearFilters() {
        try {
            this.filters = {
                search: '',
                categoryId: null,
                sortBy: 'newest',
                minPrice: null,
                maxPrice: null
            };
            this.currentPage = 1;

            // Reset UI
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            if (this.elements.sortSelect) this.elements.sortSelect.value = 'newest';
            if (this.elements.minPriceInput) this.elements.minPriceInput.value = '';
            if (this.elements.maxPriceInput) this.elements.maxPriceInput.value = '';

            // Reset category pills
            document.querySelectorAll('.category-pill').forEach(pill => {
                pill.classList.remove('active');
                if (pill.dataset.categoryId === '') {
                    pill.classList.add('active');
                }
            });

            await this.applyFilters();
        } catch (error) {
            console.error('❌ Error clearing filters:', error);
        }
    }

    async loadPage(page) {
        try {
            this.currentPage = page;
            await this.loadProducts();
            
            // Scroll to products section
            document.querySelector('.products-section')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        } catch (error) {
            console.error('❌ Error loading page:', error);
        }
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    hasActiveFilters() {
        return !!(this.filters.search || 
                 this.filters.categoryId || 
                 this.filters.minPrice || 
                 this.filters.maxPrice || 
                 this.filters.sortBy !== 'newest');
    }

    getFirstImage(imageUrl) {
        if (!imageUrl) return null;
        const images = imageUrl.split(',');
        return images[0]?.trim();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    updateElement(element, content) {
        if (element) {
            element.textContent = content;
        }
    }

    goToProduct(productId) {
        window.location.href = `/Customer/templates/product-detail.html?id=${productId}`;
    }

    // ============================================
    // 🎭 UI STATE METHODS
    // ============================================

    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
        }
        this.isLoading = true;
    }

    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
        this.isLoading = false;
    }

    showProductsLoading() {
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = Array(8).fill().map(() => `
                <div class="loading-skeleton h-64 rounded-lg"></div>
            `).join('');
        }
    }

    showProductsError() {
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <p class="text-red-500 text-lg mb-4">Không thể tải sản phẩm</p>
                    <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" 
                            onclick="window.sellerProfileService.loadProducts()">
                        Thử lại
                    </button>
                </div>
            `;
        }
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        if (this.elements.errorModal) {
            this.elements.errorModal.classList.remove('hidden');
        }
        console.error('❌ Error:', message);
    }

    hideError() {
        if (this.elements.errorModal) {
            this.elements.errorModal.classList.add('hidden');
        }
    }
}

// ============================================
// 🌟 AUTO-INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Get seller ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id') || urlParams.get('sellerId');

    if (!sellerId) {
        console.error('❌ No seller ID provided');
        alert('Không tìm thấy thông tin cửa hàng');
        window.location.href = '/Customer/templates/index.html';
        return;
    }

    // Validate seller ID
    const sellerIdInt = parseInt(sellerId);
    if (isNaN(sellerIdInt) || sellerIdInt <= 0) {
        console.error('❌ Invalid seller ID:', sellerId);
        alert('ID cửa hàng không hợp lệ');
        window.location.href = '/Customer/templates/index.html';
        return;
    }

    // Initialize service
    window.sellerProfileService = new SellerProfileService();
    window.sellerProfileService.init(sellerIdInt);
});