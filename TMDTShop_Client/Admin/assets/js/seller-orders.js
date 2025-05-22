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
    sortBy: 'orderDate', // Thêm trường sắp xếp mặc định
    sortDirection: 'desc' // Thêm hướng sắp xếp mặc định (mới nhất trước)
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
// Chuyển đổi trạng thái người dùng sang giá trị API
const statusMapping = {
    'Chờ xử lý': 'Pending',
    'Đang xử lý': 'Processing',
    'Đang giao': 'Shipped',
    'Đã giao': 'Delivered',
    'Hoàn thành': 'Completed',
    'Đã hủy': 'Cancelled'
};
// Ngược lại nếu cần
const reverseStatusMapping = {
    'Pending': 'Chờ xử lý',
    'Processing': 'Đang xử lý',
    'Shipped': 'Đang giao',
    'Delivered': 'Đã giao',
    'Completed': 'Hoàn thành',
    'Cancelled': 'Đã hủy'
};
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
async function loadSellerOrders(page = 1) {
    try {
        // Tránh gọi API nhiều lần nếu đang tải
        if (ordersLoading) return;
        ordersLoading = true;
        
        // Bật chế độ debug tạm thời
        const tempDebug = true;
        
        if (tempDebug) {
            console.group('LoadSellerOrders');
            console.log('Trang yêu cầu:', page);
            console.log('Bộ lọc:', JSON.stringify(orderFilter));
        }
        
        // Cập nhật trang hiện tại
        orderPagination.currentPage = page;
        
        // Hiển thị loading
        const orderTableBody = document.getElementById('order-table-body');
        if (orderTableBody) {
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center">
                        <div class="flex flex-col items-center justify-center">
                            <svg class="animate-spin h-6 w-6 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p>Đang tải dữ liệu đơn hàng...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Ẩn thông báo không có đơn hàng
        const noOrdersMessage = document.getElementById('no-orders-message');
        if (noOrdersMessage) {
            noOrdersMessage.classList.add('hidden');
        }
        
        // Tạo tham số query cho API call
        const params = new URLSearchParams();
        
        // Tham số phân trang
        params.append('pageNumber', page.toString());
        params.append('pageSize', orderPagination.pageSize.toString());
        
        // ===== PHẦN XỬ LÝ NGÀY THÁNG =====
        if (orderFilter.startDate) {
            try {
                // Chuyển đổi ngày về định dạng yyyy-MM-dd 
                // (format phổ biến cho .NET API)
                const startDate = new Date(orderFilter.startDate);
                if (!isNaN(startDate.getTime())) {
                    const year = startDate.getFullYear();
                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                    const day = String(startDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;
                    
                    params.append('StartDate', formattedDate);
                    
                    if (tempDebug) {
                        console.log('StartDate param:', formattedDate);
                    }
                }
            } catch (e) {
                console.error('Lỗi xử lý ngày bắt đầu:', e);
            }
        }
        
        if (orderFilter.endDate) {
            try {
                const endDate = new Date(orderFilter.endDate);
                if (!isNaN(endDate.getTime())) {
                    const year = endDate.getFullYear();
                    const month = String(endDate.getMonth() + 1).padStart(2, '0');
                    const day = String(endDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;
                    
                    params.append('EndDate', formattedDate);
                    
                    if (tempDebug) {
                        console.log('EndDate param:', formattedDate);
                    }
                }
            } catch (e) {
                console.error('Lỗi xử lý ngày kết thúc:', e);
            }
        }
        
        // ===== PHẦN XỬ LÝ TRẠNG THÁI =====
        if (orderFilter.status && orderFilter.status !== 'all' && orderFilter.status.trim() !== '') {
            let statusValue = orderFilter.status.trim();
            
            // Kiểm tra và chuyển đổi tên trạng thái nếu cần
            // Ví dụ: nếu select box lưu giá trị theo tiếng Việt mà API cần tiếng Anh
            const statusMappingToApi = {
                'Chờ xử lý': 'Pending',
                'Đang xử lý': 'Processing',
                'Đang giao': 'Shipped',
                'Đã giao': 'Delivered',
                'Hoàn thành': 'Completed',
                'Đã hủy': 'Cancelled'
            };
            
            if (statusMappingToApi[statusValue]) {
                statusValue = statusMappingToApi[statusValue];
            }else {
                // Xử lý trường hợp ngược lại (nếu đã là tiếng Anh)
                const lowerStatus = statusValue.toLowerCase();
                for (const [key, value] of Object.entries(statusMapping)) {
                    if (value.toLowerCase() === lowerStatus) {
                        statusValue = value; // Đảm bảo đúng format chữ hoa/thường
                        break;
                    }
                }
            }
            
            
            params.append('Status', statusValue);
            
            if (tempDebug) {
                console.log('Status param:', statusValue);
            }
        }
        
        // ===== PHẦN XỬ LÝ TÌM KIẾM =====
        if (orderFilter.searchTerm && orderFilter.searchTerm.trim() !== '') {
            const searchTerm = orderFilter.searchTerm.trim();
            
            // Gửi tham số tìm kiếm
            params.append('SearchTerm', searchTerm);
            
            // Nếu API hỗ trợ tìm kiếm theo trường cụ thể
            // Có thể thêm tham số SearchField để chỉ tìm theo tên khách hàng
            // params.append('SearchField', 'CustomerName');
            
            if (tempDebug) {
                console.log('SearchTerm param:', searchTerm);
            }
        }
        
        // ===== PHẦN XỬ LÝ SẮP XẾP =====
        if (orderFilter.sortBy) {
            // Xây dựng bảng ánh xạ tên trường từ JS sang API (nếu có sự khác biệt)
            // Nếu API sử dụng PascalCase nhưng JS dùng camelCase
            const sortFieldMapping = {
                'orderDate': 'OrderDate',
                'orderId': 'OrderId',
                'totalAmount': 'TotalAmount',
                'totalPayment': 'TotalPayment',
                'status': 'Status'
            };
            
            // Lấy tên trường phù hợp với API
            const apiSortField = sortFieldMapping[orderFilter.sortBy] || orderFilter.sortBy;
            
            params.append('SortBy', apiSortField);
            params.append('SortDirection', orderFilter.sortDirection || 'desc');
            
            if (tempDebug) {
                console.log('Sort params:', apiSortField, orderFilter.sortDirection || 'desc');
            }
        }
        
        // In ra URL cuối cùng
        const apiUrl = `${API_BASE}/Orders/seller-orders`;
        
        if (tempDebug) {
            console.log('API URL:', apiUrl);
            console.log('Final query string:', params.toString());
            console.log('Full URL:', `${apiUrl}?${params.toString()}`);
        }
        
        // Lấy token
        const token = getTokenFromStorage();
        if (!token) {
            displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            if (tempDebug) console.error('Không tìm thấy token đăng nhập');
            ordersLoading = false;
            return;
        }
        
        // Gọi API lấy danh sách đơn hàng
        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            if (tempDebug) {
                console.error('API Response Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
            }
            throw new Error(`API trả về mã lỗi: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        
        // Xử lý phản hồi API
        if (data) {
            if (data.items !== undefined) {
                // Lưu trữ đơn hàng vào biến toàn cục
                sellerOrders = data.items || [];
                
                // Trích xuất thông tin phân trang
                orderPagination.totalItems = data.totalCount || 0;
                orderPagination.totalPages = data.totalPages || 1;
                orderPagination.pageSize = data.pageSize || 10;
                orderPagination.currentPage = data.pageNumber || 1;
                
                if (tempDebug) {
                    console.log('Phân trang:', {
                        totalItems: orderPagination.totalItems,
                        totalPages: orderPagination.totalPages,
                        pageSize: orderPagination.pageSize,
                        currentPage: orderPagination.currentPage
                    });
                }
                
                // QUAN TRỌNG: Render với mảng đơn hàng (items)
                renderOrders(sellerOrders);
            } else if (Array.isArray(data)) {
                // Trường hợp API trả về trực tiếp mảng đơn hàng
                sellerOrders = data;
                
                // Ước tính thông tin phân trang
                orderPagination.totalItems = data.length;
                orderPagination.totalPages = 1;
                
                // Render mảng đơn hàng
                renderOrders(sellerOrders);
            } else {
                if (tempDebug) console.error('Cấu trúc phản hồi API không đúng định dạng:', data);
                displayToastMessage('Dữ liệu đơn hàng không đúng định dạng', 'error');
                sellerOrders = [];
                renderOrders(sellerOrders);
            }
            
            // Hiển thị phân trang
            renderOrderPagination();
            
            // Cập nhật lại thông tin số lượng
            updateOrderCountInfo();
            
            // Hiển thị thông báo không có đơn hàng nếu cần
            if (sellerOrders.length === 0 && noOrdersMessage) {
                noOrdersMessage.classList.remove('hidden');
            }
        } else {
            if (tempDebug) console.warn('API không trả về dữ liệu');
            sellerOrders = [];
            renderOrders(sellerOrders);
            renderOrderPagination();
            
            // Hiển thị thông báo không có đơn hàng nếu API không trả về dữ liệu
            if (noOrdersMessage) {
                noOrdersMessage.classList.remove('hidden');
            }
        }
        
        if (tempDebug) console.groupEnd();
    } catch (error) {
        console.error('Lỗi khi tải đơn hàng:', error);
        displayToastMessage(`Không thể tải đơn hàng: ${error.message}`, 'error');
        
        // Xử lý khi có lỗi
        sellerOrders = [];
        renderOrders(sellerOrders);
        renderOrderPagination();
        
        // Hiển thị thông báo không có đơn hàng khi có lỗi
        const noOrdersMessage = document.getElementById('no-orders-message');
        if (noOrdersMessage) {
            noOrdersMessage.classList.remove('hidden');
        }
    } finally {
        ordersLoading = false;
        
        // Điều chỉnh responsive sau khi hiển thị dữ liệu
        setTimeout(adjustOrdersTableResponsive, 100);
    }
}


/**
 * Hiển thị danh sách đơn hàng trong bảng
 * @param {Array} orders - Mảng đơn hàng cần hiển thị
 */
function renderOrders(orders) {
    const orderTableBody = document.getElementById('order-table-body');
    if (!orderTableBody) return;
    
    // Hàm định dạng tiền tệ
    const formatCurrency = (amount) => {
        // Kiểm tra số có phải là NaN không
        if (isNaN(amount) || amount === null || amount === undefined) {
            return '0 ₫';
        }
        
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };
    
    // Thêm debug để kiểm tra
    if (debugMode) {
        console.log('Orders data:', orders);
        if (orders && orders.length > 0) {
            console.log('First order:', orders[0]);
            console.log('totalPayment type:', typeof orders[0].totalPayment);
            console.log('totalPayment value:', orders[0].totalPayment);
        }
    }
    
    if (orders && orders.length > 0) {
        orderTableBody.innerHTML = orders.map(order => {
            // Log chi tiết từng đơn hàng để debug
            if (debugMode) console.log('Processing order:', order);
            
            // Lấy thông tin đơn hàng - CHÚ Ý CHỮ HOA/THƯỜNG
            const orderId = order.orderID || order.orderId || order.id || 'N/A';
            const customerName = order.customerName || (order.customerInfo && order.customerInfo.fullName) || 'Khách hàng';
            const orderDate = formatDateTime(order.orderDate || order.createdAt);
            
            // QUAN TRỌNG: Lấy giá trị totalPayment đúng - xử lý phân biệt chữ HOA/thường
            // API trả về totalPayment (P viết thường)
            const totalPayment = parseFloat(order.totalPayment) || 0;
            
            // Các thông tin khác
            const totalAmount = parseFloat(order.totalAmount) || 0;
            const status = order.status || 'Không xác định';
            const statusClass = getOrderStatusClass(status);
            
            return `
                <tr>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <div class="text-sm text-gray-900">#${orderId}</div>
                    </td>
                    <td class="px-3 py-2">
                        <div class="text-sm text-gray-900">${customerName}</div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${orderDate}</div>
                    </td>
                    <!-- Cột mới: Tổng thanh toán thay cho Số lượng -->
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium">
                        ${formatCurrency(totalPayment)}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        ${formatCurrency(totalAmount)}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${getOrderStatusText(status)}
                        </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="viewOrderDetails(${orderId})" class="text-blue-600 hover:text-blue-900 mr-3" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${canUpdateOrderStatus(status) ? `
                            <button onclick="openUpdateStatusModal(${orderId}, '${status}')" class="text-green-600 hover:text-green-900" title="Cập nhật trạng thái">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        // Nếu không có đơn hàng nào
        orderTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center">
                    <div class="text-gray-500">Không có đơn hàng nào</div>
                </td>
            </tr>
        `;
    }
}
/**
 * Lấy lớp CSS dựa trên trạng thái đơn hàng
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} Tên lớp CSS tương ứng
 */
function getOrderStatusClass(status) {
    const statusLower = status?.toLowerCase();
    
    if (!statusLower) return 'bg-gray-100 text-gray-800';
    
    if (statusLower.includes('hủy') || statusLower === 'cancelled')
        return 'bg-red-100 text-red-800';
        
    if (statusLower.includes('hoàn thành') || statusLower === 'completed')
        return 'bg-green-100 text-green-800';
        
    if (statusLower.includes('giao hàng') || statusLower === 'delivered')
        return 'bg-green-100 text-green-800';
        
    if (statusLower.includes('đang giao') || statusLower === 'shipped')
        return 'bg-blue-100 text-blue-800';
        
    if (statusLower.includes('xử lý') || statusLower === 'processing')
        return 'bg-yellow-100 text-yellow-800';
        
    if (statusLower.includes('chờ') || statusLower === 'pending')
        return 'bg-gray-100 text-gray-800';
        
    return 'bg-gray-100 text-gray-800';
}

/**
 * Chuyển đổi trạng thái đơn hàng sang văn bản người dùng
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} Trạng thái hiển thị cho người dùng
 */
function getOrderStatusText(status) {
    const statusLower = status?.toLowerCase();
    
    if (!statusLower) return 'Không xác định';
    
    if (statusLower.includes('hủy') || statusLower === 'cancelled')
        return 'Đã hủy';
        
    if (statusLower.includes('hoàn thành') || statusLower === 'completed')
        return 'Hoàn thành';
        
    if (statusLower.includes('giao hàng') || statusLower === 'delivered')
        return 'Đã giao';
        
    if (statusLower.includes('đang giao') || statusLower === 'shipped')
        return 'Đang giao';
        
    if (statusLower.includes('xử lý') || statusLower === 'processing')
        return 'Đang xử lý';
        
    if (statusLower.includes('chờ') || statusLower === 'pending')
        return 'Chờ xử lý';
        
    return status; // Trả về nguyên bản nếu không khớp
}
/**
 * Kiểm tra xem có thể cập nhật trạng thái đơn hàng không
 * @param {string} status - Trạng thái đơn hàng hiện tại
 * @returns {boolean} Có thể cập nhật hay không
 */
function canUpdateOrderStatus(status) {
    const statusLower = status?.toLowerCase();
    
    // Không thể cập nhật trạng thái của đơn hàng đã hủy hoặc hoàn thành
    if (!statusLower || 
        statusLower.includes('hủy') || 
        statusLower === 'cancelled' || 
        statusLower.includes('hoàn thành') || 
        statusLower === 'completed') {
        return false;
    }
    
    return true;
}

/**
 * Hiển thị phân trang cho đơn hàng
 */
function renderOrderPagination() {
    const orderPaginationContainer = document.getElementById('order-pagination');
    if (!orderPaginationContainer) return;
    
    // Xóa phân trang cũ
    orderPaginationContainer.innerHTML = '';
    
    // Nếu chỉ có 1 trang, không cần hiển thị phân trang
    if (orderPagination.totalPages <= 1) return;
    
    // Tạo container cho phân trang
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'flex justify-between items-center bg-white px-4 py-3 sm:px-6 border rounded-md';
    
    // Hiển thị thông tin tổng số mục
    const infoSpan = document.createElement('div');
    infoSpan.className = 'text-sm text-gray-700';
    infoSpan.textContent = `Hiển thị ${sellerOrders.length} / ${orderPagination.totalItems} đơn hàng`;
    
    // Tạo các nút phân trang
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex space-x-2';
    
    // Nút Previous
    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = `px-3 py-1 rounded ${orderPagination.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = orderPagination.currentPage === 1;
    if (orderPagination.currentPage > 1) {
        prevButton.addEventListener('click', () => changeOrderPage(orderPagination.currentPage - 1));
    }
    
    buttonContainer.appendChild(prevButton);
    
    // Các nút số trang
    const maxPagesToShow = 5;
    const startPage = Math.max(1, orderPagination.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(orderPagination.totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.type = 'button';
        pageButton.className = `px-3 py-1 rounded ${i === orderPagination.currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        pageButton.textContent = i;
        
        // Thêm sự kiện click nếu không phải trang hiện tại
        if (i !== orderPagination.currentPage) {
            pageButton.addEventListener('click', () => changeOrderPage(i));
        }
        
        buttonContainer.appendChild(pageButton);
    }
    
    // Nút Next
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = `px-3 py-1 rounded ${orderPagination.currentPage === orderPagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = orderPagination.currentPage === orderPagination.totalPages;
    if (orderPagination.currentPage < orderPagination.totalPages) {
        nextButton.addEventListener('click', () => changeOrderPage(orderPagination.currentPage + 1));
    }
    
    buttonContainer.appendChild(nextButton);
    
    // Thêm các phần tử vào container
    paginationDiv.appendChild(infoSpan);
    paginationDiv.appendChild(buttonContainer);
    
    // Thêm vào DOM
    orderPaginationContainer.appendChild(paginationDiv);
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
 * Khởi tạo các bộ lọc đơn hàng
 */
/**
 * Khởi tạo các bộ lọc đơn hàng
 */
/**
 * Khởi tạo các bộ lọc đơn hàng và xử lý sự kiện
 */
function initOrderFilters() {
    // Bật chế độ debug tạm thời
    const tempDebug = true;
    
    if (tempDebug) console.log('Khởi tạo bộ lọc đơn hàng');
    
    // Lấy các phần tử filter form
    const orderFilterForm = document.getElementById('order-filter-form');
    const statusFilter = document.getElementById('status-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const searchFilter = document.getElementById('search-filter');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const sortOrdersBy = document.getElementById('sort-orders-by');
    
    if (!orderFilterForm) {
        console.warn('Không tìm thấy form lọc đơn hàng (order-filter-form)');
        return;
    }
    
    // Kiểm tra các thành phần của form
    if (tempDebug) {
        console.log('Status filter:', statusFilter ? 'Found' : 'Not found');
        console.log('Start date filter:', startDateFilter ? 'Found' : 'Not found');
        console.log('End date filter:', endDateFilter ? 'Found' : 'Not found');
        console.log('Search filter:', searchFilter ? 'Found' : 'Not found');
        console.log('Reset button:', resetFilterBtn ? 'Found' : 'Not found');
        console.log('Sort orders by:', sortOrdersBy ? 'Found' : 'Not found');
    }
    
    // Xử lý sự kiện submit form
    orderFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (tempDebug) {
            console.group('Form filter submit');
            console.log('Status:', statusFilter?.value);
            console.log('Start date:', startDateFilter?.value);
            console.log('End date:', endDateFilter?.value);
            console.log('Search term:', searchFilter?.value);
            console.groupEnd();
        }
        
        // Cập nhật bộ lọc
        orderFilter = {
            ...orderFilter, // Giữ các giá trị sắp xếp
            status: statusFilter?.value || null,
            startDate: startDateFilter?.value || null,
            endDate: endDateFilter?.value || null,
            searchTerm: searchFilter?.value || ''
        };
        
        if (tempDebug) {
            console.log('Updated filter:', orderFilter);
        }
        
        // Tải lại đơn hàng với bộ lọc mới (luôn bắt đầu từ trang 1)
        loadSellerOrders(1);
    });
    
    // Xử lý sự kiện reset bộ lọc
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            if (tempDebug) console.log('Resetting filters');
            
            // Reset các trường input
            if (statusFilter) statusFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (searchFilter) searchFilter.value = '';
            
            // Giữ nguyên cấu hình sắp xếp hiện tại
            const currentSortBy = orderFilter.sortBy || 'orderDate';
            const currentSortDirection = orderFilter.sortDirection || 'desc';
            
            // Reset bộ lọc
            orderFilter = {
                sortBy: currentSortBy,
                sortDirection: currentSortDirection,
                startDate: null,
                endDate: null,
                status: null,
                searchTerm: ''
            };
            
            if (tempDebug) {
                console.log('Reset filter to:', orderFilter);
            }
            
            // Tải lại đơn hàng không có bộ lọc
            loadSellerOrders(1);
        });
    }
    
    // QUAN TRỌNG: Xử lý đúng sắp xếp
    if (sortOrdersBy) {
        if (tempDebug) {
            console.log('Sort select found with value:', sortOrdersBy.value);
            
            // In ra danh sách các option trong select
            const options = Array.from(sortOrdersBy.options);
            console.log('Available sort options:', options.map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }
        
        // Đảm bảo có giá trị mặc định
        if (!sortOrdersBy.value) {
            sortOrdersBy.value = 'orderDate:desc';
        }
        
        sortOrdersBy.addEventListener('change', () => {
            const selectedValue = sortOrdersBy.value;
            
            if (tempDebug) {
                console.log('Sort changed to:', selectedValue);
            }
            
            // Phân tích giá trị được chọn
            if (selectedValue && selectedValue.includes(':')) {
                const [sortBy, sortDirection] = selectedValue.split(':');
                
                // Cập nhật bộ lọc
                orderFilter.sortBy = sortBy;
                orderFilter.sortDirection = sortDirection;
                
                if (tempDebug) {
                    console.log('Updated sort settings:', {
                        sortBy: orderFilter.sortBy,
                        sortDirection: orderFilter.sortDirection
                    });
                }
                
                // Tải lại đơn hàng với cấu hình sắp xếp mới
                loadSellerOrders(orderPagination.currentPage);
            } else {
                console.warn('Invalid sort value:', selectedValue);
            }
        });
    } else {
        console.warn('Sort select element not found (sort-orders-by)');
    }
    
    // Cập nhật số đơn hàng
    updateOrderCountInfo();
    
    // Đảm bảo tự động tải đơn hàng khi khởi tạo
    loadSellerOrders(1);
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
        if (debugMode) console.log(`Đang tải chi tiết đơn hàng ${orderId}`);
        displayToastMessage('Đang tải thông tin đơn hàng...', 'info');
        
        // Mở modal
        const orderDetailModal = document.getElementById('order-detail-modal');
        if (!orderDetailModal) {
            if (debugMode) console.error('Không tìm thấy modal chi tiết đơn hàng');
            displayToastMessage('Không tìm thấy giao diện hiển thị chi tiết đơn hàng', 'error');
            return;
        }
        
        // Cập nhật tiêu đề
        const orderDetailTitle = document.getElementById('order-detail-title');
        if (orderDetailTitle) {
            orderDetailTitle.textContent = `Chi tiết đơn hàng #${orderId}`;
        }
        
        // Hiển thị loading trong modal
        const orderDetailContent = document.getElementById('order-detail-content');
        if (orderDetailContent) {
            orderDetailContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12">
                    <svg class="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-gray-600">Đang tải thông tin đơn hàng...</p>
                </div>
            `;
        }
        
        orderDetailModal.classList.remove('hidden');
        
        // Lấy token
        const token = getTokenFromStorage();
        if (!token) {
            displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            orderDetailModal.classList.add('hidden');
            return;
        }
        
        // Gọi API lấy chi tiết đơn hàng theo OrderId từ OrderController
        const response = await fetch(`${API_BASE}/Orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API trả về mã lỗi: ${response.status} - ${errorText}`);
        }
        
        const order = await response.json();
        
        if (!order) {
            displayToastMessage('Không tìm thấy thông tin đơn hàng', 'error');
            orderDetailModal.classList.add('hidden');
            return;
        }
        
        if (debugMode) console.log('Dữ liệu chi tiết đơn hàng:', order);
        
        // Hiển thị thông tin đơn hàng trong modal
        renderOrderDetail(order);
        
    } catch (error) {
        if (debugMode) console.error('Lỗi khi tải chi tiết đơn hàng:', error);
        displayToastMessage(`Không thể tải chi tiết đơn hàng: ${error.message}`, 'error');
        
        // Đóng modal trong trường hợp lỗi
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
    const orderDetailContent = document.getElementById('order-detail-content');
    
    if (!orderDetailContent) return;
    
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
                return { class: 'bg-yellow-100 text-yellow-800', text: 'Chờ xử lý' };
            case 'processing':
                return { class: 'bg-blue-100 text-blue-800', text: 'Đang xử lý' };
            case 'shipped':
                return { class: 'bg-indigo-100 text-indigo-800', text: 'Đang giao' };
            case 'delivered':
                return { class: 'bg-green-100 text-green-800', text: 'Đã giao' };
            case 'cancelled':
                return { class: 'bg-red-100 text-red-800', text: 'Đã hủy' };
            case 'completed':
                return { class: 'bg-green-100 text-green-800', text: 'Hoàn thành' };
            default:
                return { class: 'bg-gray-100 text-gray-800', text: status || 'Không xác định' };
        }
    };
    
    const statusInfo = getStatusInfo(order.status);
    
    // Xác định các hành động có thể thực hiện dựa trên trạng thái
    const canUpdateStatus = order.status?.toLowerCase() !== 'cancelled' && order.status?.toLowerCase() !== 'completed';
    
    // Tạo dữ liệu sản phẩm
    let orderItemsHtml = '';
    
    // Kiểm tra tất cả các khả năng lưu trữ các item trong đơn hàng
    const items = order.orderItems || order.items || order.orderDetails || [];
    
    if (items && items.length > 0) {
        orderItemsHtml = items.map(item => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0">
                            <img class="h-10 w-10 rounded object-cover" 
                                 src="${item.imageUrl || item.productImageUrl || item.product?.imageUrl || 'https://dummyimage.com/50x50/e0e0e0/000000.png&text=No+Image'}" 
                                 alt="${item.productName || item.product?.name}" 
                                 onerror="this.onerror=null; this.src='https://dummyimage.com/50x50/e0e0e0/000000.png&text=Err';">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${item.productName || item.product?.name}</div>
                            <div class="text-xs text-gray-500">${item.productId ? `ID: ${item.productId}` : ''}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.price || item.unitPrice)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${item.quantity}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency((item.price || item.unitPrice) * item.quantity)}</td>
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
    orderDetailContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin khách hàng</h4>
                <p class="mb-1"><span class="font-medium">Tên khách hàng:</span> ${order.customerName || order.user?.name || order.customer?.name || 'Không có thông tin'}</p>
                <p class="mb-1"><span class="font-medium">Email:</span> ${order.email || order.user?.email || order.customer?.email || 'Không có thông tin'}</p>
                <p class="mb-1"><span class="font-medium">Số điện thoại:</span> ${order.phone || order.phoneNumber || order.user?.phoneNumber || order.customer?.phoneNumber || 'Không có thông tin'}</p>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin đơn hàng</h4>
                <p class="mb-1"><span class="font-medium">Mã đơn hàng:</span> #${order.orderId || order.id}</p>
                <p class="mb-1"><span class="font-medium">Ngày đặt:</span> ${formatDate(order.orderDate || order.createdAt)}</p>
                <p class="mb-1">
                    <span class="font-medium">Trạng thái:</span> 
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">${statusInfo.text}</span>
                </p>
            </div>
        </div>
        
        <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Địa chỉ giao hàng</h4>
            <p>${order.shippingAddress || order.address || order.deliveryAddress || 'Không có thông tin địa chỉ'}</p>
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
                <span>${formatCurrency(order.subtotal || order.subTotal || order.orderSubtotal || 0)}</span>
            </div>
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-500">Phí vận chuyển:</span>
                <span>${formatCurrency(order.shippingFee || order.shippingCost || 0)}</span>
            </div>
            <div class="flex justify-between items-center font-semibold text-lg">
                <span>Tổng thanh toán:</span>
                <span>${formatCurrency(order.totalAmount || order.total || order.orderTotal || 0)}</span>
            </div>
        </div>
        
        ${canUpdateStatus ? `
            <div class="mt-6 pt-4 border-t border-gray-200">
                <div class="flex justify-end space-x-3">
                    <button type="button" onclick="openUpdateStatusModal(${order.orderId || order.id}, '${order.status}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-1"></i> Cập nhật trạng thái
                    </button>
                </div>
            </div>
        ` : ''}
    `;
    
    // Thêm sự kiện đóng modal khi click ngoài nội dung
    const orderDetailModal = document.getElementById('order-detail-modal');
    if (orderDetailModal) {
        const handleClickOutside = (e) => {
            if (e.target === orderDetailModal) {
                closeOrderDetailModal();
                orderDetailModal.removeEventListener('click', handleClickOutside);
            }
        };
        
        orderDetailModal.addEventListener('click', handleClickOutside);
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
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="openUpdateStatusModal(${orderId}, '${status}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-edit mr-1"></i> Cập nhật trạng thái
                        </button>
                    </div>
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
 * Xử lý cập nhật trạng thái đơn hàng
 */
async function handleUpdateOrderStatus() {
    try {
        // Lấy form và các giá trị
        const updateStatusForm = document.getElementById('update-status-form');
        const newStatusSelect = document.getElementById('new-status');
        const statusNote = document.getElementById('status-note');
        
        if (!updateStatusForm || !newStatusSelect) {
            if (debugMode) console.error('Không tìm thấy form hoặc select trạng thái');
            displayToastMessage('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
            return;
        }
        
        // Lấy orderId từ dataset của form
        const orderId = updateStatusForm.dataset.orderId;
        if (!orderId) {
            if (debugMode) console.error('Không tìm thấy orderId trong form');
            displayToastMessage('Không tìm thấy mã đơn hàng cần cập nhật', 'error');
            return;
        }
        
        // Lấy giá trị trạng thái mới
        const newStatus = newStatusSelect.value;
        if (!newStatus) {
            displayToastMessage('Vui lòng chọn trạng thái mới', 'error');
            return;
        }
        
        // Dữ liệu cập nhật theo định dạng OrderStatusUpdateDto
        const updateData = {
            orderStatus: newStatus,
            note: statusNote?.value || ''
        };
        
        // Hiển thị thông báo đang cập nhật
        displayToastMessage('Đang cập nhật trạng thái đơn hàng...', 'info');
        
        // Lấy token
        const token = getTokenFromStorage();
        if (!token) {
            displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            closeUpdateStatusModal();
            return;
        }
        
        try {
            // Gọi API cập nhật trạng thái
            const response = await fetch(`${API_BASE}/Orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            
            // Đóng modal
            closeUpdateStatusModal();
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || `API trả về mã lỗi: ${response.status}`;
                throw new Error(errorMessage);
            }
            
            // Tải lại danh sách đơn hàng
            await loadSellerOrders(orderPagination.currentPage);
            
            // Hiển thị thông báo thành công
            displayToastMessage('Đã cập nhật trạng thái đơn hàng thành công!', 'success');
        } catch (fetchError) {
            if (debugMode) console.error('Lỗi fetch API cập nhật trạng thái:', fetchError);
            throw fetchError;
        }
        
    } catch (error) {
        if (debugMode) console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
        displayToastMessage(`Không thể cập nhật trạng thái: ${error.message}`, 'error');
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