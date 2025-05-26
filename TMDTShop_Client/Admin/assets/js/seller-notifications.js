// ============================================
// API HELPER FUNCTIONS - THÊM VÀO ĐẦU FILE
// ============================================

/**
 * API Request Helper with Authentication
 */
async function apiRequest(url, options = {}) {
    try {
        // Get authentication token
        const token = getAuthToken();
        
        // Base URL for API
        const baseUrl = 'https://localhost:7088/api';
        const fullUrl = url.startsWith('https') ? url : `${baseUrl}${url}`;
        
        // Default headers
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add authentication if token exists
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        // Merge headers
        const headers = {
            ...defaultHeaders,
            ...options.headers
        };
        
        // Make request
        const response = await fetch(fullUrl, {
            ...options,
            headers
        });
        
        // Handle response
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        // Return JSON data
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

/**
 * Get authentication token from storage
 */
function getAuthToken() {
    // Try different possible token keys
    const possibleKeys = ['token', 'authToken', 'accessToken', 'bearerToken', 'jwt'];
    
    for (const key of possibleKeys) {
        // Check localStorage first
        let token = localStorage.getItem(key);
        if (token) return token;
        
        // Check sessionStorage
        token = sessionStorage.getItem(key);
        if (token) return token;
    }
    
    return null;
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 transform translate-x-full`;
    
    // Set border color based on type
    const borderColors = {
        success: 'border-green-500',
        error: 'border-red-500',
        warning: 'border-yellow-500',
        info: 'border-blue-500'
    };
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle text-green-500',
        error: 'fas fa-exclamation-circle text-red-500',
        warning: 'fas fa-exclamation-triangle text-yellow-500',
        info: 'fas fa-info-circle text-blue-500'
    };
    
    toast.classList.add(borderColors[type] || borderColors.info);
    
    toast.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-gray-900">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

/**
 * Format time to Vietnamese format
 */
function formatTime(isoString) {
    if (!isoString) return 'Không xác định';
    
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        // Return formatted date
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Không xác định';
    }
}

/**
 * Format money to Vietnamese currency
 */
function formatMoney(amount) {
    if (typeof amount !== 'number') return '0đ';
    
    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        // Fallback formatting
        return amount.toLocaleString('vi-VN') + 'đ';
    }
}

/**
 * Format number with thousand separators
 */
function formatNumber(number) {
    if (typeof number !== 'number') return '0';
    return number.toLocaleString('vi-VN');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Loading state management
 */
function setLoadingState(element, isLoading) {
    if (!element) return;
    
    if (isLoading) {
        element.disabled = true;
        element.classList.add('opacity-50', 'cursor-not-allowed');
        
        // Add loading spinner if button
        if (element.tagName === 'BUTTON') {
            const originalText = element.innerHTML;
            element.setAttribute('data-original-text', originalText);
            element.innerHTML = `
                <div class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                </div>
            `;
        }
    } else {
        element.disabled = false;
        element.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Restore original text if button
        if (element.tagName === 'BUTTON') {
            const originalText = element.getAttribute('data-original-text');
            if (originalText) {
                element.innerHTML = originalText;
                element.removeAttribute('data-original-text');
            }
        }
    }
}
// ✅ THÊM FUNCTION MỚI - View Notification Detail

async function viewNotification(id) {
    try {
        // Method 1: Tìm trong cache trước (nhanh hơn)
        let notification = null;
        
        if (window.sellerNotificationManager) {
            notification = window.sellerNotificationManager.notifications.find(n => n.notificationID === id);
        }
        
        // Method 2: Nếu không có trong cache, gọi API
        if (!notification) {
            console.log('📥 Loading notification from API...');
            try {
                notification = await apiRequest(`/notifications/seller/${id}`);
            } catch (error) {
                // Fallback: nếu lỗi API, dùng data từ table
                console.warn('⚠️ API failed, using cached data');
                notification = window.sellerNotificationManager?.notifications.find(n => n.notificationID === id);
            }
        }
        
        if (!notification) {
            showToast('Không tìm thấy thông báo', 'error');
            return;
        }
        
        // Show view modal
        window.sellerNotificationManager.showViewModal(notification);
        
    } catch (error) {
        console.error('❌ Error viewing notification:', error);
        showToast('Không thể xem chi tiết thông báo', 'error');
    }
}

// ============================================
// SELLER NOTIFICATION MANAGER CLASS
// ============================================

class SellerNotificationManager {
    constructor() {
        this.notifications = [];
        this.customers = [];
        this.templates = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.editingNotificationId = null;
        this.init();
    }

    async init() {
        try {
            console.log('🔔 Initializing Seller Notification Manager...');
            
            await this.loadTemplates();
            await this.loadCustomers();
            await this.loadNotifications();
            
            this.setupEventListeners();
            this.setupPreview();
            
            console.log('✅ Seller Notification Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing notification manager:', error);
            showToast('Không thể tải dữ liệu thông báo', 'error');
        }
    }
    // ✅ CẬP NHẬT loadNotifications method với COMPREHENSIVE ERROR HANDLING
async loadNotifications() {
    try {
        console.log(`📥 [LOAD] Starting loadNotifications - Page ${this.currentPage}/${this.totalPages}`);
        
        const params = new URLSearchParams({
            pageNumber: this.currentPage,
            pageSize: this.pageSize
        });

        // Add filters if present
        const search = document.getElementById('notification-search')?.value?.trim();
        const type = document.getElementById('notification-type-filter')?.value;
        
        if (search) {
            params.append('search', search);
            console.log(`🔍 [FILTER] Search: "${search}"`);
        }
        if (type) {
            params.append('type', type);
            console.log(`🏷️ [FILTER] Type: "${type}"`);
        }

        console.log(`🔗 [API] Request URL: /notifications/seller?${params}`);

        // Make API request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await apiRequest(`/notifications/seller?${params}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📊 [API] Raw Response:', response);
        console.log('📊 [API] Response Type:', typeof response);
        console.log('📊 [API] Response Keys:', response ? Object.keys(response) : 'null');
        
        // ✅ ENHANCED RESPONSE STRUCTURE DETECTION
        let notifications = [];
        let totalPages = 1;
        let totalCount = 0;
        
        if (!response) {
            console.warn('⚠️ [API] Null response received');
            notifications = [];
        }
        // Check for PagedResult format: { items: [], totalPages: X, currentPage: Y, totalCount: Z }
        else if (response.items && Array.isArray(response.items)) {
            console.log('✅ [FORMAT] PagedResult detected');
            notifications = response.items;
            totalPages = response.totalPages || Math.ceil((response.totalCount || 0) / this.pageSize);
            totalCount = response.totalCount || 0;
            
            console.log(`📊 [PAGED] Items: ${notifications.length}, Pages: ${totalPages}, Total: ${totalCount}`);
        }
        // Check for direct array format
        else if (Array.isArray(response)) {
            console.log('✅ [FORMAT] Direct array detected');
            notifications = response;
            totalPages = Math.max(1, Math.ceil(response.length / this.pageSize));
            totalCount = response.length;
            
            console.log(`📊 [ARRAY] Items: ${notifications.length}, Estimated Pages: ${totalPages}`);
        }
        // Check for legacy format: { data: [] }
        else if (response.data && Array.isArray(response.data)) {
            console.log('✅ [FORMAT] Legacy data format detected');
            notifications = response.data;
            totalPages = response.totalPages || Math.max(1, Math.ceil(response.data.length / this.pageSize));
            totalCount = response.totalCount || response.data.length;
            
            console.log(`📊 [LEGACY] Items: ${notifications.length}, Pages: ${totalPages}`);
        }
        // Unexpected format
        else {
            console.error('❌ [FORMAT] Unexpected response structure:', response);
            console.error('❌ [FORMAT] Available properties:', Object.keys(response || {}));
            
            // Try to extract any array-like data
            const possibleArrays = Object.values(response || {}).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0) {
                console.log('🔄 [RECOVERY] Found array in response, using as fallback');
                notifications = possibleArrays[0];
                totalPages = Math.max(1, Math.ceil(notifications.length / this.pageSize));
                totalCount = notifications.length;
            } else {
                notifications = [];
                totalPages = 1;
                totalCount = 0;
            }
        }
        
        // ✅ VALIDATE AND SANITIZE DATA
        if (!Array.isArray(notifications)) {
            console.error('❌ [VALIDATION] Notifications is not an array:', notifications);
            notifications = [];
        }
        
        // Ensure each notification has required properties
        notifications = notifications.map((notif, index) => {
            if (!notif || typeof notif !== 'object') {
                console.warn(`⚠️ [VALIDATION] Invalid notification at index ${index}:`, notif);
                return {
                    notificationID: index,
                    title: 'Invalid Notification',
                    content: 'Data corrupted',
                    type: 'error',
                    status: 'unknown',
                    createdAt: new Date().toISOString(),
                    totalSent: 0,
                    totalRead: 0
                };
            }
            
            // Ensure required properties exist
            return {
                notificationID: notif.notificationID || 0,
                title: notif.title || 'Untitled',
                content: notif.content || '',
                type: notif.type || 'announcement',
                status: notif.status || 'draft',
                icon: notif.icon || 'fa-bell',
                actionText: notif.actionText || null,
                actionUrl: notif.actionUrl || null,
                targetAudience: notif.targetAudience || 'all',
                scheduledAt: notif.scheduledAt || null,
                sentAt: notif.sentAt || null,
                createdAt: notif.createdAt || new Date().toISOString(),
                createdBy: notif.createdBy || 0,
                totalSent: notif.totalSent || 0,
                totalRead: notif.totalRead || 0
            };
        });
        
        // ✅ UPDATE STATE
        this.notifications = notifications;
        this.totalPages = totalPages;
        
        console.log(`✅ [STATE] Updated - Notifications: ${this.notifications.length}, Total Pages: ${this.totalPages}`);
        
        // ✅ VALIDATE CURRENT PAGE
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            console.warn(`⚠️ [PAGE] Current page ${this.currentPage} > total pages ${this.totalPages}, adjusting...`);
            this.currentPage = this.totalPages;
            return this.loadNotifications(); // Recursive call with correct page
        }
        
        // ✅ RENDER RESULTS
        this.renderNotifications();
        this.renderPagination();
        
        console.log(`✅ [SUCCESS] Notifications loaded successfully: Page ${this.currentPage}/${this.totalPages}, ${this.notifications.length} items`);
        
        // ✅ UPDATE UI INDICATORS
        this.updateUIIndicators(totalCount);
        
    } catch (error) {
        console.error('❌ [ERROR] Failed to load notifications:', error);
        
        // ✅ COMPREHENSIVE ERROR HANDLING
        let errorMessage = 'Không thể tải danh sách thông báo';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Yêu cầu tải dữ liệu quá lâu, vui lòng thử lại';
        } else if (error.message.includes('403')) {
            errorMessage = 'Bạn không có quyền truy cập. Vui lòng đăng nhập lại';
        } else if (error.message.includes('404')) {
            errorMessage = 'Không tìm thấy dữ liệu thông báo';
        } else if (error.message.includes('500')) {
            errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau';
        } else if (!navigator.onLine) {
            errorMessage = 'Không có kết nối internet';
        }
        
        // ✅ SET SAFE STATE ON ERROR
        this.notifications = [];
        this.totalPages = 1;
        
        this.renderNotifications();
        this.renderPagination();
        this.updateUIIndicators(0);
        
        showToast(errorMessage, 'error');
        
        // ✅ RETRY MECHANISM (optional)
        if (!error.message.includes('403') && !error.message.includes('404')) {
            console.log('🔄 [RETRY] Will allow manual retry...');
        }
    }
}

// ✅ THÊM METHOD MỚI: updateUIIndicators
updateUIIndicators(totalCount) {
    // Update any additional UI indicators
    const countElements = document.querySelectorAll('[data-notification-count]');
    countElements.forEach(el => {
        el.textContent = totalCount;
    });
    
    // Update page title if needed
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && pageTitle.textContent.includes('Thông báo')) {
        const baseTitle = 'Quản lý thông báo';
        pageTitle.textContent = totalCount > 0 ? `${baseTitle} (${totalCount})` : baseTitle;
    }
    
    console.log(`📊 [UI] Updated indicators with count: ${totalCount}`);
}

// ✅ ENHANCED renderPagination với FULL ERROR CHECKING
renderPagination() {
    const paginationContainer = document.getElementById('notifications-pagination-buttons');
    const paginationInfo = {
        start: document.getElementById('notifications-start'),
        end: document.getElementById('notifications-end'),
        total: document.getElementById('notifications-total')
    };
    
    console.log('🔧 [PAGINATION] Rendering - Current state:', {
        container: !!paginationContainer,
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        notificationsCount: this.notifications.length,
        pageSize: this.pageSize
    });
    
    // ✅ CHECK CONTAINER EXISTS
    if (!paginationContainer) {
        console.error('❌ [PAGINATION] Container "notifications-pagination-buttons" not found!');
        
        // ✅ DEBUG: List all pagination elements
        const allPaginationElements = document.querySelectorAll('[id*="pagination"], [id*="notification"]');
        console.log('🔍 [DEBUG] Available elements:', 
            Array.from(allPaginationElements).map(el => ({ 
                id: el.id, 
                tag: el.tagName,
                classes: el.className 
            }))
        );
        return;
    }

    // ✅ HANDLE EMPTY STATE
    if (this.totalPages === 0 || this.notifications.length === 0) {
        console.log('⚠️ [PAGINATION] Empty state detected');
        
        paginationContainer.innerHTML = `
            <span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md">
                <i class="fas fa-info-circle mr-2"></i>Không có dữ liệu
            </span>
        `;
        
        // ✅ UPDATE INFO DISPLAY
        if (paginationInfo.start) paginationInfo.start.textContent = '0';
        if (paginationInfo.end) paginationInfo.end.textContent = '0';
        if (paginationInfo.total) paginationInfo.total.textContent = '0';
        
        this.updateMobileButtons();
        console.log('✅ [PAGINATION] Empty state rendered');
        return;
    }

    // ✅ GENERATE PAGINATION HTML
    let paginationHTML = '';
    const maxVisiblePages = 5;
    
    // Calculate page range
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    console.log('📊 [PAGINATION] Calculation:', { 
        startPage, 
        endPage, 
        maxVisible: maxVisiblePages,
        currentPage: this.currentPage,
        totalPages: this.totalPages
    });

    // ✅ PREVIOUS BUTTON
    paginationHTML += this.currentPage > 1 ? 
        `<button onclick="window.sellerNotificationManager.goToPage(${this.currentPage - 1})" 
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 hover:text-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                title="Trang trước" data-page="${this.currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>` :
        `<button disabled 
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-300 rounded-l-md cursor-not-allowed">
            <i class="fas fa-chevron-left"></i>
        </button>`;

    // ✅ FIRST PAGE + ELLIPSIS
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="window.sellerNotificationManager.goToPage(1)" 
                    class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    data-page="1">
                1
            </button>
        `;
        
        if (startPage > 2) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">
                    ...
                </span>
            `;
        }
    }

    // ✅ PAGE NUMBERS
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === this.currentPage;
        paginationHTML += `
            <button onclick="window.sellerNotificationManager.goToPage(${i})" 
                    class="relative inline-flex items-center px-3 py-2 text-sm font-medium border transition-colors duration-150 ${isActive 
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 font-semibold' 
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-900'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    ${isActive ? 'aria-current="page"' : ''} data-page="${i}">
                ${i}
            </button>
        `;
    }

    // ✅ LAST PAGE + ELLIPSIS
    if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">
                    ...
                </span>
            `;
        }
        
        paginationHTML += `
            <button onclick="window.sellerNotificationManager.goToPage(${this.totalPages})" 
                    class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    data-page="${this.totalPages}">
                ${this.totalPages}
            </button>
        `;
    }

    // ✅ NEXT BUTTON
    paginationHTML += this.currentPage < this.totalPages ? 
        `<button onclick="window.sellerNotificationManager.goToPage(${this.currentPage + 1})" 
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 hover:text-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                title="Trang sau" data-page="${this.currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
        </button>` :
        `<button disabled 
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-300 rounded-r-md cursor-not-allowed">
            <i class="fas fa-chevron-right"></i>
        </button>`;

    // ✅ SET HTML AND VERIFY
    console.log('📝 [PAGINATION] Setting HTML, length:', paginationHTML.length);
    paginationContainer.innerHTML = paginationHTML;
    
    // ✅ VERIFY BUTTONS WERE CREATED
    const buttonsCreated = paginationContainer.querySelectorAll('button').length;
    console.log('✅ [PAGINATION] Buttons created:', buttonsCreated);
    
    if (buttonsCreated === 0) {
        console.error('❌ [PAGINATION] No buttons were created! HTML:', paginationHTML.substring(0, 200));
        return;
    }

    // ✅ UPDATE PAGINATION INFO
    const totalEstimated = this.totalPages * this.pageSize;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, start + this.notifications.length - 1);

    if (paginationInfo.start) paginationInfo.start.textContent = this.notifications.length > 0 ? start : 0;
    if (paginationInfo.end) paginationInfo.end.textContent = this.notifications.length > 0 ? end : 0;
    if (paginationInfo.total) paginationInfo.total.textContent = totalEstimated;

    // ✅ UPDATE MOBILE BUTTONS
    this.updateMobileButtons();

    console.log(`✅ [PAGINATION] Completed: Page ${this.currentPage}/${this.totalPages}, Items: ${start}-${end}/${totalEstimated}, Buttons: ${buttonsCreated}`);
}

// ✅ ENHANCED updateMobileButtons
updateMobileButtons() {
    const prevBtn = document.getElementById('mobile-prev-btn');
    const nextBtn = document.getElementById('mobile-next-btn');
    
    console.log('📱 [MOBILE] Updating buttons:', {
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn,
        currentPage: this.currentPage,
        totalPages: this.totalPages
    });
    
    if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                console.log('📱 [MOBILE] Previous button clicked');
                this.goToPage(this.currentPage - 1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = this.currentPage >= this.totalPages;
        nextBtn.onclick = () => {
            if (this.currentPage < this.totalPages) {
                console.log('📱 [MOBILE] Next button clicked');
                this.goToPage(this.currentPage + 1);
            }
        };
    }
}

// ✅ ENHANCED goToPage with COMPREHENSIVE DEBUGGING
async goToPage(page) {
    console.log(`📄 [GO_TO_PAGE] Request: ${page}, Current: ${this.currentPage}, Total: ${this.totalPages}`);
    
    // ✅ ENHANCED VALIDATION
    if (typeof page !== 'number' || isNaN(page) || page < 1 || page > this.totalPages) {
        console.warn(`⚠️ [GO_TO_PAGE] Invalid page: ${page} (type: ${typeof page}), valid range: 1-${this.totalPages}`);
        return;
    }
    
    if (page === this.currentPage) {
        console.log(`ℹ️ [GO_TO_PAGE] Already on page ${page}, no action needed`);
        return;
    }
    
    // ✅ SHOW LOADING STATE
    const paginationContainer = document.getElementById('notifications-pagination-buttons');
    const originalHTML = paginationContainer?.innerHTML;
    
    console.log('🔄 [GO_TO_PAGE] Starting navigation...', {
        hasContainer: !!paginationContainer,
        originalHTMLLength: originalHTML?.length || 0
    });
    
    if (paginationContainer) {
        paginationContainer.innerHTML = `
            <div class="flex items-center justify-center py-3 space-x-2">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span class="text-sm text-gray-600">Đang tải trang ${page}...</span>
            </div>
        `;
    }
    
    try {
        console.log(`🔄 [GO_TO_PAGE] Navigating from page ${this.currentPage} to ${page}...`);
        
        // ✅ UPDATE STATE AND LOAD
        const previousPage = this.currentPage;
        this.currentPage = page;
        
        await this.loadNotifications();
        
        // ✅ SCROLL TO NOTIFICATIONS SECTION
        const notificationsSection = document.getElementById('notifications-section');
        if (notificationsSection) {
            notificationsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('📍 [GO_TO_PAGE] Scrolled to notifications section');
        }
        
        console.log(`✅ [GO_TO_PAGE] Navigation completed successfully to page ${page}`);
        
    } catch (error) {
        console.error(`❌ [GO_TO_PAGE] Navigation failed to page ${page}:`, error);
        
        // ✅ REVERT STATE
        this.currentPage = previousPage;
        
        // ✅ RESTORE PAGINATION
        if (paginationContainer && originalHTML) {
            paginationContainer.innerHTML = originalHTML;
            console.log('🔄 [GO_TO_PAGE] Restored original pagination HTML');
        } else {
            this.renderPagination();
            console.log('🔄 [GO_TO_PAGE] Re-rendered pagination');
        }
        
        showToast(`Không thể tải trang ${page}. Vui lòng thử lại.`, 'error');
    }
}
    async loadCustomers() {
        try {
            const response = await apiRequest('/notifications/seller/customers');
            this.customers = response || [];
            
            this.renderCustomerList();
            console.log(`✅ Loaded ${this.customers.length} customers`);
        } catch (error) {
            console.error('❌ Error loading customers:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await apiRequest('/notifications/seller/notification-templates');
            this.templates = response || [];
            
            this.renderTemplateOptions();
            console.log(`✅ Loaded ${this.templates.length} templates`);
        } catch (error) {
            console.error('❌ Error loading templates:', error);
        }
    }

    renderNotifications() {
        const tbody = document.getElementById('notifications-table-body');
        if (!tbody) return;
    
        if (this.notifications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-bell-slash text-gray-300 text-4xl mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có thông báo</h3>
                            <p class="text-gray-500">Tạo thông báo đầu tiên để gửi đến khách hàng</p>
                            <button onclick="openNotificationModal()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                Tạo thông báo
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
    
        tbody.innerHTML = this.notifications.map(notification => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-start space-x-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas ${notification.icon || 'fa-bell'} text-blue-600"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-gray-900 truncate">${notification.title}</p>
                            <p class="text-xs text-gray-500 truncate">${this.stripHtml(notification.content).substring(0, 60)}...</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getTypeBadgeClass(notification.type)}">
                        ${this.getTypeText(notification.type)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(notification.status)}">
                        ${this.getStatusText(notification.status)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${this.getTargetText(notification.targetAudience)}</div>
                </td>
                <td class="px-6 py-4">
                    ${notification.status === 'sent' ? `
                        <div class="text-sm">
                            <div class="text-gray-900">Gửi: ${notification.totalSent || 0}</div>
                            <div class="text-green-600">Đọc: ${notification.totalRead || 0}</div>
                            <div class="text-blue-600">${notification.totalSent > 0 ? Math.round((notification.totalRead || 0) / notification.totalSent * 100) : 0}%</div>
                        </div>
                    ` : `
                        <span class="text-gray-400 text-sm">Chưa gửi</span>
                    `}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${formatTime(notification.createdAt)}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2">
                        <!-- ⭐ THÊM VIEW ACTION CHO TẤT CẢ -->
                        <button onclick="viewNotification(${notification.notificationID})" 
                                class="text-blue-600 hover:text-blue-900 text-sm" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        ${notification.status === 'draft' ? `
                            <button onclick="editNotification(${notification.notificationID})" 
                                    class="text-green-600 hover:text-green-900 text-sm" title="Chỉnh sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="sendNotification(${notification.notificationID})" 
                                    class="text-purple-600 hover:text-purple-900 text-sm" title="Gửi ngay">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button onclick="deleteNotification(${notification.notificationID})" 
                                    class="text-red-600 hover:text-red-900 text-sm" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button onclick="viewNotificationStats(${notification.notificationID})" 
                                    class="text-orange-600 hover:text-orange-900 text-sm" title="Xem thống kê">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderTemplateOptions() {
        const select = document.getElementById('notification-template');
        if (!select) return;

        const templateHTML = this.templates.map(template => `
            <option value="${template.type}" data-title="${template.titleTemplate}" data-content="${template.contentTemplate}" data-icon="${template.icon}">
                ${template.name}
            </option>
        `).join('');

        select.innerHTML = `<option value="">Tạo từ đầu</option>${templateHTML}`;
    }

    renderCustomerList() {
        const container = document.getElementById('customer-list');
        if (!container) return;

        container.innerHTML = this.customers.map(customer => `
            <label class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                <input type="checkbox" value="${customer.userID}" class="customer-checkbox">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-900 truncate">${customer.userName}</span>
                        <span class="text-xs px-2 py-1 rounded-full ${this.getCustomerTypeBadgeClass(customer.customerType)}">
                            ${customer.customerType}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${customer.totalOrders} đơn • ${formatMoney(customer.totalSpent)}
                    </div>
                </div>
            </label>
        `).join('');
    }
    
    setupEventListeners() {
        // Modal controls
        document.getElementById('create-notification-btn')?.addEventListener('click', () => this.openNotificationModal());
        document.getElementById('close-notification-modal')?.addEventListener('click', () => this.closeNotificationModal());
        document.getElementById('cancel-notification')?.addEventListener('click', () => this.closeNotificationModal());

        // Form controls
        document.getElementById('save-draft-notification')?.addEventListener('click', () => this.saveNotification('draft'));
        document.getElementById('send-notification')?.addEventListener('click', () => this.saveNotification('send'));

        // Search and filter
        document.getElementById('search-notifications-btn')?.addEventListener('click', () => this.loadNotifications());
        document.getElementById('notification-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadNotifications();
        });
        // ✅ ENHANCED SEARCH AND FILTER WITH PAGINATION RESET
    document.getElementById('search-notifications-btn')?.addEventListener('click', () => {
        this.currentPage = 1; // Reset to first page when searching
        this.loadNotifications();
    });
    
    document.getElementById('notification-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.currentPage = 1; // Reset to first page
            this.loadNotifications();
        }
    });
    
    document.getElementById('notification-type-filter')?.addEventListener('change', () => {
        this.currentPage = 1; // Reset to first page when filtering
        this.loadNotifications();
    });

    // ✅ PAGE SIZE SELECTOR (if exists)
    document.getElementById('page-size-selector')?.addEventListener('change', (e) => {
        const newPageSize = parseInt(e.target.value);
        if (newPageSize && newPageSize !== this.pageSize) {
            this.pageSize = newPageSize;
            this.currentPage = 1; // Reset to first page
            this.loadNotifications();
        }
    });
        // Template selection
        document.getElementById('notification-template')?.addEventListener('change', (e) => this.applyTemplate(e.target.value));

        // Target customers change
        document.getElementById('target-customers')?.addEventListener('change', (e) => this.handleTargetChange(e.target.value));

        // Schedule toggle
        document.getElementById('schedule-notification')?.addEventListener('change', (e) => {
            const section = document.getElementById('schedule-section');
            if (section) {
                section.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Character counting
        this.setupCharacterCounting();
    }

    setupCharacterCounting() {
        const titleInput = document.getElementById('notification-title');
        const contentTextarea = document.getElementById('notification-content');
        const titleCount = document.getElementById('title-count');
        const contentCount = document.getElementById('content-count');

        titleInput?.addEventListener('input', (e) => {
            if (titleCount) titleCount.textContent = e.target.value.length;
            this.updatePreview();
        });

        contentTextarea?.addEventListener('input', (e) => {
            if (contentCount) contentCount.textContent = e.target.value.length;
            this.updatePreview();
        });
    }

    setupPreview() {
        // Update preview when form fields change
        ['notification-title', 'notification-content', 'notification-type', 'action-text'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updatePreview());
        });
    }

    updatePreview() {
        const title = document.getElementById('notification-title')?.value || 'Tiêu đề thông báo';
        const content = document.getElementById('notification-content')?.value || 'Nội dung thông báo sẽ hiển thị ở đây...';
        const type = document.getElementById('notification-type')?.value;
        const actionText = document.getElementById('action-text')?.value;

        // Update preview elements
        document.getElementById('preview-title').textContent = title;
        document.getElementById('preview-content').textContent = content;
        
        // Update icon based on type
        const iconMap = {
            promotion: 'fa-percentage',
            new_product: 'fa-star',
            restock: 'fa-box',
            thank_you: 'fa-heart',
            seasonal: 'fa-gift',
            announcement: 'fa-bullhorn'
        };
        
        const previewIcon = document.getElementById('preview-icon');
        if (previewIcon) {
            previewIcon.className = `fas ${iconMap[type] || 'fa-store'} text-blue-600`;
        }

        // Show/hide action button
        const previewAction = document.getElementById('preview-action');
        if (previewAction) {
            if (actionText) {
                previewAction.classList.remove('hidden');
                previewAction.querySelector('button').textContent = actionText + ' →';
            } else {
                previewAction.classList.add('hidden');
            }
        }
    }

    applyTemplate(templateType) {
        if (!templateType) return;

        const template = this.templates.find(t => t.type === templateType);
        if (!template) return;

        // Apply template values
        document.getElementById('notification-title').value = template.titleTemplate;
        document.getElementById('notification-content').value = template.contentTemplate;
        document.getElementById('notification-type').value = template.type;

        // Update character counts
        document.getElementById('title-count').textContent = template.titleTemplate.length;
        document.getElementById('content-count').textContent = template.contentTemplate.length;

        this.updatePreview();
    }

    handleTargetChange(target) {
        const specificSection = document.getElementById('specific-customers-section');
        const targetCount = document.getElementById('target-count');

        if (target === 'specific') {
            specificSection?.classList.remove('hidden');
        } else {
            specificSection?.classList.add('hidden');
        }

        // Update target count
        this.updateTargetCount(target);
    }

    updateTargetCount(target) {
        let count = 0;

        switch (target) {
            case 'all':
                count = this.customers.length;
                break;
            case 'recent':
                count = this.customers.filter(c => {
                    const lastOrderDays = Math.floor((new Date() - new Date(c.lastOrderDate)) / (1000 * 60 * 60 * 24));
                    return lastOrderDays <= 30;
                }).length;
                break;
            case 'frequent':
                count = this.customers.filter(c => c.totalOrders >= 3).length;
                break;
            case 'vip':
                count = this.customers.filter(c => c.totalSpent >= 1000000).length;
                break;
            case 'specific':
                count = document.querySelectorAll('.customer-checkbox:checked').length;
                break;
        }

        document.getElementById('target-count').textContent = count;
    }

    async saveNotification(action) {
        const saveButton = document.getElementById(action === 'send' ? 'send-notification' : 'save-draft-notification');
        
        try {
            const formData = this.getFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            setLoadingState(saveButton, true);
            
            let response;
            
            if (this.editingNotificationId) {
                // ✅ API: PUT /api/notifications/seller/{id}
                console.log('📝 Updating notification:', this.editingNotificationId);
                response = await apiRequest(`/notifications/seller/${this.editingNotificationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                showToast('Thông báo đã được cập nhật!', 'success');
            } else {
                // ✅ API: POST /api/notifications/seller
                console.log('📤 Creating notification:', formData);
                response = await apiRequest('/notifications/seller', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }

            console.log('✅ Notification saved:', response);

            if (action === 'send') {
                // ✅ API: POST /api/notifications/seller/{id}/send
                const notificationId = response.notificationID || this.editingNotificationId;
                console.log('📨 Sending notification immediately...');
                await apiRequest(`/notifications/seller/${notificationId}/send`, {
                    method: 'POST'
                });
                showToast('Thông báo đã được gửi thành công!', 'success');
            } else {
                showToast('Thông báo đã được lưu nháp!', 'success');
            }

            this.closeNotificationModal();
            await this.loadNotifications();

        } catch (error) {
            console.error('❌ Error saving notification:', error);
            const errorMessage = error.message || 'Có lỗi xảy ra khi lưu thông báo';
            showToast(errorMessage, 'error');
        } finally {
            setLoadingState(saveButton, false);
        }
    }
// Show view notification modal (read-only)
showViewModal(notification) {
    // Create view modal if not exists
    let viewModal = document.getElementById('view-notification-modal');
    if (!viewModal) {
        viewModal = this.createViewModal();
        document.body.appendChild(viewModal);
    }

    // Populate notification data
    this.populateViewModal(notification);
    
    // Show modal
    viewModal.classList.remove('hidden');
}

// Create view notification modal
createViewModal() {
    const modal = document.createElement('div');
    modal.id = 'view-notification-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 hidden';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-eye text-blue-600 mr-2"></i>
                    Chi tiết thông báo
                </h3>
                <button onclick="document.getElementById('view-notification-modal').classList.add('hidden')" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="px-6 py-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Left Column: Notification Details -->
                    <div class="space-y-6">
                        <!-- Basic Info -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Thông tin cơ bản</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Tiêu đề:</label>
                                    <p id="view-title" class="text-sm text-gray-900 mt-1 font-medium"></p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Nội dung:</label>
                                    <p id="view-content" class="text-sm text-gray-900 mt-1 whitespace-pre-wrap"></p>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Loại:</label>
                                        <span id="view-type-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1">
                                            <span id="view-type-text"></span>
                                        </span>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Trạng thái:</label>
                                        <span id="view-status-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1">
                                            <span id="view-status-text"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action & Schedule Info -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Hành động & Lịch trình</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Văn bản hành động:</label>
                                    <p id="view-action-text" class="text-sm text-gray-900 mt-1"></p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">URL hành động:</label>
                                    <p id="view-action-url" class="text-sm text-blue-600 mt-1 break-all"></p>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Ngày tạo:</label>
                                        <p id="view-created-date" class="text-sm text-gray-900 mt-1"></p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Ngày gửi:</label>
                                        <p id="view-sent-date" class="text-sm text-gray-900 mt-1"></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Target Audience -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Đối tượng nhận</h4>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Nhóm khách hàng:</label>
                                <p id="view-target-audience" class="text-sm text-gray-900 mt-1"></p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Preview & Stats -->
                    <div class="space-y-6">
                        <!-- Preview -->
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-3">Xem trước thông báo</h4>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-start space-x-3">
                                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i id="view-preview-icon" class="fas fa-store text-blue-600"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p id="view-preview-title" class="text-sm font-medium text-gray-900"></p>
                                        <p id="view-preview-content" class="text-xs text-gray-600 mt-1 line-clamp-3"></p>
                                        <div id="view-preview-action" class="mt-2 hidden">
                                            <button class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                                                <span id="view-preview-action-text">Xem ngay →</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Stats (if sent) -->
                        <div id="view-stats-section" class="bg-purple-50 p-4 rounded-lg hidden">
                            <h4 class="font-medium text-gray-900 mb-3">Thống kê (nếu đã gửi)</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="text-center">
                                    <div id="view-total-sent" class="text-lg font-bold text-blue-600">0</div>
                                    <div class="text-xs text-gray-600">Tổng gửi</div>
                                </div>
                                <div class="text-center">
                                    <div id="view-total-read" class="text-lg font-bold text-green-600">0</div>
                                    <div class="text-xs text-gray-600">Đã đọc</div>
                                </div>
                            </div>
                            <div class="mt-3 text-center">
                                <div id="view-open-rate" class="text-lg font-bold text-purple-600">0%</div>
                                <div class="text-xs text-gray-600">Tỷ lệ mở</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-between">
                <div id="view-modal-actions" class="flex space-x-2">
                    <!-- Dynamic action buttons will be added here -->
                </div>
                <button onclick="document.getElementById('view-notification-modal').classList.add('hidden')" 
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                    Đóng
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Populate view modal with notification data
populateViewModal(notification) {
    // Basic info
    document.getElementById('view-title').textContent = notification.title || '';
    document.getElementById('view-content').textContent = notification.content || '';
    
    // Type badge
    const typeBadge = document.getElementById('view-type-badge');
    const typeText = document.getElementById('view-type-text');
    typeBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${this.getTypeBadgeClass(notification.type)}`;
    typeText.textContent = this.getTypeText(notification.type);
    
    // Status badge
    const statusBadge = document.getElementById('view-status-badge');
    const statusText = document.getElementById('view-status-text');
    statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${this.getStatusBadgeClass(notification.status)}`;
    statusText.textContent = this.getStatusText(notification.status);
    
    // Action & dates
    document.getElementById('view-action-text').textContent = notification.actionText || 'Không có';
    document.getElementById('view-action-url').textContent = notification.actionUrl || 'Không có';
    document.getElementById('view-created-date').textContent = formatTime(notification.createdAt);
    document.getElementById('view-sent-date').textContent = notification.sentAt ? formatTime(notification.sentAt) : 'Chưa gửi';
    
    // Target audience
    document.getElementById('view-target-audience').textContent = this.getTargetText(notification.targetAudience);
    
    // Preview
    const iconMap = {
        promotion: 'fa-percentage',
        new_product: 'fa-star',
        restock: 'fa-box',
        thank_you: 'fa-heart',
        seasonal: 'fa-gift',
        announcement: 'fa-bullhorn'
    };
    
    document.getElementById('view-preview-icon').className = `fas ${iconMap[notification.type] || 'fa-store'} text-blue-600`;
    document.getElementById('view-preview-title').textContent = notification.title;
    document.getElementById('view-preview-content').textContent = notification.content;
    
    // Preview action
    const previewAction = document.getElementById('view-preview-action');
    const previewActionText = document.getElementById('view-preview-action-text');
    if (notification.actionText) {
        previewAction.classList.remove('hidden');
        previewActionText.textContent = notification.actionText + ' →';
    } else {
        previewAction.classList.add('hidden');
    }
    
    // Stats (if sent)
    const statsSection = document.getElementById('view-stats-section');
    if (notification.status === 'sent') {
        statsSection.classList.remove('hidden');
        document.getElementById('view-total-sent').textContent = notification.totalSent || 0;
        document.getElementById('view-total-read').textContent = notification.totalRead || 0;
        const openRate = notification.totalSent > 0 ? Math.round((notification.totalRead || 0) / notification.totalSent * 100) : 0;
        document.getElementById('view-open-rate').textContent = `${openRate}%`;
    } else {
        statsSection.classList.add('hidden');
    }
    
    // Dynamic action buttons
    const actionsContainer = document.getElementById('view-modal-actions');
    let actionButtons = '';
    
    if (notification.status === 'draft') {
        actionButtons += `
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); editNotification(${notification.notificationID});" 
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-edit mr-1"></i> Chỉnh sửa
            </button>
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); sendNotification(${notification.notificationID});" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-paper-plane mr-1"></i> Gửi ngay
            </button>
        `;
    } else if (notification.status === 'sent') {
        actionButtons += `
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); viewNotificationStats(${notification.notificationID});" 
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <i class="fas fa-chart-bar mr-1"></i> Xem thống kê chi tiết
            </button>
        `;
    }
    
    actionsContainer.innerHTML = actionButtons;
}
    getFormData() {
        const target = document.getElementById('target-customers').value;
        const specificCustomers = target === 'specific' ? 
            Array.from(document.querySelectorAll('.customer-checkbox:checked')).map(cb => parseInt(cb.value)) : 
            null;

        return {
            title: document.getElementById('notification-title').value,
            content: document.getElementById('notification-content').value,
            type: document.getElementById('notification-type').value,
            actionText: document.getElementById('action-text').value || null,
            actionUrl: document.getElementById('action-url').value || null,
            targetCustomers: target,
            specificCustomerIds: specificCustomers,
            scheduledAt: document.getElementById('schedule-notification').checked ? 
                document.getElementById('scheduled-time').value || null : null
        };
    }

    validateForm(data) {
        if (!data.title) {
            showToast('Vui lòng nhập tiêu đề thông báo', 'error');
            return false;
        }

        if (!data.content) {
            showToast('Vui lòng nhập nội dung thông báo', 'error');
            return false;
        }

        if (!data.type) {
            showToast('Vui lòng chọn loại thông báo', 'error');
            return false;
        }

        if (!data.targetCustomers) {
            showToast('Vui lòng chọn đối tượng gửi', 'error');
            return false;
        }

        if (data.targetCustomers === 'specific' && (!data.specificCustomerIds || data.specificCustomerIds.length === 0)) {
            showToast('Vui lòng chọn ít nhất một khách hàng', 'error');
            return false;
        }

        return true;
    }
// ============================================
// THÊM VÀO CLASS SellerNotificationManager
// ============================================

// Edit notification method

// ✅ CẬP NHẬT editNotification method để load đầy đủ data

editNotification(notification) {
    try {
        console.log('🔧 Starting edit notification:', notification);
        
        // Validate notification data
        if (!notification) {
            console.error('❌ No notification data provided');
            showToast('Không tìm thấy dữ liệu thông báo', 'error');
            return;
        }

        // Check if notification can be edited
        if (notification.status !== 'draft') {
            console.warn('⚠️ Cannot edit non-draft notification:', notification.status);
            showToast('Chỉ có thể chỉnh sửa thông báo ở trạng thái nháp', 'warning');
            return;
        }

        // ⭐ POPULATE FORM WITH COMPLETE DATA
        const titleInput = document.getElementById('notification-title');
        const contentInput = document.getElementById('notification-content');
        const typeSelect = document.getElementById('notification-type');
        const actionTextInput = document.getElementById('action-text');
        const actionUrlInput = document.getElementById('action-url');
        
        // Check if form elements exist
        if (!titleInput || !contentInput || !typeSelect) {
            console.error('❌ Form elements not found');
            showToast('Không tìm thấy form. Vui lòng tải lại trang.', 'error');
            return;
        }

        // Fill basic fields
        titleInput.value = notification.title || '';
        contentInput.value = notification.content || '';
        typeSelect.value = notification.type || '';
        
        if (actionTextInput) actionTextInput.value = notification.actionText || '';
        if (actionUrlInput) actionUrlInput.value = notification.actionUrl || '';
        
        console.log('✅ Form fields populated:', {
            title: notification.title,
            content: notification.content,
            type: notification.type,
            actionText: notification.actionText,
            actionUrl: notification.actionUrl
        });
        
        // ⭐ HANDLE TARGET AUDIENCE PROPERLY
        const targetSelect = document.getElementById('target-customers');
        if (targetSelect) {
            const targetAudience = notification.targetAudience || '';
            console.log('🎯 Processing target audience:', targetAudience);
            
            if (targetAudience.includes('_all')) {
                targetSelect.value = 'all';
            } else if (targetAudience.includes('_recent')) {
                targetSelect.value = 'recent';
            } else if (targetAudience.includes('_frequent')) {
                targetSelect.value = 'frequent';
            } else if (targetAudience.includes('_vip')) {
                targetSelect.value = 'vip';
            } else if (targetAudience.includes('_specific')) {
                targetSelect.value = 'specific';
                // Show specific customers section
                const specificSection = document.getElementById('specific-customers-section');
                if (specificSection) {
                    specificSection.classList.remove('hidden');
                }
            } else {
                // Default to 'all' if target audience is unclear
                targetSelect.value = 'all';
            }
            
            console.log('✅ Target audience set:', targetSelect.value);
        }
        
        // ⭐ UPDATE CHARACTER COUNTS
        const titleCount = document.getElementById('title-count');
        const contentCount = document.getElementById('content-count');
        
        if (titleCount) titleCount.textContent = (notification.title || '').length;
        if (contentCount) contentCount.textContent = (notification.content || '').length;
        
        // ⭐ HANDLE SCHEDULED NOTIFICATION
        const scheduleCheckbox = document.getElementById('schedule-notification');
        const scheduleSection = document.getElementById('schedule-section');
        const scheduledTimeInput = document.getElementById('scheduled-time');
        
        if (scheduleCheckbox && scheduleSection && scheduledTimeInput) {
            if (notification.scheduledAt) {
                scheduleCheckbox.checked = true;
                scheduleSection.classList.remove('hidden');
                
                // Convert UTC time to local time for input
                try {
                    const scheduledDate = new Date(notification.scheduledAt);
                    const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000);
                    scheduledTimeInput.value = localDateTime.toISOString().slice(0, 16);
                    console.log('✅ Scheduled time set:', scheduledTimeInput.value);
                } catch (dateError) {
                    console.error('❌ Error parsing scheduled date:', dateError);
                }
            } else {
                scheduleCheckbox.checked = false;
                scheduleSection.classList.add('hidden');
                scheduledTimeInput.value = '';
            }
        }
        
        // ⭐ UPDATE TARGET COUNT
        if (targetSelect) {
            this.handleTargetChange(targetSelect.value);
        }
        
        // ⭐ SET EDIT MODE
        this.editingNotificationId = notification.notificationID;
        const modalTitle = document.getElementById('notification-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Chỉnh sửa thông báo';
        }
        
        // ⭐ SHOW MODAL AND UPDATE PREVIEW
        this.openNotificationModalForEdit();
        this.updatePreview();
        
        console.log('✅ Notification loaded for editing successfully:', notification.notificationID);
        showToast('Đã tải thông tin thông báo để chỉnh sửa', 'success');
        
    } catch (error) {
        console.error('❌ Error in editNotification method:', error);
        showToast('Có lỗi xảy ra khi tải form chỉnh sửa', 'error');
    }
}

// ⭐ THÊM METHOD MỚI: openNotificationModalForEdit
openNotificationModalForEdit() {
    // Don't reset form when editing
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    // Don't call resetForm() here because we want to keep the data
    this.updateTargetCount('all'); // This will be updated by handleTargetChange
    this.updatePreview();
}

// ⭐ CẬP NHẬT openNotificationModal để reset edit mode
openNotificationModal() {
    // Reset edit mode only for new notifications
    this.editingNotificationId = null;
    const modalTitle = document.getElementById('notification-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Tạo thông báo mới';
    }
    
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    this.resetForm();
    this.updateTargetCount('all');
    this.updatePreview();
}
// Complete renderPagination implementation



// Show statistics modal
async showStatsModal(notificationId) {
    try {
        // ✅ API: GET /api/notifications/seller/{id}/stats
        const stats = await apiRequest(`/notifications/seller/${notificationId}/stats`);
        
        // Create stats modal if not exists
        let statsModal = document.getElementById('stats-modal');
        if (!statsModal) {
            statsModal = this.createStatsModal();
            document.body.appendChild(statsModal);
        }

        // Populate stats data
        this.populateStats(stats);
        
        // Show modal
        statsModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        showToast('Không thể tải thống kê thông báo', 'error');
    }
}

// Create statistics modal
createStatsModal() {
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 hidden';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">Thống kê thông báo</h3>
                <button onclick="document.getElementById('stats-modal').classList.add('hidden')" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="px-6 py-4">
                <!-- Stats Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600" id="stats-total-sent">0</div>
                        <div class="text-sm text-gray-600">Tổng gửi</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600" id="stats-total-read">0</div>
                        <div class="text-sm text-gray-600">Đã đọc</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-600" id="stats-open-rate">0%</div>
                        <div class="text-sm text-gray-600">Tỷ lệ mở</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600" id="stats-click-rate">0%</div>
                        <div class="text-sm text-gray-600">Tỷ lệ click</div>
                    </div>
                </div>

                <!-- Notification Details -->
                <div class="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 class="font-medium text-gray-900 mb-3">Chi tiết thông báo</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Tiêu đề:</label>
                            <p id="stats-title" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Loại:</label>
                            <p id="stats-type" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Ngày gửi:</label>
                            <p id="stats-sent-date" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Đối tượng:</label>
                            <p id="stats-target" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                    </div>
                </div>

                <!-- Customer Interactions Table -->
                <div class="mb-6">
                    <h4 class="font-medium text-gray-900 mb-3">Tương tác khách hàng</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian đọc</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody id="stats-customer-interactions" class="bg-white divide-y divide-gray-200">
                                <!-- Customer interaction data will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button onclick="document.getElementById('stats-modal').classList.add('hidden')" 
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                    Đóng
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Populate statistics data
populateStats(stats) {
    // Overview stats
    document.getElementById('stats-total-sent').textContent = stats.totalSent || 0;
    document.getElementById('stats-total-read').textContent = stats.totalRead || 0;
    
    const openRate = stats.totalSent > 0 ? Math.round((stats.totalRead / stats.totalSent) * 100) : 0;
    document.getElementById('stats-open-rate').textContent = `${openRate}%`;
    
    const clickRate = stats.totalClicks ? Math.round((stats.totalClicks / stats.totalSent) * 100) : 0;
    document.getElementById('stats-click-rate').textContent = `${clickRate}%`;

    // Notification details
    document.getElementById('stats-title').textContent = stats.title || '';
    document.getElementById('stats-type').textContent = this.getTypeText(stats.type) || '';
    document.getElementById('stats-sent-date').textContent = stats.sentAt ? formatTime(stats.sentAt) : '';
    document.getElementById('stats-target').textContent = this.getTargetText(stats.targetAudience) || '';

    // Customer interactions
    const interactionsTable = document.getElementById('stats-customer-interactions');
    if (stats.customerInteractions && stats.customerInteractions.length > 0) {
        interactionsTable.innerHTML = stats.customerInteractions.map(interaction => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${interaction.customerName}</div>
                    <div class="text-sm text-gray-500">${interaction.customerEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${interaction.isRead ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${interaction.isRead ? '✅ Đã đọc' : '📬 Chưa đọc'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${interaction.readAt ? formatTime(interaction.readAt) : 'Chưa đọc'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${interaction.actionClicked ? '🔗 Đã click' : '⏳ Chưa có hành động'}
                </td>
            </tr>
        `).join('');
    } else {
        interactionsTable.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu tương tác
                </td>
            </tr>
        `;
    }
}

// ⭐ Update saveNotification để handle edit mode
async saveNotification(action) {
    const saveButton = document.getElementById(action === 'send' ? 'send-notification' : 'save-draft-notification');
    
    try {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        setLoadingState(saveButton, true);
        
        let response;
        
        if (this.editingNotificationId) {
            // Update existing notification
            console.log('📝 Updating notification:', this.editingNotificationId);
            response = await apiRequest(`/notifications/seller/${this.editingNotificationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            showToast('Thông báo đã được cập nhật!', 'success');
        } else {
            // Create new notification
            console.log('📤 Creating notification:', formData);
            response = await apiRequest('/notifications/seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        console.log('✅ Notification saved:', response);

        if (action === 'send') {
            // Send immediately
            const notificationId = response.notificationID || this.editingNotificationId;
            console.log('📨 Sending notification immediately...');
            await apiRequest(`/notifications/seller/${notificationId}/send`, {
                method: 'POST'
            });
            showToast('Thông báo đã được gửi thành công!', 'success');
        }

        this.closeNotificationModal();
        await this.loadNotifications();

    } catch (error) {
        console.error('❌ Error saving notification:', error);
        const errorMessage = error.message || 'Có lỗi xảy ra khi lưu thông báo';
        showToast(errorMessage, 'error');
    } finally {
        setLoadingState(saveButton, false);
    }
}

// Update openNotificationModal để reset edit mode
openNotificationModal() {
    // Reset edit mode
    this.editingNotificationId = null;
    document.getElementById('notification-modal-title').textContent = 'Tạo thông báo mới';
    
    document.getElementById('notification-modal')?.classList.remove('hidden');
    this.resetForm();
    this.updateTargetCount('all');
    this.updatePreview();
}
    openNotificationModal() {
        document.getElementById('notification-modal')?.classList.remove('hidden');
        this.resetForm();
        this.updateTargetCount('all');
        this.updatePreview();
    }

    closeNotificationModal() {
        document.getElementById('notification-modal')?.classList.add('hidden');
    }

    resetForm() {
        document.getElementById('notification-form')?.reset();
        document.getElementById('specific-customers-section')?.classList.add('hidden');
        document.getElementById('schedule-section')?.classList.add('hidden');
        document.getElementById('title-count').textContent = '0';
        document.getElementById('content-count').textContent = '0';
        document.querySelectorAll('.customer-checkbox').forEach(cb => cb.checked = false);
    }

    // Utility methods
    getTypeBadgeClass(type) {
        const classes = {
            promotion: 'bg-green-100 text-green-800',
            new_product: 'bg-blue-100 text-blue-800',
            restock: 'bg-yellow-100 text-yellow-800',
            thank_you: 'bg-pink-100 text-pink-800',
            seasonal: 'bg-purple-100 text-purple-800',
            announcement: 'bg-gray-100 text-gray-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    getTypeText(type) {
        const texts = {
            promotion: '🎉 Khuyến mãi',
            new_product: '🆕 Sản phẩm mới',
            restock: '📦 Hàng có sẵn',
            thank_you: '💝 Cảm ơn',
            seasonal: '🌟 Theo mùa',
            announcement: '📢 Thông báo'
        };
        return texts[type] || '📢 Thông báo';
    }

    getStatusBadgeClass(status) {
        const classes = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-green-100 text-green-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusText(status) {
        const texts = {
            draft: 'Nháp',
            sent: 'Đã gửi'
        };
        return texts[status] || 'Không xác định';
    }

    getTargetText(audience) {
        if (audience.includes('all')) return 'Tất cả KH';
        if (audience.includes('recent')) return 'KH gần đây';
        if (audience.includes('frequent')) return 'KH thường xuyên';
        if (audience.includes('vip')) return 'KH VIP';
        if (audience.includes('specific')) return 'KH cụ thể';
        return 'Không xác định';
    }

    getCustomerTypeBadgeClass(type) {
        const classes = {
            Regular: 'bg-gray-100 text-gray-800',
            Frequent: 'bg-blue-100 text-blue-800',
            VIP: 'bg-purple-100 text-purple-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    renderPagination() {
        // Implementation for pagination rendering
        // Similar to other pagination implementations in the project
    }
}

// ============================================
// GLOBAL FUNCTIONS WITH ENHANCED ERROR HANDLING
// ============================================

async function sendNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn gửi thông báo này?')) return;

    const button = event?.target?.closest('button');
    
    try {
        setLoadingState(button, true);
        
        await apiRequest(`/notifications/seller/${id}/send`, { method: 'POST' });
        showToast('Thông báo đã được gửi thành công!', 'success');
        
        // Reload notifications after successful send
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.loadNotifications();
        }
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        showToast(`Có lỗi xảy ra khi gửi thông báo: ${error.message}`, 'error');
    } finally {
        setLoadingState(button, false);
    }
}

async function deleteNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;

    const button = event?.target?.closest('button');
    
    try {
        setLoadingState(button, true);
        
        // ✅ API: DELETE /api/notifications/seller/{id}
        await apiRequest(`/notifications/seller/${id}`, { method: 'DELETE' });
        showToast('Thông báo đã được xóa thành công!', 'success');
        
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.loadNotifications();
        }
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        showToast(`Có lỗi xảy ra khi xóa thông báo: ${error.message}`, 'error');
    } finally {
        setLoadingState(button, false);
    }
}
// ✅ SỬA LẠI editNotification function - HOÀN CHỈNH
async function editNotification(id) {
    try {
        let notification = null;
        
        // Method 1: Tìm trong cache trước (nhanh và tránh lỗi API)
        if (window.sellerNotificationManager && window.sellerNotificationManager.notifications) {
            notification = window.sellerNotificationManager.notifications.find(n => n.notificationID === id);
            console.log('🔍 Found in cache:', notification);
        }
        
        // Method 2: Nếu không có trong cache, gọi API
        if (!notification) {
            console.log('📥 Loading notification from API...');
            try {
                notification = await apiRequest(`/notifications/seller/${id}`);
                console.log('✅ Loaded from API:', notification);
            } catch (apiError) {
                console.error('❌ API Error:', apiError);
                
                // Enhanced error messages
                if (apiError.message.includes('403')) {
                    showToast('Bạn chỉ có thể chỉnh sửa thông báo của chính mình.', 'error');
                } else if (apiError.message.includes('404')) {
                    showToast('Không tìm thấy thông báo. Có thể đã bị xóa.', 'error');
                } else {
                    showToast('Không thể tải thông báo. Vui lòng tải lại trang.', 'warning');
                }
                return;
            }
        }
        
        // Validate notification exists
        if (!notification) {
            showToast('Không tìm thấy thông báo để chỉnh sửa', 'error');
            return;
        }
        
        // Validate can edit (only draft status)
        if (notification.status !== 'draft') {
            showToast('Chỉ có thể chỉnh sửa thông báo ở trạng thái nháp', 'warning');
            return;
        }
        
        // Load for editing
        if (window.sellerNotificationManager) {
            console.log('📝 Loading notification for edit:', notification);
            window.sellerNotificationManager.editNotification(notification);
        } else {
            showToast('Hệ thống chưa sẵn sàng. Vui lòng thử lại.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error in editNotification:', error);
        showToast('Không thể chỉnh sửa thông báo', 'error');
    }
}

async function viewNotificationStats(id) {
    try {
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.showStatsModal(id);
        }
    } catch (error) {
        console.error('❌ Error viewing notification stats:', error);
        showToast('Không thể xem thống kê thông báo', 'error');
    }
}

function openNotificationModal() {
    if (window.sellerNotificationManager) {
        window.sellerNotificationManager.openNotificationModal();
    }
}

// ============================================
// INITIALIZATION WITH DEPENDENCY CHECK
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Content Loaded, checking dependencies...');
    
    // Check if required elements exist
    if (!document.getElementById('notifications-section')) {
        console.log('⚠️ Notifications section not found, skipping initialization');
        return;
    }
    
    // Check if required CSS classes are available (Tailwind CSS)
    const testElement = document.createElement('div');
    testElement.className = 'bg-blue-500';
    document.body.appendChild(testElement);
    const hasCSS = getComputedStyle(testElement).backgroundColor !== '';
    document.body.removeChild(testElement);
    
    if (!hasCSS) {
        console.warn('⚠️ CSS framework (Tailwind) may not be loaded');
    }
    
    try {
        // Initialize Seller Notification Manager
        window.sellerNotificationManager = new SellerNotificationManager();
        console.log('✅ Seller Notification Manager initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Seller Notification Manager:', error);
        showToast('Không thể khởi tạo hệ thống thông báo. Vui lòng tải lại trang.', 'error');
    }
});

// ============================================
// ERROR HANDLING FOR UNHANDLED PROMISES
// ============================================

window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Có lỗi không mong muốn xảy ra. Vui lòng thử lại.', 'error');
});
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize only when on notifications section
    if (document.getElementById('notifications-section')) {
        window.sellerNotificationManager = new SellerNotificationManager();
    }
});