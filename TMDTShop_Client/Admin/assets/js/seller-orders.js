// Biến lưu trữ dữ liệu đơn hàng và thông tin phân trang
let sellerOrders = [];
let orderPagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
};

// Biến lưu trữ bộ lọc đơn hàng và sắp xếp
let orderFilter = {
    startDate: null,
    endDate: null,
    status: null,
    searchTerm: '',
    minPrice: null,
    maxPrice: null,
    sortBy: 'OrderDate',
    sortDirection: 'desc',
    pageSize: 10
};

// Cờ để theo dõi quá trình tải
let ordersLoading = false;
let debugMode = false; // Để dễ dàng bật/tắt debug

// Khởi tạo quản lý đơn hàng khi DOM đã sẵn sàng và khi chuyển tab đến tab đơn hàng
document.addEventListener('DOMContentLoaded', () => {
    if (debugMode) console.log('DOM loaded - checking orders section');
    
    // Kiểm tra xem có phải đang ở phần orders không
    setTimeout(() => {
        checkAndInitOrdersSection();
    }, 300); // Delay nhỏ để đảm bảo các thành phần UI đã được tạo
    
    // Thêm listener cho các sự kiện click vào tab 
    // (lấy tất cả các tab trong sidebar và theo dõi sự kiện click)
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems) {
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const sectionId = this.getAttribute('data-section');
                if (sectionId === 'orders') {
                    // Đảm bảo rằng khi chuyển đến tab orders, các hàm init được gọi
                    if (debugMode) console.log('Orders tab clicked');
                    setTimeout(() => {
                        checkAndInitOrdersSection();
                    }, 300);
                }
            });
        });
    }
    
    // Thêm xử lý responsive cho bảng đơn hàng
    window.addEventListener('resize', adjustOrdersTableResponsive);
});

// Các hằng số định nghĩa trạng thái đơn hàng
const ORDER_STATUSES = Object.freeze({
    CHO_XAC_NHAN: "Chờ xác nhận",
    DANG_XU_LY: "Đang xử lý",
    DANG_GIAO: "Đang giao",
    DA_GIAO: "Đã giao",
    YEU_CAU_TRA_HANG_HOAN_TIEN: "Yêu cầu trả hàng/ hoàn tiền",
    DA_HOAN_TIEN: "Đã hoàn tiền",
    DA_HUY: "Đã hủy"
});

/**
 * Lấy class CSS tương ứng với trạng thái
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} - Tên class CSS
 */
function getStatusClass(status) {
    // Chuẩn hóa status để so sánh dễ dàng hơn
    const normalizedStatus = status.toLowerCase().trim();
    
    switch (true) {
        case normalizedStatus.includes('chờ xác nhận') || normalizedStatus.includes('pending'):
            return 'status-cho-xac-nhan';
            
        case normalizedStatus.includes('đang xử lý') || normalizedStatus.includes('dang xu ly') || normalizedStatus.includes('processing'):
            return 'status-dang-xu-ly';
            
        case normalizedStatus.includes('đang giao') || normalizedStatus.includes('dang giao') || normalizedStatus.includes('shipped'):
            return 'status-dang-giao';
            
        case normalizedStatus.includes('đã giao') || normalizedStatus.includes('da giao') || normalizedStatus.includes('delivered'):
            return 'status-da-giao';
            
        case normalizedStatus.includes('yêu cầu trả') || normalizedStatus.includes('hoàn tiền') || normalizedStatus.includes('refund'):
            return 'status-yeu-cau-tra-hang-hoan-tien';
            
        case normalizedStatus.includes('đã hoàn tiền') || normalizedStatus.includes('da hoan tien') || normalizedStatus.includes('refunded'):
            return 'status-da-hoan-tien';
            
        case normalizedStatus.includes('đã hủy') || normalizedStatus.includes('da huy') || normalizedStatus.includes('cancelled'):
            return 'status-da-huy';
            
        default:
            return 'status-default';
    }
}

/**
 * Lấy trạng thái tiếp theo trong luồng xử lý đơn hàng
 * @param {string} currentStatus - Trạng thái hiện tại
 * @returns {string|null} - Trạng thái tiếp theo hoặc null nếu không có
 */
function getNextStatusInFlow(currentStatus) {
    const normalizedStatus = currentStatus.toLowerCase().trim();
    
    switch (true) {
        case normalizedStatus.includes('chờ xác nhận') || normalizedStatus.includes('pending'):
            return ORDER_STATUSES.DANG_XU_LY;
            
        case normalizedStatus.includes('đang xử lý') || normalizedStatus.includes('dang xu ly') || normalizedStatus.includes('processing'):
            return ORDER_STATUSES.DANG_GIAO;
            
        case normalizedStatus.includes('đang giao') || normalizedStatus.includes('dang giao') || normalizedStatus.includes('shipped'):
            return ORDER_STATUSES.DA_GIAO;
            
        default:
            return null;
    }
}

/**
 * Lấy thông tin hiển thị cho trạng thái đơn hàng
 * @param {string} status - Trạng thái đơn hàng
 * @param {number} orderId - ID của đơn hàng
 * @returns {Object} - Thông tin trạng thái
 */
function getOrderStatusInfo(status, orderId) {
    // Xác định class CSS
    const statusClass = getStatusClass(status);
    
    // Xác định trạng thái tiếp theo
    const nextStatus = getNextStatusInFlow(status);
    const isInteractive = !!nextStatus;
    
    // Hiển thị text phù hợp
    let displayText = status;
    
    switch (statusClass) {
        case 'status-cho-xac-nhan':
            displayText = ORDER_STATUSES.CHO_XAC_NHAN;
            break;
        case 'status-dang-xu-ly':
            displayText = ORDER_STATUSES.DANG_XU_LY;
            break;
        case 'status-dang-giao':
            displayText = ORDER_STATUSES.DANG_GIAO;
            break;
        case 'status-da-giao':
            displayText = ORDER_STATUSES.DA_GIAO;
            break;
        case 'status-da-huy':
            displayText = ORDER_STATUSES.DA_HUY;
            break;
        case 'status-yeu-cau-tra-hang-hoan-tien':
            displayText = ORDER_STATUSES.YEU_CAU_TRA_HANG_HOAN_TIEN;
            break;
        case 'status-da-hoan-tien':
            displayText = ORDER_STATUSES.DA_HOAN_TIEN;
            break;
    }
    
    // Tạo HTML tương ứng
    let html = '';
    if (isInteractive) {
        html = `
            <button class="status-badge interactive ${statusClass}" 
                   onclick="handleStatusButtonClick(${orderId}, '${status}')"
                   title="Nhấp để chuyển sang '${nextStatus}'">
                ${displayText}
                <i class="fas fa-arrow-right fa-xs ml-2"></i>
            </button>
        `;
    } else {
        html = `<span class="status-badge ${statusClass}">${displayText}</span>`;
    }
    
    return {
        class: statusClass,
        text: displayText,
        html: html,
        isInteractive: isInteractive
    };
}

/**
 * Tạo HTML cho các nút hành động dựa trên trạng thái đơn hàng
 * @param {number} orderId - ID đơn hàng
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} - HTML cho các nút hành động
 */
function getOrderActions(orderId, status) {
    const statusClass = getStatusClass(status);
    
    // Luôn có nút Xem
    let actions = `
        <button onclick="viewOrderDetails(${orderId})" class="action-button action-button-view" title="Xem chi tiết">
            <i class="fas fa-eye"></i> Xem
        </button>
    `;
    
    // Hiển thị nút Hủy nếu đơn hàng chưa giao và chưa hủy
    if (status === ORDER_STATUSES.CHO_XAC_NHAN || 
        status === ORDER_STATUSES.DANG_XU_LY || 
        statusClass === 'status-default' || 
        statusClass === 'status-cho-xac-nhan' || 
        statusClass === 'status-dang-xu-ly') {
        
        actions += `
            <button onclick="handleCancelOrder(${orderId})" class="action-button action-button-cancel ml-2" title="Hủy đơn hàng">
                <i class="fas fa-times-circle"></i> Hủy
            </button>
        `;
    }
    
    // Thêm nút xác nhận hoàn tiền nếu có yêu cầu
    if (status === ORDER_STATUSES.YEU_CAU_TRA_HANG_HOAN_TIEN || statusClass === 'status-yeu-cau-tra-hang-hoan-tien') {
        actions += `
            <button onclick="handleConfirmRefundRequest(${orderId})" class="action-button action-button-refund ml-2" title="Xác nhận yêu cầu & hoàn tiền">
                <i class="fas fa-check-circle"></i> XN Hoàn tiền
            </button>
        `;
    }
    
    return actions;
}

/**
 * Xử lý sự kiện khi người dùng click vào nút trạng thái
 * @param {number} orderId - ID đơn hàng
 * @param {string} currentStatus - Trạng thái hiện tại
 */
async function handleStatusButtonClick(orderId, currentStatus) {
    const nextStatus = getNextStatusInFlow(currentStatus);
    if (!nextStatus) return;
    
    if (confirm(`Bạn có chắc muốn chuyển đơn hàng #${orderId} từ "${currentStatus}" sang "${nextStatus}"?`)) {
        const result = await updateOrderStatus(orderId, nextStatus);
        if (result.success) {
            displayToastMessage(`Đã chuyển đơn hàng #${orderId} sang trạng thái "${nextStatus}"`, 'success');
            // Tải lại danh sách đơn hàng
            loadSellerOrders(orderPagination.currentPage);
        } else {
            displayToastMessage(`Không thể cập nhật trạng thái: ${result.message}`, 'error');
        }
    }
}

/**
 * Xử lý sự kiện khi người dùng click vào nút hủy đơn hàng
 * @param {number} orderId - ID đơn hàng
 */
async function handleCancelOrder(orderId) {
    if (confirm(`Bạn có chắc chắn muốn HỦY đơn hàng #${orderId} không?`)) {
        const result = await updateOrderStatus(orderId, ORDER_STATUSES.DA_HUY);
        if (result.success) {
            displayToastMessage(`Đơn hàng #${orderId} đã được hủy thành công`, 'success');
            // Tải lại danh sách đơn hàng
            loadSellerOrders(orderPagination.currentPage);
        } else {
            displayToastMessage(`Không thể hủy đơn hàng: ${result.message}`, 'error');
        }
    }
}

/**
 * Xử lý sự kiện khi người dùng click vào nút xác nhận hoàn tiền
 * @param {number} orderId - ID đơn hàng
 */
async function handleConfirmRefundRequest(orderId) {
    if (confirm(`Xác nhận yêu cầu trả hàng và hoàn tiền cho đơn hàng #${orderId}? \nĐơn hàng sẽ được chuyển sang "Đã hoàn tiền".`)) {
        const result = await updateOrderStatus(orderId, ORDER_STATUSES.DA_HOAN_TIEN);
        if (result.success) {
            displayToastMessage(`Đơn hàng #${orderId} đã được xác nhận hoàn tiền thành công`, 'success');
            // Tải lại danh sách đơn hàng
            loadSellerOrders(orderPagination.currentPage);
        } else {
            displayToastMessage(`Không thể xác nhận hoàn tiền: ${result.message}`, 'error');
        }
    }
}

/**
 * Gửi yêu cầu API để cập nhật trạng thái đơn hàng
 * @param {number} orderId - ID đơn hàng
 * @param {string} newStatus - Trạng thái mới
 * @returns {Object} - Kết quả cập nhật
 */
// SỬA HÀM updateOrderStatus() - DÒNG 280-320

/**
 * Gửi yêu cầu API để cập nhật trạng thái đơn hàng - FIXED VERSION
 */
async function updateOrderStatus(orderId, newStatus) {
    try {
        console.log(`🚀 Updating order ${orderId} to status: ${newStatus}`);
        
        const token = getTokenFromStorage();
        if (!token) {
            return {
                success: false,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            };
        }
        
        // ✅ FIX 1: Đảm bảo gửi đúng format DTO mà backend expect
        const requestBody = {
            newStatus: newStatus,  // Có thể cần đổi thành 'status'
            reason: 'Cập nhật bởi người bán',
            // Thêm các field khác nếu DTO yêu cầu
            updatedBy: 'Seller',
            updateTime: new Date().toISOString()
        };
        
        console.log(`📤 Request body:`, requestBody);
        
        const response = await fetch(`${API_BASE}/Orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `Lỗi cập nhật trạng thái (${response.status})`;
            try {
                const errorData = await response.json();
                console.error(`❌ API Error Response:`, errorData);
                
                // Xử lý lỗi validation cụ thể
                if (response.status === 400) {
                    if (errorData.errors) {
                        // ASP.NET Core ModelState errors
                        const validationErrors = Object.values(errorData.errors).flat();
                        errorMessage = `Lỗi validation: ${validationErrors.join(', ')}`;
                    } else if (errorData.message) {
                        errorMessage = `Lỗi: ${errorData.message}`;
                    } else {
                        errorMessage = `Lỗi 400: Dữ liệu không hợp lệ - ${JSON.stringify(errorData)}`;
                    }
                }
            } catch (e) {
                const textError = await response.text();
                console.error(`❌ Raw error response:`, textError);
                errorMessage = `Lỗi ${response.status}: ${textError || response.statusText}`;
            }
            return {
                success: false,
                message: errorMessage
            };
        }
        
        console.log(`✅ Order ${orderId} status updated successfully to ${newStatus}`);
        return { success: true };
        
    } catch (error) {
        console.error(`❌ Network/Exception error updating order ${orderId}:`, error);
        return {
            success: false,
            message: `Lỗi kết nối: ${error.message}`
        };
    }
}

/**
 * Cập nhật hàm renderOrders để sử dụng các hàm mới
 * @param {Array} orders - Danh sách đơn hàng
 */
function renderOrders(orders) {
    const orderTableBody = document.getElementById('order-table-body');
    if (!orderTableBody) {
        console.error('Không tìm thấy phần tử #order-table-body');
        return;
    }
    
    if (!orders || !Array.isArray(orders)) {
        console.error('Dữ liệu đơn hàng không hợp lệ:', orders);
        orderTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center">
                    <div class="text-gray-500">Không có dữ liệu đơn hàng hợp lệ</div>
                </td>
            </tr>
        `;
        return;
    }
    
    if (orders.length > 0) {
        try {
            orderTableBody.innerHTML = orders.map((order, index) => {
                // Lấy thông tin đơn hàng
                const orderId = order.orderID || order.orderId || order.id || 'N/A';
                const customerName = order.customerName || (order.customerInfo && order.customerInfo.fullName) || 'Khách hàng';
                const orderDate = formatDateTime(order.orderDate || order.createdAt);
                const totalPayment = parseFloat(order.totalPayment) || 0;
                const totalAmount = parseFloat(order.totalAmount) || 0;
                const status = order.status || 'Không xác định';
                const itemCount = order.numberOfItems || order.totalItems || order.items?.length || 0;
                
                // Xác định thông tin trạng thái và khả năng tương tác
                let statusInfo = getOrderStatusInfo(status, orderId);
                
                // Xác định hành động có thể thực hiện
                let actions = getOrderActions(orderId, status);
                
                return `
                    <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-150">
                        <td class="px-3 py-2 whitespace-nowrap">
                            <div class="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                                <a href="#" onclick="viewOrderDetails(${orderId}); return false;" title="Xem chi tiết đơn hàng">#${orderId}</a>
                            </div>
                        </td>
                        <td class="px-3 py-2">
                            <div class="text-sm text-gray-900">${customerName}</div>
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            <div class="text-sm text-gray-500">${orderDate}</div>
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium text-right">
                            ${formatCurrency(totalAmount)}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium text-right">
                            ${formatCurrency(totalPayment)}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-center">
                            <span class="text-sm">${itemCount}</span>
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-center">
                            ${statusInfo.html}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-center">
                            <div class="action-btn-container">
                                ${actions}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Lỗi khi render danh sách đơn hàng:', error);
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center">
                        <div class="text-red-500">Xảy ra lỗi khi hiển thị danh sách: ${error.message}</div>
                    </td>
                </tr>
            `;
        }
    } else {
        // Nếu không có đơn hàng nào
        orderTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center">
                    <div class="text-gray-500">Không có đơn hàng nào</div>
                </td>
            </tr>
        `;
    }
    
    // Cập nhật số lượng đơn hàng hiển thị
    updateOrderCountDisplay(orders.length);
}

/**
 * Cập nhật hiển thị số lượng đơn hàng
 * @param {number} count - Số lượng đơn hàng
 */
function updateOrderCountDisplay(count) {
    const ordersCountElement = document.getElementById('orders-count');
    const ordersCountInfoElement = document.getElementById('orders-count-info');
    
    if (ordersCountElement) {
        ordersCountElement.textContent = `${count} đơn hàng`;
    }
    
    if (ordersCountInfoElement) {
        ordersCountInfoElement.textContent = `Hiển thị ${count} đơn hàng`;
    }
}

// Đảm bảo các hàm được hiển thị ra ngoài để có thể gọi từ HTML
window.handleStatusButtonClick = handleStatusButtonClick;
window.handleCancelOrder = handleCancelOrder;
window.handleConfirmRefundRequest = handleConfirmRefundRequest;

/**
 * Kiểm tra và khởi tạo phần orders nếu đang hiển thị
 */
function checkAndInitOrdersSection() {
    // Đảm bảo chỉ chạy nếu đang ở trang đơn hàng và phần orders đang hiển thị
    const ordersSection = document.getElementById('orders-section');
    if (!ordersSection) {
        if (debugMode) console.log('Orders section not found');
        return;
    }
    
    // Kiểm tra xem phần orders có đang hiển thị không
    if (ordersSection.classList.contains('active') || 
        window.getComputedStyle(ordersSection).display !== 'none') {
        if (debugMode) console.log('Orders section is visible - initializing');
        
        // Khởi tạo sự kiện cho các bộ lọc
        initOrderFilters();
        
        // Tải đơn hàng ban đầu nếu chưa có dữ liệu
        if (sellerOrders.length === 0 && !ordersLoading) {
            loadSellerOrders();
        }
        
        // Điều chỉnh bảng responsive
        adjustOrdersTableResponsive();
    } else {
        if (debugMode) console.log('Orders section exists but is not visible');
    }
}

/**
 * Điều chỉnh responsive cho bảng đơn hàng
 */
function adjustOrdersTableResponsive() {
    const orderTable = document.querySelector('#orders-section table');
    if (!orderTable) return;
    
    const windowWidth = window.innerWidth;
    
    // Lấy tất cả các cột trong bảng
    const headerCells = orderTable.querySelectorAll('thead th');
    const rows = orderTable.querySelectorAll('tbody tr');
    
    if (windowWidth < 768) {
        // Ẩn một số cột trên màn hình nhỏ
        hideTableColumn(headerCells, rows, 3); // Ẩn cột Số lượng
        if (windowWidth < 640) {
            hideTableColumn(headerCells, rows, 2); // Ẩn cột Ngày đặt
        }
    } else {
        // Hiển thị lại tất cả các cột
        showAllTableColumns(headerCells, rows);
    }
}

/**
 * Ẩn một cột cụ thể trong bảng
 */
function hideTableColumn(headers, rows, columnIndex) {
    if (columnIndex >= 0 && columnIndex < headers.length && headers[columnIndex]) {
        headers[columnIndex].style.display = 'none';
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (columnIndex >= 0 && columnIndex < cells.length && cells[columnIndex]) {
            cells[columnIndex].style.display = 'none';
        }
    });
}

/**
 * Hiển thị lại tất cả các cột trong bảng
 */
function showAllTableColumns(headers, rows) {
    headers.forEach(header => header.style.display = '');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => cell.style.display = '');
    });
}

/**
 * Tải đơn hàng của người bán từ API
 * @param {number} page - Số trang cần tải (bắt đầu từ 1)
 */
/**
 * Tải danh sách đơn hàng của người bán với phân trang và lọc
 * @param {number} page - Số trang cần tải
 */
async function loadSellerOrders(page = 1) {
    try {
        const tempDebug = debugMode;
        
        // Đánh dấu đang tải
        ordersLoading = true;
        
        // Hiển thị trạng thái đang tải
        const orderTableBody = document.getElementById('order-table-body');
        if (orderTableBody) {
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center">
                        <div class="animate-pulse flex justify-center items-center">
                            <div class="h-6 w-6 bg-blue-200 rounded-full mr-2"></div>
                            <div class="h-4 bg-blue-100 rounded w-1/3"></div>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        const token = getTokenFromStorage();
        if (!token) {
            displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            window.location.href = '/Admin/login.html';
            return;
        }
        
        // Cập nhật trang hiện tại trong phân trang
        orderPagination.currentPage = page;
        
        // Xây dựng tham số cho API
        const params = new URLSearchParams();
        params.append('pageNumber', page.toString());
        params.append('pageSize', orderFilter.pageSize.toString());
        
        // Thêm các tham số tìm kiếm và lọc
        if (orderFilter.searchTerm && orderFilter.searchTerm.trim() !== '') {
            params.append('SearchTerm', orderFilter.searchTerm.trim());
            if (tempDebug) {
                console.log('Search term param:', orderFilter.searchTerm.trim());
            }
        }
        
        if (orderFilter.status && orderFilter.status.trim() !== '') {
            // Đảm bảo status có định dạng đúng cho API
            let statusValue = orderFilter.status.trim();
            params.append('Status', statusValue);
            
            if (tempDebug) {
                console.log('Status param:', statusValue);
            }
        }
        
        if (orderFilter.startDate) {
            params.append('StartDate', orderFilter.startDate);
            if (tempDebug) {
                console.log('StartDate param:', orderFilter.startDate);
            }
        }
        
        if (orderFilter.endDate) {
            params.append('EndDate', orderFilter.endDate);
            if (tempDebug) {
                console.log('EndDate param:', orderFilter.endDate);
            }
        }
        
        // Thêm tham số lọc giá
        if (orderFilter.minPrice) {
            params.append('MinPrice', orderFilter.minPrice.toString());
            if (tempDebug) {
                console.log('MinPrice param:', orderFilter.minPrice);
            }
        }
        
        if (orderFilter.maxPrice) {
            params.append('MaxPrice', orderFilter.maxPrice.toString());
            if (tempDebug) {
                console.log('MaxPrice param:', orderFilter.maxPrice);
            }
        }
        
        // Thêm tham số sắp xếp
        if (orderFilter.sortBy) {
            params.append('SortBy', orderFilter.sortBy);
            params.append('SortDirection', orderFilter.sortDirection);
            
            if (tempDebug) {
                console.log('Sort params:', orderFilter.sortBy, orderFilter.sortDirection);
            }
        }
        
        // Gọi API lấy danh sách đơn hàng
        const apiUrl = `${API_BASE}/Orders/seller-orders`;
        
        if (tempDebug) {
            console.log('Calling API:', apiUrl);
            console.log('With params:', Object.fromEntries(params.entries()));
        }
        
        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API trả về mã lỗi: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (tempDebug) {
            console.group('API Response');
            console.log('Status:', response.status);
            console.log('Data:', data);
            console.groupEnd();
        }
        
        // Cập nhật dữ liệu đơn hàng và phân trang
        sellerOrders = data.items || [];
        orderPagination.totalItems = data.totalCount || 0;
        orderPagination.totalPages = data.totalPages || 1;
        
        // Hiển thị danh sách đơn hàng
        renderOrders(sellerOrders);
        
        // Cập nhật phân trang
        renderOrderPagination();
        
        // Cập nhật số lượng hiển thị
        const ordersCount = document.getElementById('orders-count');
        if (ordersCount) {
            ordersCount.textContent = `${data.totalCount || 0} đơn hàng`;
        }
        
    } catch (error) {
        console.error('Lỗi khi tải đơn hàng:', error);
        displayToastMessage(`Lỗi khi tải đơn hàng: ${error.message}`, 'error');
        
        // Hiển thị thông báo lỗi trong bảng
        const orderTableBody = document.getElementById('order-table-body');
        if (orderTableBody) {
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center">
                        <div class="text-red-600">
                            <i class="fas fa-exclamation-circle mr-2"></i>
                            Có lỗi xảy ra khi tải danh sách đơn hàng
                        </div>
                    </td>
                </tr>
            `;
        }
    } finally {
        // Đánh dấu đã tải xong
        ordersLoading = false;
    }
}



/**
 * Cập nhật hiển thị số lượng đơn hàng
 * @param {number} count - Số lượng đơn hàng
 */
function updateOrderCountDisplay(count) {
    const ordersCountElement = document.getElementById('orders-count');
    const ordersCountInfoElement = document.getElementById('orders-count-info');
    
    if (ordersCountElement) {
        ordersCountElement.textContent = `${count} đơn hàng`;
    }
    
    if (ordersCountInfoElement) {
        ordersCountInfoElement.textContent = `Hiển thị ${count} đơn hàng`;
    }
}


/**
 * Kiểm tra xem có thể cập nhật trạng thái đơn hàng không
 * @param {string} status - Trạng thái hiện tại của đơn hàng
 * @returns {boolean} - Có thể cập nhật hay không
 */
function canUpdateOrderStatus(status) {
    const allowedStatuses = [
        'Chờ xác nhận', 'Đang xử lý', 'Đang giao', 
        'pending', 'processing', 'shipped'
    ];
    
    return allowedStatuses.some(s => status.toLowerCase() === s.toLowerCase());
}





/**
 * Tạo HTML cho các nút hành động dựa trên trạng thái đơn hàng
 * @param {number} orderId - ID đơn hàng
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} HTML các nút hành động
 */
function getOrderActions(orderId, status) {
    const statusLower = status?.toLowerCase() || '';
    
    // Luôn có nút Xem
    let actions = `
        <button onclick="viewOrderDetails(${orderId})" class="action-button action-button-view" title="Xem chi tiết đơn hàng">
            <i class="fas fa-eye"></i> Xem
        </button>
    `;
    
    // Chỉ hiển thị nút Hủy nếu đơn hàng chưa giao và chưa hủy
    const canCancel = !statusLower.includes('đã giao') && 
                      !statusLower.includes('delivered') && 
                      !statusLower.includes('đã hủy') && 
                      !statusLower.includes('cancelled') &&
                      !statusLower.includes('completed');
                      
    if (canCancel) {
        actions += `
            <button onclick="handleCancelOrder(${orderId})" class="action-button action-button-cancel" title="Hủy đơn hàng">
                <i class="fas fa-times-circle"></i> Hủy
            </button>
        `;
    }
    
    return actions;
}

/**
 * Hiển thị phân trang cho danh sách đơn hàng
 */
function renderOrderPagination() {
    // Cập nhật hiển thị thông tin trang
    const currentPageInfo = document.getElementById('current-page-info');
    const totalPagesInfo = document.getElementById('total-pages-info');
    const totalItemsInfo = document.getElementById('total-items-info');
    
    if (currentPageInfo) currentPageInfo.textContent = orderPagination.currentPage.toString();
    if (totalPagesInfo) totalPagesInfo.textContent = orderPagination.totalPages.toString();
    if (totalItemsInfo) totalItemsInfo.textContent = orderPagination.totalItems.toString();
    
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = orderPagination.currentPage.toString();
        pageInput.max = orderPagination.totalPages.toString();
    }
    
    // Cập nhật trạng thái nút phân trang
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    if (prevPageBtn) prevPageBtn.disabled = orderPagination.currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = orderPagination.currentPage >= orderPagination.totalPages;
    
    // Thiết lập sự kiện cho các nút phân trang
    if (prevPageBtn) {
        prevPageBtn.onclick = () => {
            if (orderPagination.currentPage > 1) {
                changeOrderPage(orderPagination.currentPage - 1);
            }
        };
    }
    
    if (nextPageBtn) {
        nextPageBtn.onclick = () => {
            if (orderPagination.currentPage < orderPagination.totalPages) {
                changeOrderPage(orderPagination.currentPage + 1);
            }
        };
    }
    
    // Thiết lập sự kiện cho nút go-to-page
    const goToPageBtn = document.getElementById('go-to-page-btn');
    if (goToPageBtn && pageInput) {
        goToPageBtn.onclick = () => {
            const targetPage = parseInt(pageInput.value);
            if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= orderPagination.totalPages && targetPage !== orderPagination.currentPage) {
                changeOrderPage(targetPage);
            } else {
                pageInput.value = orderPagination.currentPage.toString();
            }
        };
        
        // Thêm xử lý sự kiện Enter
        pageInput.onkeyup = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                goToPageBtn.click();
            }
        };
    }
}

/**
 * Chuyển đến trang đơn hàng khác
 * @param {number} page - Số trang muốn chuyển đến
 */
function changeOrderPage(page) {
    if (debugMode) console.log(`Chuyển đến trang đơn hàng ${page}`);
    if (page < 1 || (orderPagination.totalPages && page > orderPagination.totalPages)) return;
    
    // Cuộn lên đầu phần đơn hàng
    const ordersSection = document.getElementById('orders-section');
    if (ordersSection) {
        ordersSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    loadSellerOrders(page);
}


/**
 * Khởi tạo các bộ lọc đơn hàng và xử lý sự kiện
 */

function initOrderFilters() {
    const tempDebug = debugMode;
    
    if (tempDebug) console.log('Khởi tạo bộ lọc đơn hàng');
    
    // Lấy các phần tử filter form
    const orderFilterForm = document.getElementById('order-filter-form');
    const statusFilter = document.getElementById('status-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const searchFilter = document.getElementById('search-filter');
    const minPriceFilter = document.getElementById('min-price-filter');
    const maxPriceFilter = document.getElementById('max-price-filter');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const sortOrdersBy = document.getElementById('sort-orders-by');
    const pageSizeSelect = document.getElementById('page-size-select');
    
    // Đặt giá trị mặc định cho các bộ lọc
    if (statusFilter) statusFilter.value = orderFilter.status || '';
    if (startDateFilter) startDateFilter.value = orderFilter.startDate || '';
    if (endDateFilter) endDateFilter.value = orderFilter.endDate || '';
    if (searchFilter) searchFilter.value = orderFilter.searchTerm || '';
    if (minPriceFilter) minPriceFilter.value = orderFilter.minPrice || '';
    if (maxPriceFilter) maxPriceFilter.value = orderFilter.maxPrice || '';
    
    // Đặt giá trị mặc định cho bộ sắp xếp
    if (sortOrdersBy) {
        const sortValue = `${orderFilter.sortBy}:${orderFilter.sortDirection}`;
        sortOrdersBy.value = sortValue;
    }
    
    // Đặt giá trị mặc định cho kích thước trang
    if (pageSizeSelect) {
        pageSizeSelect.value = orderFilter.pageSize.toString();
    }
    
    // Xử lý sự kiện submit form
    if (orderFilterForm) {
        orderFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Cập nhật bộ lọc với các giá trị từ form
            orderFilter.status = statusFilter?.value || null;
            orderFilter.startDate = startDateFilter?.value || null;
            orderFilter.endDate = endDateFilter?.value || null;
            orderFilter.searchTerm = searchFilter?.value || '';
            orderFilter.minPrice = minPriceFilter?.value || null;
            orderFilter.maxPrice = maxPriceFilter?.value || null;
            
            // Tải lại đơn hàng với bộ lọc mới (luôn bắt đầu từ trang 1)
            if (tempDebug) console.log('Áp dụng bộ lọc mới:', orderFilter);
            loadSellerOrders(1);
        });
    }
    
    // Xử lý sự kiện đặt lại bộ lọc
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            // Đặt lại tất cả các trường bộ lọc
            if (statusFilter) statusFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (searchFilter) searchFilter.value = '';
            if (minPriceFilter) minPriceFilter.value = '';
            if (maxPriceFilter) maxPriceFilter.value = '';
            if (sortOrdersBy) sortOrdersBy.value = 'OrderDate:desc';
            if (pageSizeSelect) pageSizeSelect.value = '10';
            
            // Đặt lại đối tượng bộ lọc
            orderFilter = {
                startDate: null,
                endDate: null,
                status: null,
                searchTerm: '',
                minPrice: null,
                maxPrice: null,
                sortBy: 'OrderDate',
                sortDirection: 'desc',
                pageSize: 10
            };
            
            if (tempDebug) console.log('Đã đặt lại bộ lọc');
            loadSellerOrders(1);
        });
    }
    
    // Xử lý sự kiện thay đổi bộ sắp xếp
    if (sortOrdersBy) {
        sortOrdersBy.addEventListener('change', () => {
            const sortValue = sortOrdersBy.value;
            const [sortBy, sortDirection] = sortValue.split(':');
            
            orderFilter.sortBy = sortBy;
            orderFilter.sortDirection = sortDirection;
            
            if (tempDebug) console.log(`Sắp xếp thay đổi: ${sortBy} ${sortDirection}`);
            loadSellerOrders(1);
        });
    }
    
    // Xử lý sự kiện thay đổi kích thước trang
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            orderFilter.pageSize = parseInt(pageSizeSelect.value);
            
            if (tempDebug) console.log(`Kích thước trang thay đổi: ${orderFilter.pageSize}`);
            loadSellerOrders(1);
        });
    }
}


/**
 * Cập nhật thông tin số lượng đơn hàng
 */
function updateOrderCountInfo() {
    const countInfo = document.getElementById('orders-count-info');
    if (countInfo) {
        if (sellerOrders.length > 0) {
            countInfo.textContent = `Có ${orderPagination.totalItems} đơn hàng (đang hiển thị ${sellerOrders.length})`;
        } else if (ordersLoading) {
            countInfo.textContent = 'Đang tải thông tin đơn hàng...';
        } else {
            countInfo.textContent = 'Không có đơn hàng nào';
        }
    }
}


/**
 * Mở modal chi tiết đơn hàng
 * @param {number} orderId - ID của đơn hàng cần xem
 */
async function viewOrderDetails(orderId) {
    try {
        // Hiển thị loading
        const orderDetailModal = document.getElementById('order-detail-modal');
        if (!orderDetailModal) return;
        
        orderDetailModal.classList.remove('hidden');
        
        const modalContent = orderDetailModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="p-6 text-center">
                    <i class="fas fa-spinner fa-spin text-blue-600 text-2xl mb-3"></i>
                    <p>Đang tải thông tin đơn hàng...</p>
                </div>
            `;
        }
        
        // Lấy token
        const token = getTokenFromStorage();
        if (!token) {
            displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            orderDetailModal.classList.add('hidden');
            return;
        }
        
        // Gọi API lấy chi tiết đơn hàng
        const response = await fetch(`${API_BASE}/Orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API trả về mã lỗi: ${response.status}`);
        }
        
        const order = await response.json();
        if (debugMode) console.log('Chi tiết đơn hàng từ API:', order);
        
        // Hiển thị thông tin đơn hàng
        renderOrderDetail(order);
        
    } catch (error) {
        console.error('Lỗi khi tải chi tiết đơn hàng:', error);
        displayToastMessage(`Không thể tải thông tin đơn hàng: ${error.message}`, 'error');
        
        const orderDetailModal = document.getElementById('order-detail-modal');
        if (orderDetailModal) {
            orderDetailModal.classList.add('hidden');
        }
    }
}

/**
 * Hiển thị chi tiết đơn hàng trong modal
 * @param {Object} order - Dữ liệu đơn hàng cần hiển thị
 */
function renderOrderDetail(order) {
    const orderDetailModal = document.getElementById('order-detail-modal');
    const modalContent = orderDetailModal.querySelector('.modal-content');
    
    if (!modalContent) return;
    
    if (debugMode) console.log('Hiển thị chi tiết đơn hàng:', order);
    
    // Hàm định dạng tiền tệ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };
    
    // Hàm định dạng ngày giờ
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Lấy thông tin trạng thái
    const getStatusInfo = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
            case 'chờ xử lý':
                return { class: 'bg-yellow-100 text-yellow-800', text: 'Chờ xử lý' };
            case 'processing':
            case 'đang xử lý':
                return { class: 'bg-blue-100 text-blue-800', text: 'Đang xử lý' };
            case 'shipped':
            case 'đang giao hàng':
                return { class: 'bg-indigo-100 text-indigo-800', text: 'Đang giao' };
            case 'delivered':
            case 'đã giao hàng':
                return { class: 'bg-green-100 text-green-800', text: 'Đã giao' };
            case 'cancelled':
            case 'đã hủy':
                return { class: 'bg-red-100 text-red-800', text: 'Đã hủy' };
            case 'completed':
            case 'hoàn thành':
                return { class: 'bg-green-100 text-green-800', text: 'Hoàn thành' };
            default:
                return { class: 'bg-gray-100 text-gray-800', text: status || 'Không xác định' };
        }
    };
    
    // Xác định ID, trạng thái và các biến khác
    const orderId = order.orderID || order.orderId || order.id;
    const status = order.status;
    const statusInfo = getStatusInfo(status);
    
    // Lấy thông tin khách hàng từ các cấu trúc có thể có
    const customer = order.customerInfo || order.customer || order.user || {};
    
    // Xác định các hành động có thể thực hiện dựa trên trạng thái
    const canUpdateStatus = !['đã hủy', 'hoàn thành', 'cancelled', 'completed'].includes(status?.toLowerCase());
    
    // Tạo dữ liệu sản phẩm
    let orderItemsHtml = '';
    
    // Kiểm tra tất cả các khả năng trường chứa danh sách sản phẩm
    const items = order.items || order.orderItems || order.orderDetails || [];
    
    if (items && items.length > 0) {
        orderItemsHtml = items.map(item => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0">
                            <img class="h-10 w-10 rounded object-cover" 
                                 src="${item.productImageURL || item.imageUrl || 'https://dummyimage.com/50x50/e0e0e0/000000.png&text=No+Image'}" 
                                 alt="${item.productName || 'Sản phẩm'}" 
                                 onerror="this.src='https://dummyimage.com/50x50/e0e0e0/000000.png&text=Err';">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${item.productName}</div>
                            ${item.productID || item.productId ? `<div class="text-xs text-gray-500">ID: ${item.productID || item.productId}</div>` : ''}
                            ${item.shopName ? `<div class="text-xs text-gray-500">Shop: ${item.shopName}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.unitPrice || item.price || 0)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${item.quantity || 0}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.lineTotal || (item.unitPrice * item.quantity) || (item.price * item.quantity) || 0)}</td>
            </tr>
        `).join('');
    } else {
        orderItemsHtml = `
            <tr>
                <td colspan="4" class="px-4 py-3 text-center text-gray-500">
                    Không có thông tin sản phẩm
                </td>
            </tr>
        `;
    }
    
    // Tạo HTML chi tiết đơn hàng
    modalContent.innerHTML = `
        <div class="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 class="text-lg font-semibold">Chi tiết đơn hàng #${orderId}</h3>
            <button type="button" onclick="closeOrderDetailModal()" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin khách hàng</h4>
                    <p class="mb-1"><span class="font-medium">Tên khách hàng:</span> ${customer.fullName || customer.name || customer.customerName || 'Không có thông tin'}</p>
                    <p class="mb-1"><span class="font-medium">Email:</span> ${customer.email || 'Không có thông tin'}</p>
                    <p class="mb-1"><span class="font-medium">Số điện thoại:</span> ${customer.phone || customer.phoneNumber || 'Không có thông tin'}</p>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin đơn hàng</h4>
                    <p class="mb-1"><span class="font-medium">Mã đơn hàng:</span> #${orderId}</p>
                    <p class="mb-1"><span class="font-medium">Ngày đặt:</span> ${formatDate(order.orderDate || order.createdAt)}</p>
                    <p class="mb-1">
                        <span class="font-medium">Trạng thái:</span> 
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">${statusInfo.text}</span>
                    </p>
                </div>
            </div>
            
            <div class="mb-6 bg-gray-50 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Địa chỉ giao hàng</h4>
                <p>${order.shippingAddress || customer.address || 'Không có thông tin địa chỉ'}</p>
            </div>
            
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Sản phẩm</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${orderItemsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="border-t border-gray-200 pt-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Tổng tiền sản phẩm:</span>
                    <span>${formatCurrency(order.totalAmount || order.subtotal || order.subTotal || 0)}</span>
                </div>
                ${order.shippingFee ? `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Phí vận chuyển:</span>
                    <span>${formatCurrency(order.shippingFee || 0)}</span>
                </div>
                ` : ''}
                <div class="flex justify-between items-center font-semibold text-lg">
                    <span>Tổng thanh toán:</span>
                    <span>${formatCurrency(order.totalPayment || order.totalAmount || order.total || 0)}</span>
                </div>
            </div>
            
            ${canUpdateStatus ? `
                
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Đóng modal chi tiết đơn hàng
 */
function closeOrderDetailModal() {
    const orderDetailModal = document.getElementById('order-detail-modal');
    if (orderDetailModal) {
        orderDetailModal.classList.add('hidden');
    }
}

/**
 * Mở modal cập nhật trạng thái đơn hàng
 * @param {number} orderId - ID của đơn hàng cần cập nhật
 * @param {string} currentStatus - Trạng thái hiện tại của đơn hàng
 */
function openUpdateStatusModal(orderId, currentStatus) {
    try {
        if (debugMode) console.log(`Opening status update modal for order #${orderId} with current status: ${currentStatus}`);
        
        const updateStatusModal = document.getElementById('update-status-modal');
        if (!updateStatusModal) {
            if (debugMode) console.error('Không tìm thấy modal cập nhật trạng thái');
            displayToastMessage('Không tìm thấy giao diện cập nhật trạng thái', 'error');
            return;
        }
        
        // Lấy phần tử select trong modal
        const statusSelect = updateStatusModal.querySelector('#new-status');
        if (statusSelect) {
            // Xóa tất cả options hiện tại
            statusSelect.innerHTML = '';
            
            // Thêm các options dựa vào trạng thái hiện tại
            const availableStatuses = getAvailableStatuses(currentStatus);
            if (availableStatuses.length === 0) {
                displayToastMessage('Không có trạng thái nào có thể cập nhật từ ' + currentStatus, 'info');
                return;
            }
            
            availableStatuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status.value;
                option.textContent = status.text;
                statusSelect.appendChild(option);
            });
        }
        
        // Lưu orderId vào form để sử dụng khi submit
        const updateStatusForm = updateStatusModal.querySelector('#update-status-form');
        if (updateStatusForm) {
            updateStatusForm.dataset.orderId = orderId;
        }
        
        // Xóa nội dung ghi chú
        const statusNote = updateStatusModal.querySelector('#status-note');
        if (statusNote) {
            statusNote.value = '';
        }
        
        // Hiển thị modal
        updateStatusModal.classList.remove('hidden');
        
        // Đặt focus vào select
        if (statusSelect) {
            setTimeout(() => statusSelect.focus(), 100);
        }
        
        // Thêm sự kiện đóng modal khi click ngoài
        updateStatusModal.addEventListener('click', (e) => {
            if (e.target === updateStatusModal) {
                closeUpdateStatusModal();
            }
        });
        
        // Đảm bảo nút cập nhật có sự kiện click
        const updateButton = updateStatusModal.querySelector('button[type="button"]:last-child');
        if (updateButton) {
            // Xóa tất cả các event listener cũ
            const newUpdateButton = updateButton.cloneNode(true);
            updateButton.parentNode.replaceChild(newUpdateButton, updateButton);
            
            // Thêm sự kiện mới
            newUpdateButton.addEventListener('click', handleUpdateOrderStatus);
        }
    } catch (error) {
        if (debugMode) console.error('Lỗi khi mở modal cập nhật trạng thái:', error);
        displayToastMessage('Có lỗi khi mở giao diện cập nhật trạng thái', 'error');
    }
}

/**
 * Đóng modal cập nhật trạng thái
 */
function closeUpdateStatusModal() {
    const updateStatusModal = document.getElementById('update-status-modal');
    if (updateStatusModal) {
        updateStatusModal.classList.add('hidden');
    }
}

/**
 * Lấy danh sách trạng thái có thể chuyển đến từ trạng thái hiện tại
 * @param {string} currentStatus - Trạng thái hiện tại
 * @returns {Array<{value: string, text: string}>} Danh sách trạng thái có thể chuyển đến
 */
function getAvailableStatuses(currentStatus) {
    // Chuyển đổi trạng thái hiện tại thành lowercase để so sánh
    const status = currentStatus?.toLowerCase() || 'pending';
    
    // Danh sách tất cả các trạng thái
    const allStatuses = [
        { value: 'Pending', text: 'Chờ xử lý' },
        { value: 'Processing', text: 'Đang xử lý' },
        { value: 'Shipped', text: 'Đang giao' },
        { value: 'Delivered', text: 'Đã giao' },
        { value: 'Completed', text: 'Hoàn thành' },
        { value: 'Cancelled', text: 'Đã hủy' }
    ];
    
    // Định nghĩa các trạng thái được phép chuyển từ trạng thái hiện tại
    const statusTransitions = {
        'pending': ['Processing', 'Cancelled'],
        'chờ xử lý': ['Processing', 'Cancelled'],
        
        'processing': ['Shipped', 'Cancelled'],
        'đang xử lý': ['Shipped', 'Cancelled'],
        
        'shipped': ['Delivered', 'Cancelled'],
        'đang giao': ['Delivered', 'Cancelled'],
        'đang giao hàng': ['Delivered', 'Cancelled'],
        
        'delivered': ['Completed', 'Cancelled'],
        'đã giao': ['Completed', 'Cancelled'],
        'đã giao hàng': ['Completed', 'Cancelled'],
        
        'completed': [], // Không thể chuyển từ completed
        'hoàn thành': [],
        
        'cancelled': [],  // Không thể chuyển từ cancelled
        'đã hủy': []
    };
    
    // Lấy danh sách trạng thái có thể chuyển đến
    const allowedTransitions = statusTransitions[status] || [];
    
    // Lọc các trạng thái cho phép
    return allStatuses.filter(s => allowedTransitions.includes(s.value));
}


/**
 * Xử lý khi người dùng click vào trạng thái đơn hàng
 * @param {Event} event - Sự kiện click
 * @param {string} currentStatus - Trạng thái hiện tại
 */
function handleStatusChange(event, currentStatus) {
    const button = event.currentTarget;
    const tr = button.closest('tr');
    const orderId = tr.querySelector('td:first-child a')?.textContent?.replace('#', '');
    
    if (!orderId) {
        console.error('Không tìm thấy ID đơn hàng');
        return;
    }
    
    // Xác định trạng thái tiếp theo
    let nextStatus = '';
    const statusLower = currentStatus.toLowerCase();
    
    if (statusLower.includes('pending') || statusLower.includes('chờ xác nhận')) {
        nextStatus = 'Processing'; // Đang xử lý
    } else if (statusLower.includes('processing') || statusLower.includes('đang xử lý')) {
        nextStatus = 'Shipped'; // Đang giao
    } else if (statusLower.includes('shipped') || statusLower.includes('đang giao')) {
        nextStatus = 'Delivered'; // Đã giao hàng
    } else {
        alert('Không thể chuyển tiếp trạng thái này!');
        return;
    }
    
    if (confirm(`Bạn có chắc muốn chuyển đơn hàng #${orderId} từ "${currentStatus}" sang "${nextStatus}"?`)) {
        // Gọi API cập nhật trạng thái ở đây
        updateOrderStatus(orderId, nextStatus);
    }
}



/**
 * Xử lý hủy đơn hàng
 * @param {number} orderId - ID đơn hàng cần hủy
 */
async function handleCancelOrder(orderId) {
    if (confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${orderId}?`)) {
        try {
            // Hiển thị thông báo đang xử lý
            displayToastMessage('Đang hủy đơn hàng...', 'info');
            
            const token = getTokenFromStorage();
            if (!token) {
                displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                return;
            }
            
            const response = await fetch(`${API_BASE}/Orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newStatus: 'Cancelled',
                    reason: 'Hủy bởi người bán'
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API trả về mã lỗi: ${response.status} - ${errorText}`);
            }
            
            // Hiển thị thông báo thành công
            displayToastMessage('Đơn hàng đã được hủy thành công', 'success');
            
            // Tải lại danh sách đơn hàng
            loadSellerOrders(orderPagination.currentPage);
            
        } catch (error) {
            console.error('Lỗi khi hủy đơn hàng:', error);
            displayToastMessage(`Không thể hủy đơn hàng: ${error.message}`, 'error');
        }
    }
}


/**
 * Lấy token từ localStorage hoặc sessionStorage
 * @returns {string|null} JWT token hoặc null nếu không tìm thấy
 */
function getTokenFromStorage() {
    return localStorage.getItem('authToken') || 
           sessionStorage.getItem('authToken') ||
           localStorage.getItem('access_token') || 
           sessionStorage.getItem('access_token') ||
           null;
}

/**
 * Hiển thị thông báo toast - hàm an toàn để tránh lỗi đệ quy
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo: 'info', 'success', 'error'
 * @param {number} duration - Thời gian hiển thị (ms)
 */
function displayToastMessage(message, type = 'info', duration = 3000) {
    try {
        // Kiểm tra window.showToast (dự phòng nếu đã có trong global)
        if (window.showToast && typeof window.showToast === 'function' && window.showToast !== showToast) {
            window.showToast(message, type, duration);
            return;
        }
        
        // Nếu không có showToast toàn cục, tạo toast riêng
        const toast = document.getElementById('toast-notification');
        if (!toast) {
            if (debugMode) console.warn('Không tìm thấy phần tử toast-notification');
            return;
        }
        
        // Xóa các class type cũ
        toast.classList.remove('info', 'success', 'error');
        
        // Thiết lập nội dung và loại thông báo
        toast.textContent = message;
        toast.classList.add(type);
        toast.classList.add('show');
        
        // Tự động ẩn sau một khoảng thời gian
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    } catch (error) {
        // Nếu có lỗi, chỉ log ra console để tránh lỗi đệ quy
        if (debugMode) console.error('Lỗi khi hiển thị toast:', error);
    }
}

// Chức năng showToast an toàn cho global scope
window.showToast = displayToastMessage;

/**
 * Tạo dữ liệu đơn hàng mẫu trong trường hợp API lỗi
 * @returns {Array} Danh sách đơn hàng mẫu
 */
function createDummyOrders() {
    return [
        {
            orderId: 1001,
            customerName: 'Nguyễn Văn A',
            orderDate: new Date().toISOString(),
            totalItems: 2,
            totalAmount: 1500000,
            status: 'Pending'
        },
        {
            orderId: 1002,
            customerName: 'Trần Thị B',
            orderDate: new Date(Date.now() - 86400000).toISOString(), // Hôm qua
            totalItems: 1,
            totalAmount: 800000,
            status: 'Processing'
        },
        {
            orderId: 1003,
            customerName: 'Lê Văn C',
            orderDate: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 ngày trước
            totalItems: 3,
            totalAmount: 2200000,
            status: 'Delivered'
        }
    ];
}

// Đảm bảo các hàm được export cho sử dụng từ HTML
window.loadSellerOrders = loadSellerOrders;
window.changeOrderPage = changeOrderPage;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailModal = closeOrderDetailModal;
window.openUpdateStatusModal = openUpdateStatusModal;
window.closeUpdateStatusModal = closeUpdateStatusModal;
window.handleUpdateOrderStatus = handleUpdateOrderStatus;
window.checkAndInitOrdersSection = checkAndInitOrdersSection;