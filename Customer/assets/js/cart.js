// API base URL (replace with your backend URL)
const API_BASE_URL = 'https://your-backend-api.com/api';

// Format currency
function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN') + '₫';
}

// Mock cart data (since no backend is available)
const mockCartData = {
    items: [
        {
            id: 1,
            name: 'Áo thun nam cao cấp',
            image: 'https://images.unsplash.com/photo-1524672353063-4f66ee1f385e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3MzY5OTh8MHwxfHNlYXJjaHw0fHx0LXNoaXJ0JTIwbWVuJTIwZmFzaGlvbnxlbnwwfHx8Ymx1ZXwxNzQ0NzcxMzg1fDA&ixlib=rb-4.0.3&q=85',
            color: 'Xanh dương',
            size: 'L',
            price: 350000,
            quantity: 1
        },
        {
            id: 2,
            name: 'Quần jeans nữ ống suông',
            image: 'https://images.unsplash.com/photo-1524672353063-4f66ee1f385e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3MzY5OTh8MHwxfHNlYXJjaHw2fHxqZWFucyUyMHdvbWVuJTIwZmFzaGlvbnxlbnwwfHx8Ymx1ZXwxNzQ0NzcxMzg1fDA&ixlib=rb-4.0.3&q=85',
            color: 'Xanh đậm',
            size: 'M',
            price: 450000,
            quantity: 2
        },
        {
            id: 3,
            name: 'Giày thể thao nam',
            image: 'https://images.unsplash.com/photo-1555253771-dd02be6c028f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3MzY5OTh8MHwxfHNlYXJjaHwyfHxzbmVha2VycyUyMHNwb3J0JTIwc2hvZXN8ZW58MHx8fHdoaXRlfDE3NDQ3NzEzODV8MA&ixlib=rb-4.0.3&q=85',
            color: 'Trắng',
            size: '42',
            price: 650000,
            quantity: 1
        }
    ],
    subtotal: 350000 + (450000 * 2) + 650000, // 1.900.000₫
    discount: 50000, // 50.000₫
    shipping: 30000, // 30.000₫
    total: (350000 + (450000 * 2) + 650000) - 50000 + 30000 // 1.930.000₫
};

// Mock order history data (since no backend is available)
const mockOrderHistory = [
    {
        orderId: '001',
        date: '20/04/2025',
        items: [{ name: 'Áo thun nam', price: 350000 }],
        status: 'Đã giao'
    },
    {
        orderId: '002',
        date: '21/04/2025',
        items: [{ name: 'Quần jeans nữ', price: 450000 }],
        status: 'Đang xử lý'
    }
];

// Mock notification data (since no backend is available)
const mockNotifications = [
    {
        id: 1,
        message: 'Đơn hàng #001 của bạn đã được giao thành công!',
        date: '20/04/2025 14:30',
        read: false
    },
    {
        id: 2,
        message: 'Khuyến mãi mới: Giảm 20% cho tất cả sản phẩm!',
        date: '21/04/2025 09:00',
        read: true
    },
    {
        id: 3,
        message: 'Đơn hàng #002 đang được xử lý.',
        date: '21/04/2025 10:15',
        read: false
    }
];

// Load cart data
async function loadCart() {
    try {
        // Uncomment the following lines when backend is available
        // const response = await axios.get(`${API_BASE_URL}/cart`);
        // const cart = response.data;

        // Use mock data for now
        const cart = mockCartData;

        // Update cart count
        const cartCount = cart.items.length;
        document.getElementById('cart-count').textContent = cartCount;
        document.getElementById('mobile-cart-count').textContent = cartCount;
        document.getElementById('cart-items-count').textContent = cartCount;
        document.getElementById('summary-items-count').textContent = cartCount;
        document.getElementById('cart-title').textContent = `Giỏ hàng (${cartCount})`;

        // Update cart items in main content
        const cartItemsList = document.getElementById('cart-items-list');
        cartItemsList.innerHTML = '';
        cart.items.forEach(item => {
            const itemElement = `
                <div class="flex items-start border-b pb-6">
                    <div class="flex items-center mr-4">
                        <input type="checkbox" class="h-5 w-5 text-primary rounded mr-4" data-id="${item.id}">
                        <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded" loading="lazy">
                    </div>
                    <div class="flex-grow">
                        <div class="flex justify-between">
                            <div>
                                <h3 class="text-lg font-medium text-dark">${item.name}</h3>
                                <p class="text-gray-500 text-sm">Màu: ${item.color} | Size: ${item.size}</p>
                            </div>
                            <div class="text-lg font-bold text-primary">${formatCurrency(item.price)}</div>
                        </div>
                        <div class="flex justify-between items-center mt-4">
                            <div class="flex items-center border rounded-lg">
                                <button class="px-3 py-1 text-gray-600 hover:bg-gray-100 decrease-quantity" data-id="${item.id}">-</button>
                                <span class="px-3 py-1">${item.quantity}</span>
                                <button class="px-3 py-1 text-gray-600 hover:bg-gray-100 increase-quantity" data-id="${item.id}">+</button>
                            </div>
                            <button class="text-red-500 hover:text-red-700 remove-item" data-id="${item.id}">
                                <i class="fas fa-trash-alt"></i> Xóa
                            </button>
                        </div>
                    </div>
                </div>`;
            cartItemsList.innerHTML += itemElement;
        });

        // Update cart dropdown in header
        const cartDropdownItems = document.getElementById('cart-items');
        cartDropdownItems.innerHTML = '';
        cart.items.forEach(item => {
            const dropdownItem = `
                <div class="flex items-start space-x-3">
                    <img src="${item.image}" class="w-16 h-16 object-cover rounded" loading="lazy" />
                    <div class="flex-1">
                        <h4 class="font-medium">${item.name}</h4>
                        <p class="text-sm text-gray-500">${item.quantity} x ${formatCurrency(item.price)}</p>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 remove-item" data-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
            cartDropdownItems.innerHTML += dropdownItem;
        });

        // Update summary
        document.getElementById('subtotal').textContent = formatCurrency(cart.subtotal);
        document.getElementById('discount').textContent = formatCurrency(cart.discount);
        document.getElementById('shipping').textContent = formatCurrency(cart.shipping);
        document.getElementById('total').textContent = formatCurrency(cart.total);
        document.getElementById('cart-total').textContent = formatCurrency(cart.total);
    } catch (error) {
        console.error('Error loading cart:', error);
        alert('Không thể tải giỏ hàng. Vui lòng thử lại sau.');
    }
}

// Load notifications
async function loadNotifications() {
    try {
        // Uncomment the following lines when backend is available
        // const response = await axios.get(`${API_BASE_URL}/notifications`);
        // const notifications = response.data;

        // Use mock data for now
        const notifications = mockNotifications;

        // Update notification count
        const notificationCount = notifications.length;
        document.getElementById('wishlist-count').textContent = notificationCount;
        document.querySelector('#notificationButton h3').textContent = `Thông báo (${notificationCount})`;

        // Update notification dropdown
        const notificationItems = document.getElementById('notification-items');
        notificationItems.innerHTML = '';
        notifications.forEach(notification => {
            const notificationElement = `
                <div class="flex items-start space-x-3 ${notification.read ? 'opacity-50' : ''}">
                    <div class="flex-1">
                        <p class="text-sm font-medium">${notification.message}</p>
                        <p class="text-xs text-gray-500">${notification.date}</p>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 mark-as-read" data-id="${notification.id}">
                        <i class="fas ${notification.read ? 'fa-check' : 'fa-times'}"></i>
                    </button>
                </div>`;
            notificationItems.innerHTML += notificationElement;
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
        alert('Không thể tải thông báo. Vui lòng thử lại sau.');
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const response = await axios.patch(`${API_BASE_URL}/notifications/mark-read`, { notificationId });
        if (response.data.success) {
            loadNotifications(); // Reload notifications after marking as read
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        alert('Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại.');
    }
}

// Load order history
async function loadOrderHistory() {
    try {
        // Uncomment the following lines when backend is available
        // const response = await axios.get(`${API_BASE_URL}/orders`);
        // const orders = response.data;

        // Use mock data for now
        const orders = mockOrderHistory;

        const orderHistory = document.getElementById('order-history');
        orderHistory.innerHTML = '';
        orders.forEach(order => {
            const orderElement = `
                <div class="border-b pb-4">
                    <div class="flex justify-between items-center mb-2">
                        <p class="font-medium text-lg">Đơn hàng #${order.orderId} - ${order.date}</p>
                        <p class="text-sm text-gray-500">Trạng thái: <span class="${order.status === 'Đã giao' ? 'text-green-600' : 'text-yellow-600'}">${order.status}</span></p>
                    </div>
                    ${order.items.map(item => `
                        <div class="flex justify-between text-sm text-gray-600">
                            <span>${item.name}</span>
                            <span>${formatCurrency(item.price)}</span>
                        </div>
                    `).join('')}
                </div>`;
            orderHistory.innerHTML += orderElement;
        });
    } catch (error) {
        console.error('Error loading order history:', error);
        alert('Không thể tải lịch sử mua hàng. Vui lòng thử lại sau.');
    }
}

// Update quantity
async function updateQuantity(itemId, change) {
    try {
        const response = await axios.patch(`${API_BASE_URL}/cart/update`, { itemId, change });
        if (response.data.success) {
            loadCart(); // Reload cart after update
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Không thể cập nhật số lượng. Vui lòng thử lại.');
    }
}

// Remove item
async function removeItem(itemId) {
    try {
        const response = await axios.delete(`${API_BASE_URL}/cart/remove`, { data: { itemId } });
        if (response.data.success) {
            loadCart(); // Reload cart after removal
        }
    } catch (error) {
        console.error('Error removing item:', error);
        alert('Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
}

// Delete selected items
async function deleteSelected() {
    const selectedItems = Array.from(document.querySelectorAll('input[type="checkbox"]:checked:not(#selectAll)'))
        .map(checkbox => checkbox.getAttribute('data-id'));
    if (selectedItems.length === 0) {
        alert('Vui lòng chọn ít nhất một sản phẩm để xóa.');
        return;
    }
    try {
        const response = await axios.delete(`${API_BASE_URL}/cart/remove`, { data: { itemIds: selectedItems } });
        if (response.data.success) {
            loadCart(); // Reload cart after deletion
        }
    } catch (error) {
        console.error('Error deleting selected items:', error);
        alert('Không thể xóa sản phẩm đã chọn. Vui lòng thử lại.');
    }
}

// Checkout
async function checkout(selectedOnly = false) {
    let itemsToCheckout;
    if (selectedOnly) {
        itemsToCheckout = Array.from(document.querySelectorAll('input[type="checkbox"]:checked:not(#selectAll)'))
            .map(checkbox => checkbox.getAttribute('data-id'));
        if (itemsToCheckout.length === 0) {
            alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
            return;
        }
    }
    try {
        const response = await axios.post(`${API_BASE_URL}/checkout`, { selectedItems: selectedOnly ? itemsToCheckout : null });
        if (response.data.success) {
            window.location.href = '/checkout-success'; // Redirect to success page
        }
    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Không thể thực hiện thanh toán. Vui lòng thử lại.');
    }
}

// Check login status
async function checkLoginStatus() {
    try {
        const response = await axios.get(`${API_BASE_URL}/user`);
        const userMenu = document.getElementById('userMenu');
        userMenu.__x.$data.isLoggedIn = response.data.isLoggedIn;
    } catch (error) {
        console.error('Error checking login status:', error);
        alert('Không thể kiểm tra trạng thái đăng nhập. Vui lòng thử lại sau.');
    }
}

// Logout
async function logout() {
    try {
        const response = await axios.post(`${API_BASE_URL}/logout`);
        if (response.data.success) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Không thể đăng xuất. Vui lòng thử lại.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    loadOrderHistory();
    loadNotifications();
    checkLoginStatus();

    // Quantity adjustment and item removal
    document.getElementById('cart-items-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('increase-quantity')) {
            const itemId = e.target.getAttribute('data-id');
            updateQuantity(itemId, 1);
        } else if (e.target.classList.contains('decrease-quantity')) {
            const itemId = e.target.getAttribute('data-id');
            updateQuantity(itemId, -1);
        } else if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const itemId = e.target.getAttribute('data-id') || e.target.closest('.remove-item').getAttribute('data-id');
            removeItem(itemId);
        }
    });

    // Notification actions
    document.getElementById('notification-items').addEventListener('click', (e) => {
        if (e.target.classList.contains('mark-as-read') || e.target.closest('.mark-as-read')) {
            const notificationId = e.target.getAttribute('data-id') || e.target.closest('.mark-as-read').getAttribute('data-id');
            markNotificationAsRead(notificationId);
        }
    });

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // Delete selected items
    document.getElementById('delete-selected').addEventListener('click', deleteSelected);

    // Checkout buttons
    document.getElementById('checkout-selected').addEventListener('click', () => checkout(true));
    document.getElementById('checkout-all').addEventListener('click', () => checkout(false));
});