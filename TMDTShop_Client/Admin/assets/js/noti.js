// API Configuration
const API_BASE = 'https://localhost:7088/api';

const API_ENDPOINTS = {
    admin: {
        getNotifications: '/notifications/admin',
        getById: '/notifications/admin',
        create: '/notifications/admin',
        update: '/notifications/admin',
        delete: '/notifications/admin',
        send: '/notifications/admin',
        recipientCount: '/notifications/admin/recipient-count'
    },
    user: {
        getNotifications: '/notifications/user',
        markAsRead: '/notifications/user',
        delete: '/notifications/user',
        unreadCount: '/notifications/user/unread-count'
    }
};

// Global variables
let notifications = [];
let userNotifications = []; // Thêm biến cho user notifications
let currentPage = 1;
let userCurrentPage = 1; // Thêm cho user pagination
let itemsPerPage = 10;
let totalPages = 1;
let userTotalPages = 1; // Thêm cho user pagination
let currentNotification = null;
let totalCount = 0;
let userTotalCount = 0; // Thêm cho user count
let currentView = 'admin'; // 'admin' hoặc 'user'

// JWT Token management
function getAuthToken() {
    // Thử tất cả các key có thể
    const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
    
    for (const key of possibleKeys) {
        const token = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (token) {
            console.log(`Found token with key: ${key}`);
            return token;
        }
    }
    
    console.error('No auth token found in storage');
    return null;
}

function setAuthHeaders() {
    const token = getAuthToken();
    if (!token) {
        console.error('No auth token found');
        return {
            'Content-Type': 'application/json'
        };
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// API Helper functions
async function apiRequest(url, options = {}) {
    try {
        console.log('Making API request to:', `${API_BASE}${url}`);
        console.log('Options:', options);
        
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers: {
                ...setAuthHeaders(),
                ...options.headers
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
// ============================================
// 2. ROBUST RESPONSE HANDLER
// ============================================
function parsePagedResponse(response, requestedPage) {
    console.log('🔍 Parsing response:', response);
    
    let result = {
        items: [],
        currentPage: 1,
        totalPages: 1,
        totalCount: 0
    };

    try {
        if (!response) {
            console.warn('⚠️ Empty response');
            return result;
        }

        // Case 1: Standard PagedResult from C# backend
        if (response.items && Array.isArray(response.items)) {
            result.items = response.items;
            result.currentPage = Math.max(1, parseInt(response.pageNumber) || requestedPage);
            result.totalPages = Math.max(1, parseInt(response.totalPages) || 1);
            result.totalCount = Math.max(0, parseInt(response.totalCount) || 0);
            
            console.log('✅ Parsed as PagedResult:', result);
            return result;
        }

        // Case 2: Direct array
        if (Array.isArray(response)) {
            result.items = response;
            result.totalCount = response.length;
            result.totalPages = Math.max(1, Math.ceil(response.length / itemsPerPage));
            result.currentPage = Math.min(requestedPage, result.totalPages);
            
            console.log('✅ Parsed as Array:', result);
            return result;
        }

        // Case 3: Single object
        if (typeof response === 'object') {
            result.items = [response];
            result.totalCount = 1;
            result.totalPages = 1;
            result.currentPage = 1;
            
            console.log('✅ Parsed as Single Object:', result);
            return result;
        }

        console.warn('⚠️ Unknown response format, using defaults');
        return result;

    } catch (error) {
        console.error('❌ Error parsing response:', error);
        return result;
    }
}
// Initialize system
async function initializeSystem() {
    try {
        const token = getAuthToken();
        if (!token) {
            showError('Vui lòng đăng nhập để sử dụng chức năng này');
            return;
        }
        
        // Load unread count for user notifications
        await loadUnreadCount();
        
        // Load admin notifications by default
        if (currentView === 'admin') {
            await fetchAdminNotifications(1);
        } else {
            await fetchUserNotifications(1);
        }
    } catch (error) {
        console.error('Lỗi khởi tạo hệ thống:', error);
        showError('Không thể tải dữ liệu từ server: ' + error.message);
        loadLocalStorageData();
    }
}

// ============================================
// ADMIN FUNCTIONS ()
// ============================================
async function fetchAdminNotifications(page = 1) {
    console.log(`🚀 Fetching admin notifications - Page: ${page}, ItemsPerPage: ${itemsPerPage}`);
    
    // Validate input
    page = Math.max(1, parseInt(page) || 1);
    
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const table = document.getElementById('notification-table');

    try {
        // Show loading state
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        if (table) table.style.display = 'none';

        // Build query parameters
        const params = new URLSearchParams({
            pageNumber: page.toString(),
            pageSize: itemsPerPage.toString()
        });

        // Add filters
        const filters = {
            search: document.getElementById('search')?.value?.trim(),
            type: document.getElementById('type-filter')?.value,
            dateFrom: document.getElementById('date-from')?.value,
            dateTo: document.getElementById('date-to')?.value
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                if (key.includes('date')) {
                    params.append(key, new Date(value).toISOString());
                } else {
                    params.append(key, value);
                }
            }
        });

        const apiUrl = `${API_ENDPOINTS.admin.getNotifications}?${params.toString()}`;

        // Make API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await apiRequest(apiUrl, {
            method: 'GET',
            headers: setAuthHeaders(),
            signal: controller.signal
            
        });
        

        clearTimeout(timeoutId);
        console.log('📥 Raw API Response:', response);

        // Parse response using robust handler
        const parsed = parsePagedResponse(response, page);
        
        // ⭐ CRITICAL: Validate parsed data
        if (parsed.currentPage > parsed.totalPages && parsed.totalPages > 0) {
            console.warn(`🔄 Requested page ${parsed.currentPage} > total pages ${parsed.totalPages}, redirecting to page 1`);
            await fetchAdminNotifications(1);
            return;
        }

        // Update global state
        notifications = parsed.items;
        currentPage = parsed.currentPage;
        totalPages = parsed.totalPages;
        totalCount = parsed.totalCount;

        console.log('🎯 Final State Update:', {
            notificationsCount: notifications.length,
            currentPage,
            totalPages,
            totalCount,
            requestedPage: page
        });

        // Update UI
        renderNotificationTable();
        updateAdminPagination();

        // Show table
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
        
        console.log('✅ Admin notifications loaded successfully');
        
    } catch (err) {
        console.error('❌ Error fetching admin notifications:', err);
        
        // Reset to safe state
        notifications = [];
        currentPage = 1;
        totalPages = 1;
        totalCount = 0;
        
        renderNotificationTable();
        updateAdminPagination();
        
        if (loading) loading.style.display = 'none';
        
        // Show user-friendly error
        if (err.name === 'AbortError') {
            showError('Yêu cầu đã bị hủy do quá thời gian chờ');
        } else {
            showError(`Không thể tải danh sách thông báo: ${err.message}`);
        }
    }
}
function findFirstElement(selectors) {
    for (const id of selectors) {
        const element = document.getElementById(id);
        if (element) {
            console.log(`Found element: ${id}`);
            return element;
        }
    }
    console.warn('No element found from selectors:', selectors);
    return null;
}
function toggleButtonState(button, disabled) {
    if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function updateAdminPagination() {
    console.log('🔄 [ADMIN] Updating pagination:', { currentPage, totalPages, totalCount });
    
    if (currentView !== 'admin') {
        return;
    }
    
    // ⭐ FIX: SỬ DỤNG ĐÚNG ID TỪ HTML TEMPLATE
    const currentPageInfo = document.getElementById('currentPageInfo');
    const totalPagesInfo = document.getElementById('totalPagesInfo');
    const totalItemsInfo = document.getElementById('totalItemsInfo');
    
    if (currentPageInfo) {
        currentPageInfo.textContent = currentPage;
    }
    
    if (totalPagesInfo) {
        totalPagesInfo.textContent = totalPages;
    }
    
    if (totalItemsInfo) {
        totalItemsInfo.textContent = totalCount;
    }

    // Update Previous button
    const prevButton = document.getElementById('prev-page');
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
        prevButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                fetchAdminNotifications(currentPage - 1);
            }
        };
        toggleButtonState(prevButton, currentPage <= 1);
    }
    
    // Update Next button
    const nextButton = document.getElementById('next-page');
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
        nextButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                console.log('➡️ [ADMIN] Going to next page:', currentPage + 1);
                fetchAdminNotifications(currentPage + 1);
            }
        };
        toggleButtonState(nextButton, currentPage >= totalPages);
    }
    
    // Update page input
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
        pageInput.min = 1;
        
        // Remove old listeners and add new one
        const newInput = pageInput.cloneNode(true);
        pageInput.parentNode.replaceChild(newInput, pageInput);
        newInput.addEventListener('keypress', handleAdminPageEnter);
    }

    // Update Go button
    const goButton = document.getElementById('go-page');
    if (goButton) {
        goButton.onclick = (e) => {
            e.preventDefault();
            goToAdminPage();
        };
    }
    
}

function updateAdminNavButton(direction, disabled, action) {
    const buttonId = direction === 'prev' ? 
        (document.getElementById('admin-prev-page') ? 'admin-prev-page' : 'prev-page') :
        (document.getElementById('admin-next-page') ? 'admin-next-page' : 'next-page');
    
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = disabled;
    button.onclick = (e) => {
        e.preventDefault();
        if (!disabled) action();
    };
    
    // Visual feedback
    if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function handleAdminPageEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToAdminPage();
    }
}
function goToAdminPage() {
    const pageInput = document.getElementById('page-input'); // ⭐ SỬ DỤNG ĐÚNG ID TỪ HTML
    
    if (!pageInput) {
        console.error('❌ [ADMIN] Page input not found');
        return;
    }
    
    const newPage = parseInt(pageInput.value);
    
    console.log('🎯 [ADMIN] Go to page request:', { newPage, currentPage, totalPages });
    
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (≥ 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        console.log('🚀 [ADMIN] Navigating to page:', newPage);
        fetchAdminNotifications(newPage);
    } else {
        console.log('⏭️ [ADMIN] Same page, no action needed');
    }
}

// ============================================
// USER NOTIFICATION FUNCTIONS (MỚI THÊM)
// ============================================

async function fetchUserNotifications(page = 1, unreadOnly = false) {
    console.log('Fetching user notifications, page:', page, 'unreadOnly:', unreadOnly);
    
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const table = document.getElementById('user-notification-table') || document.getElementById('notification-table');

    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    if (table) table.style.display = 'none';

    try {
        const params = new URLSearchParams({
            pageNumber: page.toString(),
            pageSize: itemsPerPage.toString(),
            unreadOnly: unreadOnly.toString()
        });

        const response = await apiRequest(`${API_ENDPOINTS.user.getNotifications}?${params.toString()}`);
        
        console.log('User notifications response:', response);

        // Handle different response formats
        if (response.items) {
            userNotifications = response.items || [];
            userCurrentPage = response.pageNumber || page;
            userTotalPages = response.totalPages || 1;
            userTotalCount = response.totalCount || 0;
        } else if (Array.isArray(response)) {
            userNotifications = response;
            userCurrentPage = page;
            userTotalPages = Math.ceil(response.length / itemsPerPage);
            userTotalCount = response.length;
        } else {
            userNotifications = [response];
            userCurrentPage = 1;
            userTotalPages = 1;
            userTotalCount = 1;
        }

        renderUserNotificationTable();
        updateUserPagination();

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
        
        console.log('User notifications loaded successfully');
    } catch (err) {
        showError('Không thể tải thông báo người dùng: ' + err.message);
        if (loading) loading.style.display = 'none';
        console.error('Lỗi tải thông báo người dùng:', err);
    }
}
async function loadUnreadCount() {
    try {
        const response = await apiRequest(API_ENDPOINTS.user.unreadCount);
        const unreadCount = response.unreadCount || 0;
        
        // Cập nhật UI hiển thị số thông báo chưa đọc
        updateUnreadCountDisplay(unreadCount);
        
        return unreadCount;
    } catch (error) {
        console.error('Lỗi tải số thông báo chưa đọc:', error);
        return 0;
    }
}

async function markNotificationAsRead(userNotificationId) {
    try {
        await apiRequest(`${API_ENDPOINTS.user.markAsRead}/${userNotificationId}/read`, {
            method: 'POST'
        });

        // Cập nhật UI
        const notificationElement = document.querySelector(`[data-notification-id="${userNotificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.remove('unread');
            notificationElement.classList.add('read');
        }

        // Reload unread count
        await loadUnreadCount();
        
        showSuccess('Đã đánh dấu thông báo là đã đọc');
        
        // Refresh current view if needed
        if (currentView === 'user') {
            await fetchUserNotifications(userCurrentPage);
        }
    } catch (error) {
        showError('Không thể đánh dấu thông báo: ' + error.message);
        console.error('Error marking as read:', error);
    }
}

async function deleteUserNotification(userNotificationId) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;

    try {
        await apiRequest(`${API_ENDPOINTS.user.delete}/${userNotificationId}`, {
            method: 'DELETE'
        });

        showSuccess('Xóa thông báo thành công!');
        
        // Reload unread count
        await loadUnreadCount();
        
        // Refresh current view
        if (currentView === 'user') {
            await fetchUserNotifications(userCurrentPage);
        }
    } catch (error) {
        showError('Xóa thông báo thất bại: ' + error.message);
        console.error('Error deleting user notification:', error);
    }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderUserNotificationTable() {
    const tbody = document.getElementById('user-notification-list') || document.getElementById('notification-list');
    if (!tbody) {
        console.error('Element user-notification-list not found');
        return;
    }
    
    if (userNotifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Không có thông báo nào.</td></tr>';
        return;
    }

    tbody.innerHTML = userNotifications.map((notification, index) => `
        <tr data-notification-id="${notification.userNotificationID}" class="${notification.isRead ? 'read' : 'unread bg-blue-50'}">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(userCurrentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${notification.icon ? `<i class="fas ${notification.icon} text-blue-600 mr-3"></i>` : ''}
                    <div>
                        <div class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-bold' : ''}">${notification.title || ''}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs">${stripHtml(notification.content || '')}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${notification.type || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatTime(notification.receivedAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${notification.isRead ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                </span>
                ${notification.readAt ? `<div class="text-xs text-gray-400 mt-1">${formatTime(notification.readAt)}</div>` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                ${!notification.isRead ? `
                    <button onclick="markNotificationAsRead(${notification.userNotificationID})" class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-check"></i> Đánh dấu đã đọc
                    </button>
                ` : ''}
                <button onclick="viewUserNotification(${notification.userNotificationID})" class="text-green-600 hover:text-green-900">
                    <i class="fas fa-eye"></i> Xem
                </button>
                <button onclick="deleteUserNotification(${notification.userNotificationID})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Xóa
                </button>
                ${notification.actionText && notification.actionUrl ? `
                    <a href="${notification.actionUrl}" target="_blank" class="text-purple-600 hover:text-purple-900">
                        <i class="fas fa-external-link-alt"></i> ${notification.actionText}
                    </a>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function renderNotificationTable() {
    const tbody = document.getElementById('notification-list');
    if (!tbody) {
        console.error('Element notification-list not found');
        return;
    }
    
    if (notifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Không có thông báo nào.</td></tr>';
        return;
    }

    tbody.innerHTML = notifications.map((notification, index) => {
        // ⭐ TÍNH STT ĐÚNG
        const stt = (currentPage - 1) * itemsPerPage + index + 1;
        
        // ⭐ KIỂM TRA TRẠNG THÁI ĐỂ HIỂN THỊ ACTIONS
        const isSent = notification.status === 'sent';
        const isDraft = notification.status === 'draft';
        
        return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stt}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${notification.title || ''}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">${stripHtml(notification.content || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${notification.type || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatTime(notification.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(notification)}">
                    ${getStatusText(notification)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <!-- ⭐ CHỈ HIỆN SỬA & XÓA KHI CHƯA GỬI (DRAFT) -->
                ${!isSent ? `
                    <button onclick="openModal(${notification.notificationID})" class="text-indigo-600 hover:text-indigo-900" title="Sửa thông báo">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button onclick="deleteNotification(${notification.notificationID})" class="text-red-600 hover:text-red-900" title="Xóa thông báo">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                ` : `
                    <!-- THÔNG BÁO ĐÃ GỬI - KHÔNG THỂ SỬA/XÓA -->
                    <span class="text-gray-400 text-sm italic">
                        <i class="fas fa-lock"></i> Đã gửi
                    </span>
                `}
                
                <!-- NÚT XEM LUÔN HIỂN THỊ -->
                <button onclick="previewNotification(${notification.notificationID})" class="text-blue-600 hover:text-blue-900" title="Xem chi tiết">
                    <i class="fas fa-eye"></i> Xem
                </button>
                
                <!-- NÚT GỬI CHỈ HIỆN KHI LÀ DRAFT -->
                ${isDraft ? `
                    <button onclick="sendNotification(${notification.notificationID})" class="text-green-600 hover:text-green-900" title="Gửi thông báo">
                        <i class="fas fa-paper-plane"></i> Gửi
                    </button>
                ` : ''}
                
                <!-- ⭐ THÊM NÚT THỐNG KÊ CHO THÔNG BÁO ĐÃ GỬI -->
                ${isSent ? `
                    <button onclick="viewNotificationStats(${notification.notificationID})" class="text-purple-600 hover:text-purple-900" title="Xem thống kê">
                        <i class="fas fa-chart-bar"></i> Thống kê
                    </button>
                ` : ''}
            </td>
        </tr>`;
    }).join('');
    
    console.log('✅ Table rendered with conditional actions based on status');
}
// ⭐ THÊM FUNCTION XEM THỐNG KÊ CHO THÔNG BÁO ĐÃ GỬI
async function viewNotificationStats(notificationId) {
    try {
        console.log('📊 Viewing stats for notification:', notificationId);
        
        // Gọi API để lấy thống kê
        const response = await apiRequest(`${API_ENDPOINTS.admin.getById}/${notificationId}/stats`);
        console.log('📈 Stats response:', response);
        
        // Tạo modal hiển thị thống kê
        let statsModal = document.getElementById('stats-modal');
        if (!statsModal) {
            statsModal = createStatsModal();
        }
        
        const statsContent = document.getElementById('stats-content');
        if (statsContent) {
            const notification = notifications.find(n => n.notificationID === notificationId);
            const readRate = notification?.totalSent > 0 ? 
                ((notification?.totalRead || 0) / notification.totalSent * 100).toFixed(1) : 0;
            
            statsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <!-- Thông tin cơ bản -->
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <h4 class="font-semibold text-blue-900 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>Thông tin cơ bản
                        </h4>
                        <div class="space-y-2 text-sm">
                            <p><strong>Tiêu đề:</strong> ${notification?.title || 'N/A'}</p>
                            <p><strong>Loại:</strong> ${notification?.type || 'N/A'}</p>
                            <p><strong>Đối tượng:</strong> ${getTargetAudienceText(notification?.targetAudience || '')}</p>
                            <p><strong>Thời gian gửi:</strong> ${formatTime(notification?.sentAt)}</p>
                        </div>
                    </div>
                    
                    <!-- Thống kê gửi -->
                    <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                        <h4 class="font-semibold text-green-900 mb-2">
                            <i class="fas fa-paper-plane mr-2"></i>Thống kê gửi
                        </h4>
                        <div class="space-y-2 text-sm">
                            <p><strong>Tổng gửi:</strong> 
                                <span class="text-green-700 font-bold">${notification?.totalSent || 0}</span> người
                            </p>
                            <p><strong>Đã đọc:</strong> 
                                <span class="text-blue-700 font-bold">${notification?.totalRead || 0}</span> người
                            </p>
                            <p><strong>Tỷ lệ đọc:</strong> 
                                <span class="text-purple-700 font-bold">${readRate}%</span>
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Tỷ lệ đọc</span>
                        <span>${readRate}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
                             style="width: ${readRate}%"></div>
                    </div>
                </div>
                
                <!-- Chi tiết -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2">
                        <i class="fas fa-list mr-2"></i>Chi tiết nội dung
                    </h4>
                    <div class="text-sm text-gray-700">
                        <p class="mb-2"><strong>Nội dung:</strong></p>
                        <div class="bg-white p-3 rounded border text-gray-800">
                            ${notification?.content || 'N/A'}
                        </div>
                        
                        ${notification?.actionText && notification?.actionUrl ? `
                            <p class="mt-3"><strong>Hành động:</strong> 
                                <a href="${notification.actionUrl}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                    ${notification.actionText} <i class="fas fa-external-link-alt ml-1"></i>
                                </a>
                            </p>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Hiển thị modal
        if (statsModal) {
            statsModal.style.display = 'block';
            setTimeout(() => {
                statsModal.style.opacity = '1';
            }, 10);
        }
        
    } catch (error) {
        showError('Không thể tải thống kê thông báo: ' + error.message);
        console.error('❌ Error viewing stats:', error);
    }
}

// ⭐ TẠO MODAL THỐNG KÊ
function createStatsModal() {
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    modal.innerHTML = `
        <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white">
            <div class="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 class="text-lg font-bold text-gray-900">
                    <i class="fas fa-chart-bar text-purple-600 mr-2"></i>
                    Thống kê thông báo
                </h3>
                <button onclick="closeStatsModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div id="stats-content" class="mt-4">
                <!-- Content will be inserted here -->
            </div>
            <div class="mt-6 flex justify-end">
                <button onclick="closeStatsModal()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">
                    <i class="fas fa-times mr-1"></i> Đóng
                </button>
            </div>
        </div>
    `;
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeStatsModal();
        }
    });
    
    document.body.appendChild(modal);
    return modal;
}

// ⭐ ĐÓNG MODAL THỐNG KÊ
function closeStatsModal() {
    const statsModal = document.getElementById('stats-modal');
    if (statsModal) {
        statsModal.style.opacity = '0';
        setTimeout(() => {
            statsModal.style.display = 'none';
        }, 300);
    }
}

// ============================================
// VIEW SWITCHING
// ============================================

async function switchToAdminView() {
    console.log('🔄 Switching to ADMIN view');
    
    if (currentView === 'admin') {
        console.log('⏭️ Already in admin view');
        return;
    }
    
    currentView = 'admin';
    
    // Hide user elements, show admin elements
    document.querySelectorAll('.user-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-view').forEach(el => el.style.display = 'block');
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('admin-tab')?.classList.add('active');
    
    // Reset pagination state and fetch fresh data
    currentPage = 1;
    totalPages = 1;
    totalCount = 0;
    notifications = [];
    
    console.log('🚀 Loading admin data...');
    await fetchAdminNotifications(1);
}

async function switchToUserView() {
    console.log('🔄 Switching to USER view');
    
    if (currentView === 'user') {
        console.log('⏭️ Already in user view');
        return;
    }
    
    currentView = 'user';
    
    // Hide admin elements, show user elements
    document.querySelectorAll('.admin-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.user-view').forEach(el => el.style.display = 'block');
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('user-tab')?.classList.add('active');
    
    // Reset user pagination state
    userCurrentPage = 1;
    userTotalPages = 1;
    userTotalCount = 0;
    userNotifications = [];
    
    console.log('🚀 Loading user data...');
    await fetchUserNotifications(1);
}

function toggleUnreadOnly() {
    const unreadOnlyCheckbox = document.getElementById('unread-only');
    const unreadOnly = unreadOnlyCheckbox?.checked || false;
    fetchUserNotifications(1, unreadOnly);
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateUnreadCountDisplay(count) {
    // Update badge trong navigation
    const badge = document.getElementById('unread-count-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
    
    // Update counter trong user tab
    const userTabCounter = document.getElementById('user-tab-counter');
    if (userTabCounter) {
        userTabCounter.textContent = count > 0 ? `(${count})` : '';
    }
    
    // Update browser title
    if (count > 0) {
        document.title = `(${count}) Thông báo - ShopxEX1`;
    } else {
        document.title = 'Thông báo - ShopxEX1';
    }
}
function updateUserPagination() {
    console.log('Updating user pagination:', { userCurrentPage, userTotalPages, userTotalCount });
    if (currentView !== 'user') {
        console.log('⏭️ Skipping user pagination update - not in user view');
        return;
    }
    // Update pagination info
    const paginationInfo = document.getElementById('user-pagination-info') || document.getElementById('pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị trang ${userCurrentPage} / ${userTotalPages} (Tổng số ${userTotalCount} thông báo)`;
        console.log('📊 Updated user pagination info:', paginationInfo.textContent);
    }

    // Update Previous button
    const prevButton = document.getElementById('user-prev-page') || document.getElementById('prev-page');
    if (prevButton) {
        prevButton.disabled = userCurrentPage <= 1;
        prevButton.onclick = () => {
            if (userCurrentPage > 1) {
                fetchUserNotifications(userCurrentPage - 1);
            }
        };
        
        // Visual feedback
        if (userCurrentPage <= 1) {
            prevButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            prevButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update Next button
    const nextButton = document.getElementById('user-next-page') || document.getElementById('next-page');
    if (nextButton) {
        nextButton.disabled = userCurrentPage >= userTotalPages;
        nextButton.onclick = () => {
            if (userCurrentPage < userTotalPages) {
                fetchUserNotifications(userCurrentPage + 1);
            }
        };
        
        // Visual feedback
        if (userCurrentPage >= userTotalPages) {
            nextButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            nextButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update page input
    const pageInput = document.getElementById('user-page-input') || document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = userCurrentPage;
        pageInput.max = userTotalPages;
        pageInput.min = 1;
        
        // Add event listener for Enter key
        pageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToUserPage();
            }
        });
    }

    // Update Go button
    const goButton = document.getElementById('user-go-page') || document.getElementById('go-page');
    if (goButton) {
        goButton.onclick = goToUserPage;
    }
}

// Helper functions for pagination
function goToPage() {
    const pageInput = document.getElementById('page-input');
    if (!pageInput) return;
    
    const newPage = parseInt(pageInput.value);
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        fetchAdminNotifications(newPage);
    }
}

function goToUserPage() {
    const pageInput = document.getElementById('user-page-input') || document.getElementById('page-input');
    if (!pageInput) return;
    
    const newPage = parseInt(pageInput.value);
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = userCurrentPage;
        return;
    }
    
    if (newPage > userTotalPages) {
        showError(`Số trang không được vượt quá ${userTotalPages}`);
        pageInput.value = userCurrentPage;
        return;
    }
    
    if (newPage !== userCurrentPage) {
        const unreadOnlyCheckbox = document.getElementById('unread-only');
        const unreadOnly = unreadOnlyCheckbox?.checked || false;
        fetchUserNotifications(newPage, unreadOnly);
    }
}

// Advanced pagination with page selector
function updatePageSelector() {
    const pageSelector = document.getElementById('page-selector');
    if (!pageSelector) return;
    
    // Clear existing options
    pageSelector.innerHTML = '';
    
    // Generate page options
    const maxPagesToShow = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Trang ${i}`;
        if (i === currentPage) {
            option.selected = true;
        }
        pageSelector.appendChild(option);
    }
    
    // Add event listener
    pageSelector.onchange = function() {
        const selectedPage = parseInt(this.value);
        if (selectedPage !== currentPage) {
            fetchAdminNotifications(selectedPage);
        }
    };
}

// Items per page functionality
function changeItemsPerPage() {
    const displaySelect = document.getElementById('display');
    if (!displaySelect) return;
    
    const newItemsPerPage = parseInt(displaySelect.value);
    if (newItemsPerPage && newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        
        // Recalculate current page to maintain position
        const currentFirstItem = (currentPage - 1) * itemsPerPage + 1;
        const newPage = Math.ceil(currentFirstItem / newItemsPerPage);
        
        if (currentView === 'admin') {
            fetchAdminNotifications(newPage);
        } else {
            const unreadOnlyCheckbox = document.getElementById('unread-only');
            const unreadOnly = unreadOnlyCheckbox?.checked || false;
            fetchUserNotifications(newPage, unreadOnly);
        }
    }
}

function updatePagination() {
    console.log('🔄 Updating ADMIN pagination:', { currentPage, totalPages, totalCount, currentView });
    
    // Chỉ update khi đang ở admin view
    if (currentView !== 'admin') {
        console.log('⏭️ Skipping admin pagination update - not in admin view');
        return;
    }
    
    // Update pagination info - CHỈ CHO ADMIN
    const paginationInfo = document.getElementById('admin-pagination-info') || document.getElementById('pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị trang ${currentPage} / ${totalPages} (Tổng số ${totalCount} thông báo)`;
        console.log('📊 Updated pagination info:', paginationInfo.textContent);
    }

    // Update Previous button - CHỈ CHO ADMIN
    const prevButton = document.getElementById('admin-prev-page') || document.getElementById('prev-page');
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
        prevButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                console.log('⬅️ Going to previous page:', currentPage - 1);
                fetchAdminNotifications(currentPage - 1);
            }
        };
        
        // Visual feedback
        if (currentPage <= 1) {
            prevButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            prevButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update Next button - CHỈ CHO ADMIN
    const nextButton = document.getElementById('admin-next-page') || document.getElementById('next-page');
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
        nextButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                console.log('➡️ Going to next page:', currentPage + 1);
                fetchAdminNotifications(currentPage + 1);
            }
        };
        
        // Visual feedback
        if (currentPage >= totalPages) {
            nextButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            nextButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update page input - CHỈ CHO ADMIN
    const pageInput = document.getElementById('admin-page-input') || document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
        pageInput.min = 1;
        
        // Remove old listeners
        pageInput.removeEventListener('keypress', handleAdminPageInputEnter);
        pageInput.addEventListener('keypress', handleAdminPageInputEnter);
    }

    // Update Go button - CHỈ CHO ADMIN
    const goButton = document.getElementById('admin-go-page') || document.getElementById('go-page');
    if (goButton) {
        goButton.onclick = (e) => {
            e.preventDefault();
            goToAdminPage();
        };
    }
    
    console.log('✅ Admin pagination updated successfully');
}

// ============================================
// MODAL AND PREVIEW FUNCTIONS
// ============================================

async function viewUserNotification(userNotificationId) {
    try {
        // Tìm notification trong danh sách hiện tại
        const userNotification = userNotifications.find(n => n.userNotificationID === userNotificationId);
        if (!userNotification) {
            showError('Không tìm thấy thông báo');
            return;
        }

        // Đánh dấu đã đọc nếu chưa đọc
        if (!userNotification.isRead) {
            await markNotificationAsRead(userNotificationId);
        }

        // Hiển thị modal preview
        const previewContent = document.getElementById('preview-content');
        const previewModal = document.getElementById('preview-modal');
        
        if (previewContent) {
            previewContent.innerHTML = `
                ${userNotification.icon ? `<div class="flex-shrink-0"><i class="fas ${userNotification.icon} text-blue-600 text-xl mt-1"></i></div>` : ''}
                <div class="flex-1 ${userNotification.icon ? 'ml-4' : ''}">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-800">${userNotification.title || ''}</h3>
                        <span class="text-gray-500 text-sm">${formatTime(userNotification.receivedAt)}</span>
                    </div>
                    <p class="text-gray-600 mt-1">${userNotification.content || ''}</p>
                    ${userNotification.actionText && userNotification.actionUrl ? `
                        <div class="mt-2 flex items-center space-x-4">
                            <a href="${userNotification.actionUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${userNotification.actionText}</a>
                        </div>` : ''}
                    <div class="mt-3 text-sm text-gray-500">
                        <p><strong>Loại:</strong> ${userNotification.type}</p>
                        <p><strong>Trạng thái:</strong> ${userNotification.isRead ? 'Đã đọc' : 'Chưa đọc'}</p>
                        <p><strong>Nhận lúc:</strong> ${formatTime(userNotification.receivedAt)}</p>
                        ${userNotification.readAt ? `<p><strong>Đọc lúc:</strong> ${formatTime(userNotification.readAt)}</p>` : ''}
                    </div>
                </div>
            `;
        }
        
        if (previewModal) {
            previewModal.classList.add('active');
        }
    } catch (error) {
        showError('Không thể xem thông báo: ' + error.message);
        console.error('Error viewing user notification:', error);
    }
}

// ============================================
// EXISTING ADMIN FUNCTIONS (giữ nguyên)
// ============================================

function applyFilters(page = 1) {
    const itemsPerPageSelect = document.getElementById('display');
    if (itemsPerPageSelect?.value) {
        itemsPerPage = parseInt(itemsPerPageSelect.value) || 10;
    }
    
    if (currentView === 'admin') {
        fetchAdminNotifications(page);
    } else {
        const unreadOnlyCheckbox = document.getElementById('unread-only');
        const unreadOnly = unreadOnlyCheckbox?.checked || false;
        fetchUserNotifications(page, unreadOnly);
    }
}

async function openModal(id = null) {
    try {
        const modal = document.getElementById('modal');
        if (!modal) {
            console.error('Modal element not found');
            return;
        }

        if (id) {
            const notification = await apiRequest(`${API_ENDPOINTS.admin.getById}/${id}`);
            currentNotification = notification;
        } else {
            currentNotification = {
                notificationID: null,
                title: '',
                content: '',
                type: 'general',
                icon: 'fa-bell',
                actionText: '',
                actionUrl: '',
                targetAudience: 'both',
                scheduledAt: null
            };
        }

        // Fill form
        const form = document.getElementById('notification-form');
        if (form) {
            const titleInput = form.querySelector('#title');
            const messageInput = form.querySelector('#message');
            const typeSelect = form.querySelector('#type');
            const iconInput = form.querySelector('#icon');
            const actionTextInput = form.querySelector('#action_text');
            const actionUrlInput = form.querySelector('#action_url');
            const targetSelect = form.querySelector('#target_audience');
            const scheduledInput = form.querySelector('#scheduled_at');

            if (titleInput) titleInput.value = currentNotification.title || '';
            if (messageInput) messageInput.value = currentNotification.content || '';
            if (typeSelect) typeSelect.value = currentNotification.type || 'general';
            if (iconInput) iconInput.value = currentNotification.icon || 'fa-bell';
            if (actionTextInput) actionTextInput.value = currentNotification.actionText || '';
            if (actionUrlInput) actionUrlInput.value = currentNotification.actionUrl || '';
            if (targetSelect) targetSelect.value = currentNotification.targetAudience || 'both';
            
            if (scheduledInput && currentNotification.scheduledAt) {
                scheduledInput.value = new Date(currentNotification.scheduledAt).toISOString().slice(0, 16);
            } else if (scheduledInput) {
                scheduledInput.value = '';
            }
        }

        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = id ? 'Sửa thông báo' : 'Tạo thông báo mới';
        }
        
        modal.classList.add('active');
    } catch (error) {
        showError('Không thể tải thông tin thông báo: ' + error.message);
        console.error('Error opening modal:', error);
    }
    // Setup preview after form is filled
    setTimeout(() => {
        setupNotificationPreview();
        updatePreview();
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentNotification = null;
}

async function saveNotification(event) {
    event.preventDefault();
    console.log('Saving notification...');
    
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        const form = document.getElementById('notification-form');
        if (!form) {
            throw new Error('Form không tìm thấy');
        }

        // Get form values
        const titleInput = form.querySelector('#title');
        const messageInput = form.querySelector('#message');
        const typeSelect = form.querySelector('#type');
        const iconInput = form.querySelector('#icon');
        const actionTextInput = form.querySelector('#action_text');
        const actionUrlInput = form.querySelector('#action_url');
        const targetSelect = form.querySelector('#target_audience');
        const scheduledInput = form.querySelector('#scheduled_at');

        // VALIDATION - THÊM PHẦN NÀY
        const title = titleInput?.value?.trim();
        const content = messageInput?.value?.trim();
        const targetAudience = targetSelect?.value;

        if (!title) {
            showError('Vui lòng nhập tiêu đề thông báo');
            titleInput?.focus();
            return;
        }

        if (title.length < 5) {
            showError('Tiêu đề phải có ít nhất 5 ký tự');
            titleInput?.focus();
            return;
        }

        if (!content) {
            showError('Vui lòng nhập nội dung thông báo');
            messageInput?.focus();
            return;
        }

        if (content.length < 10) {
            showError('Nội dung phải có ít nhất 10 ký tự');
            messageInput?.focus();
            return;
        }

        if (!targetAudience) {
            showError('Vui lòng chọn đối tượng nhận thông báo');
            targetSelect?.focus();
            return;
        }

        // Validate action URL if action text is provided
        const actionText = actionTextInput?.value?.trim();
        const actionUrl = actionUrlInput?.value?.trim();
        
        if (actionText && !actionUrl) {
            showError('Vui lòng nhập URL hành động khi có text nút hành động');
            actionUrlInput?.focus();
            return;
        }

        if (actionUrl && !isValidUrl(actionUrl)) {
            showError('URL hành động không hợp lệ');
            actionUrlInput?.focus();
            return;
        }

        // Validate scheduled date
        const scheduledDate = scheduledInput?.value;
        if (scheduledDate) {
            const selectedDate = new Date(scheduledDate);
            const now = new Date();
            
            if (selectedDate <= now) {
                showError('Thời gian lên lịch phải lớn hơn thời gian hiện tại');
                scheduledInput?.focus();
                return;
            }
        }

        // Prepare notification data
        const notificationData = {
            title: title,
            content: content,
            type: typeSelect?.value || 'general',
            icon: iconInput?.value || 'fa-bell',
            actionText: actionText,
            actionUrl: actionUrl,
            targetAudience: targetAudience,
            scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : null
        };

        console.log('Notification data to send:', notificationData);

        // Confirm before saving
        const recipientCount = await getRecipientCount(targetAudience);
        const confirmMessage = `Bạn có chắc chắn muốn ${currentNotification?.notificationID ? 'cập nhật' : 'tạo'} thông báo này?\n\nSẽ gửi đến ${recipientCount} người dùng trong nhóm "${getTargetAudienceText(targetAudience)}".`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Send API request
        let response;
        if (currentNotification?.notificationID) {
            console.log('Updating notification:', currentNotification.notificationID);
            response = await apiRequest(`${API_ENDPOINTS.admin.update}/${currentNotification.notificationID}`, {
                method: 'PUT',
                body: JSON.stringify(notificationData)
            });
        } else {
            console.log('Creating new notification');
            response = await apiRequest(API_ENDPOINTS.admin.create, {
                method: 'POST',
                body: JSON.stringify(notificationData)
            });
        }

        console.log('Save response:', response);

        showSuccess(currentNotification?.notificationID ? 'Cập nhật thông báo thành công!' : 'Tạo thông báo thành công!');
        closeModal();
        await fetchAdminNotifications(currentPage);
        
        // Reload unread count if notification was sent immediately
        if (!scheduledDate) {
            await loadUnreadCount();
        }

    } catch (error) {
        console.error('Error saving notification:', error);
        showError('Lưu thông báo thất bại: ' + error.message);
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

// THÊM HELPER FUNCTIONS
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function getRecipientCount(targetAudience) {
    try {
        const response = await apiRequest(`${API_ENDPOINTS.admin.recipientCount}?audience=${targetAudience}`);
        return response.count || 0;
    } catch (error) {
        console.error('Error getting recipient count:', error);
        return 0; // Return 0 if error
    }
}
// Thêm function để hiển thị số người nhận
async function updateRecipientCount() {
    const targetSelect = document.getElementById('target_audience');
    const targetAudience = targetSelect?.value;
    
    let countElement = document.getElementById('recipient-count');
    if (!countElement) {
        countElement = document.createElement('p');
        countElement.id = 'recipient-count';
        countElement.className = 'mt-1 text-sm font-medium';
        targetSelect?.parentNode.appendChild(countElement);
    }

    if (!targetAudience) {
        countElement.textContent = '';
        countElement.className = 'mt-1 text-sm font-medium';
        return;
    }

    try {
        countElement.textContent = '⏳ Đang tính toán...';
        countElement.className = 'mt-1 text-sm text-gray-500';
        
        const count = await getRecipientCount(targetAudience);
        
        if (count > 0) {
            countElement.textContent = `📊 Sẽ gửi đến ${count} người dùng`;
            countElement.className = 'mt-1 text-sm text-blue-600 font-medium';
        } else {
            countElement.textContent = '⚠️ Không có người dùng nào trong nhóm này';
            countElement.className = 'mt-1 text-sm text-yellow-600 font-medium';
        }
    } catch (error) {
        console.error('Error updating recipient count:', error);
        countElement.textContent = '❌ Không thể tính số người nhận';
        countElement.className = 'mt-1 text-sm text-red-600';
    }
}

// Form validation with visual feedback
function validateForm() {
    const form = document.getElementById('notification-form');
    if (!form) return false;

    let isValid = true;
    const fields = [
        { id: 'title', name: 'Tiêu đề', minLength: 5 },
        { id: 'message', name: 'Nội dung', minLength: 10 },
        { id: 'target_audience', name: 'Đối tượng', required: true }
    ];

    // Clear previous errors
    form.querySelectorAll('.form-error').forEach(el => {
        el.classList.remove('form-error');
    });
    form.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });

    fields.forEach(field => {
        const element = form.querySelector(`#${field.id}`);
        const value = element?.value?.trim();

        if (field.required && !value) {
            showFieldError(element, `${field.name} là bắt buộc`);
            isValid = false;
        } else if (field.minLength && value && value.length < field.minLength) {
            showFieldError(element, `${field.name} phải có ít nhất ${field.minLength} ký tự`);
            isValid = false;
        }
    });

    // Validate action URL if action text is provided
    const actionText = form.querySelector('#action_text')?.value?.trim();
    const actionUrl = form.querySelector('#action_url')?.value?.trim();
    
    if (actionText && !actionUrl) {
        showFieldError(form.querySelector('#action_url'), 'URL hành động là bắt buộc khi có text nút');
        isValid = false;
    }

    return isValid;
}

function showFieldError(element, message) {
    if (!element) return;
    
    element.classList.add('form-error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    element.parentNode.appendChild(errorDiv);
}


async function deleteNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        await apiRequest(`${API_ENDPOINTS.admin.delete}/${id}`, {
            method: 'DELETE'
        });

        showSuccess('Xóa thông báo thành công!');
        fetchAdminNotifications(currentPage);
    } catch (error) {
        showError('Xóa thông báo thất bại: ' + error.message);
        console.error('Error deleting notification:', error);
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

async function sendNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn gửi thông báo này không?')) return;

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        await apiRequest(`${API_ENDPOINTS.admin.send}/${id}/send`, {
            method: 'POST'
        });

        showSuccess('Gửi thông báo thành công!');
        fetchAdminNotifications(currentPage);
        
        // Reload unread count sau khi gửi thông báo mới
        await loadUnreadCount();
    } catch (error) {
        showError('Gửi thông báo thất bại: ' + error.message);
        console.error('Error sending notification:', error);
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

async function previewNotification(id) {
    try {
        console.log('🔍 [ADMIN] Previewing notification:', id);
        
        const notification = await apiRequest(`${API_ENDPOINTS.admin.getById}/${id}`);
        console.log('📄 [ADMIN] Notification data:', notification);
        
        let previewModal = document.getElementById('preview-modal');
        if (!previewModal) {
            console.log('🔧 [ADMIN] Creating preview modal...');
            previewModal = createPreviewModal();
        }
        
        const previewContent = document.getElementById('preview-content');
        
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="flex">
                    ${notification.icon ? `<div class="flex-shrink-0"><i class="fas ${notification.icon} text-blue-600 text-xl mt-1"></i></div>` : ''}
                    <div class="flex-1 ${notification.icon ? 'ml-4' : ''}">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-800">${notification.title || ''}</h3>
                            <span class="text-gray-500 text-sm">${formatTime(notification.createdAt)}</span>
                        </div>
                        <p class="text-gray-600 mt-1">${notification.content || ''}</p>
                        ${notification.actionText ? `
                            <div class="mt-2 flex items-center space-x-4">
                                <a href="${notification.actionUrl || '#!'}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${notification.actionText}</a>
                            </div>` : ''}
                        <div class="mt-3 text-sm text-gray-500">
                            <p><strong>Đối tượng:</strong> ${getTargetAudienceText(notification.targetAudience)}</p>
                            <p><strong>Trạng thái:</strong> ${getStatusText(notification)}</p>
                            ${notification.scheduledAt ? `<p><strong>Lên lịch:</strong> ${formatTime(notification.scheduledAt)}</p>` : ''}
                            ${notification.sentAt ? `<p><strong>Đã gửi:</strong> ${formatTime(notification.sentAt)}</p>` : ''}
                            <p><strong>Tổng gửi:</strong> ${notification.totalSent || 0} | <strong>Đã đọc:</strong> ${notification.totalRead || 0}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (previewModal) {
            showPreviewModal(previewModal);
            
        }
    } catch (error) {
        showError('Không thể xem trước thông báo: ' + error.message);
        console.error('❌ [ADMIN] Error previewing notification:', error);
    }
}
function createPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">Xem trước thông báo</h3>
                <button onclick="closePreview()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="preview-content" class="mt-4">
                <!-- Content will be inserted here -->
            </div>
        </div>
    `;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePreview();
        }
    });
    document.body.appendChild(modal);
    
    modal.classList.add = function(className) {
        if (className === 'active') {
            this.style.display = 'block';
        }
        this.className += ' ' + className;
    };
    
    return modal;
}

function showPreviewModal(modal) {
    if (modal) {
        modal.style.display = 'block';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        
        // ⭐ SMOOTH ANIMATION
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease';
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
        
        console.log('✅ Modal shown with direct style');
    }
}

function hidePreviewModal(modal) {
    if (modal) {
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Delay để animation chạy xong
        
        console.log('✅ Modal hidden with direct style');
    }
}

// ⭐ FIX closePreview - SỬ DỤNG HELPER FUNCTION
function closePreview() {
    const previewModal = document.getElementById('preview-modal');
    if (previewModal) {
        hidePreviewModal(previewModal); // ⭐ SỬ DỤNG HELPER FUNCTION
    }
}
// ============================================
// HELPER FUNCTIONS
// ============================================
function handleAdminPageInputEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToAdminPage();
    }
}

function goToAdminPage() {
    const pageInput = document.getElementById('admin-page-input') || document.getElementById('page-input');
    if (!pageInput) {
        console.error('❌ Page input not found');
        return;
    }
    
    const newPage = parseInt(pageInput.value);
    
    console.log('🎯 Go to admin page:', { newPage, currentPage, totalPages });
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        console.log('🚀 Navigating to page:', newPage);
        fetchAdminNotifications(newPage);
    } else {
        console.log('⏭️ Same page, no action needed');
    }
}

function getStatusClass(notification) {
    if (notification.status === 'sent') return 'bg-green-100 text-green-800';
    if (notification.scheduledAt) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
}

function getStatusText(notification) {
    if (notification.status === 'sent') {
        return `Đã gửi: ${formatTime(notification.sentAt)}`;
    }
    if (notification.scheduledAt) {
        return `Lên lịch: ${formatTime(notification.scheduledAt)}`;
    }
    return 'Bản nháp';
}

function getTargetAudienceText(audience) {
    const audiences = {
        'customers': '👥 Khách hàng',
        'sellers': '🏪 Người bán', 
        'admins': '👑 Quản trị viên',
        'both': '👥🏪 Khách hàng & Người bán',
        'all': '🌐 Tất cả người dùng'
    };
    return audiences[audience] || audience;
}

function formatTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/A';
    }
}

function stripHtml(html) {
    if (!html) return '';
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch {
        return html;
    }
}

function showSuccess(message) {
    console.log('Success:', message);
    // Implement your notification system here
    alert(message);
}

function showError(message) {
    console.error('Error:', message);
    const errorElement = document.getElementById('error-message');
    const errorContainer = document.getElementById('error');
    
    if (errorElement && errorContainer) {
        errorElement.textContent = message;
        errorContainer.style.display = 'block';
    } else {
        alert(message);
    }
}

function loadLocalStorageData() {
    try {
        const stored = localStorage.getItem('notifications');
        if (stored) {
            const localData = JSON.parse(stored);
            notifications = localData;
            totalCount = localData.length;
            totalPages = Math.ceil(totalCount / itemsPerPage);
            renderNotificationTable();
            updatePagination();
            
            const loading = document.getElementById('loading');
            const table = document.getElementById('notification-table');
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading localStorage data:', error);
    }
}

// ============================================
// AUTO REFRESH
// ============================================

function startAutoRefresh() {
    // Tự động refresh unread count mỗi 30 giây
    setInterval(async () => {
        try {
            await loadUnreadCount();
        } catch (error) {
            console.error('Auto refresh error:', error);
        }
    }, 30000);
}

function setupNotificationPreview() {
    const form = document.getElementById('notification-form');
    if (!form) return;

    // Elements to watch
    const watchElements = [
        '#title',
        '#message', 
        '#type',
        '#icon',
        '#action_text',
        '#action_url',
        '#target_audience'
    ];

    // Add event listeners
    watchElements.forEach(selector => {
        const element = form.querySelector(selector);
        if (element) {
            element.addEventListener('input', updatePreview);
            element.addEventListener('change', updatePreview);
        }
    });
}

function updatePreview() {
    const form = document.getElementById('notification-form');
    if (!form) return;

    const title = form.querySelector('#title')?.value || 'Tiêu đề thông báo';
    const content = form.querySelector('#message')?.value || 'Nội dung thông báo sẽ hiển thị ở đây...';
    const icon = form.querySelector('#icon')?.value || 'fa-bell';
    const actionText = form.querySelector('#action_text')?.value;
    const actionUrl = form.querySelector('#action_url')?.value;
    const targetAudience = form.querySelector('#target_audience')?.value;

    // Update preview elements
    const previewIcon = document.getElementById('preview-icon');
    const previewTitle = document.getElementById('preview-title');
    const previewText = document.getElementById('preview-text');
    const previewAction = document.getElementById('preview-action');
    const previewAudience = document.getElementById('preview-audience');

    if (previewIcon) {
        previewIcon.className = `fas ${icon} text-blue-600 preview-icon`;
    }
    
    if (previewTitle) {
        previewTitle.textContent = title.length > 40 ? title.substring(0, 40) + '...' : title;
    }
    
    if (previewText) {
        previewText.textContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
    }
    
    if (previewAction) {
        if (actionText && actionUrl) {
            previewAction.style.display = 'block';
            const link = previewAction.querySelector('a');
            if (link) {
                link.textContent = actionText.length > 15 ? actionText.substring(0, 15) + '...' : actionText;
                link.href = actionUrl;
            }
        } else {
            previewAction.style.display = 'none';
        }
    }
    
    if (previewAudience) {
        const audienceText = getTargetAudienceText(targetAudience) || 'Chưa chọn';
        previewAudience.textContent = `📍 Gửi đến: ${audienceText}`;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing notification system...');
        
        // Initialize system
        initializeSystem();
        
        // Start auto refresh
        startAutoRefresh();
        
        // Add event listeners for filters
        const searchInput = document.getElementById('search');
        const typeFilter = document.getElementById('type-filter');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');
        const sortSelect = document.getElementById('sort');
        const displaySelect = document.getElementById('display');
        const unreadOnlyCheckbox = document.getElementById('unread-only');

        if (searchInput) {
            searchInput.addEventListener('input', () => applyFilters());
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', () => applyFilters());
        }
        if (dateFromInput) {
            dateFromInput.addEventListener('change', () => applyFilters());
        }
        if (dateToInput) {
            dateToInput.addEventListener('change', () => applyFilters());
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', () => applyFilters());
        }
        if (displaySelect) {
            displaySelect.addEventListener('change', () => applyFilters());
        }
        if (unreadOnlyCheckbox) {
            unreadOnlyCheckbox.addEventListener('change', toggleUnreadOnly);
        }

        // Tab switching listeners
        const adminTab = document.getElementById('admin-tab');
        const userTab = document.getElementById('user-tab');
        
        if (adminTab) {
            adminTab.addEventListener('click', switchToAdminView);
        }
        if (userTab) {
            userTab.addEventListener('click', switchToUserView);
        }

    } catch (error) {
        console.error('Lỗi tải trang:', error);
        showError('Không thể tải trang: ' + error.message);
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
    setupNotificationPreview(); 
});
// Thêm vào event listener
document.getElementById('target_audience')?.addEventListener('change', updateRecipientCount);
// ============================================
// UTILITY FUNCTIONS
// ============================================

// Debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.openModal = openModal;
window.closeModal = closeModal;
window.saveNotification = saveNotification;
window.deleteNotification = deleteNotification;
window.sendNotification = sendNotification;
window.previewNotification = previewNotification;
window.closePreview = closePreview;
window.applyFilters = applyFilters;
window.fetchAdminNotifications = fetchAdminNotifications;
window.fetchUserNotifications = fetchUserNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteUserNotification = deleteUserNotification;
window.viewUserNotification = viewUserNotification;
window.switchToAdminView = switchToAdminView;
window.switchToUserView = switchToUserView;
window.toggleUnreadOnly = toggleUnreadOnly;
window.viewNotificationStats = viewNotificationStats;
window.closeStatsModal = closeStatsModal;