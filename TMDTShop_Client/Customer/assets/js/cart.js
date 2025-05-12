import { api, sessionManager, localCart, ui } from './api.js';

const API_BASE_URL = 'https://localhost:7088/api/Users';

// Hàm tiện ích cho cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999; path=/';
}

// Format currency
function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN') + '₫';
}

// Kiểm tra token hợp lệ
async function isTokenValid(token) {
    if (!token) return false;
    try {
        const response = await fetch('https://localhost:7088/api/Auth/check-auth', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.status === 401) return false;
        if (!response.ok) return false;
        const data = await response.json();
        return data.isAuthenticated;
    } catch (error) {
        return false;
    }
}

// Lấy giỏ hàng
async function loadCart() {
    const token = sessionStorage.getItem('token');
    let cart;
    if (token) {
        try {
            showSpinner();
            const response = await fetch('https://localhost:7088/api/Cart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải giỏ hàng');
            cart = await response.json();
        } catch (e) {
            showToast('Không thể tải giỏ hàng', 'error');
            cart = { CartItems: [], TotalPrice: 0 };
        } finally {
            hideSpinner();
        }
    } else {
        cart = JSON.parse(localStorage.getItem('cart')) || { CartItems: [], TotalPrice: 0 };
    }
    updateCartUI(cart);
}

// Update cart UI
function updateCartUI(cart) {
    const cartCount = cart.CartItems.length;
    document.getElementById('cart-count').textContent = cartCount;
    document.getElementById('mobile-cart-count').textContent = cartCount;
    document.getElementById('cart-items-count').textContent = cartCount;
    document.getElementById('summary-items-count').textContent = cartCount;
    document.getElementById('cart-title').textContent = `Giỏ hàng (${cartCount})`;

    // Update cart items list
    const cartItemsList = document.getElementById('cart-items-list');
    cartItemsList.innerHTML = '';
    cart.CartItems.forEach(item => {
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
                            <p class="text-gray-500 text-sm">Màu: ${item.color || 'N/A'} | Size: ${item.size || 'N/A'}</p>
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

    // Update summary
    document.getElementById('subtotal').textContent = formatCurrency(cart.TotalPrice);
    document.getElementById('discount').textContent = formatCurrency(cart.Discount || 0);
    document.getElementById('shipping').textContent = formatCurrency(cart.Shipping || 0);
    document.getElementById('total').textContent = formatCurrency(cart.TotalPrice);
    document.getElementById('cart-total').textContent = formatCurrency(cart.TotalPrice);
}

// Load notifications
async function loadNotifications() {
    try {
        const notifications = mockNotifications;
        const notificationCount = notifications.length;
        document.getElementById('wishlist-count').textContent = notificationCount;
        document.querySelector('#notificationButton h3').textContent = `Thông báo (${notificationCount})`;

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
            loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        alert('Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại.');
    }
}

// Load order history
async function loadOrderHistory() {
    const token = sessionStorage.getItem('token');
    if (!token || !(await isTokenValid(token))) {
        document.getElementById('order-history').innerHTML = `
            <div class="text-center text-gray-500">
                Vui lòng đăng nhập để xem lịch sử mua hàng
            </div>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải lịch sử mua hàng');
        }

        const orders = await response.json();
        const orderHistory = document.getElementById('order-history');
        orderHistory.innerHTML = '';
        
        if (orders.length === 0) {
            orderHistory.innerHTML = `
                <div class="text-center text-gray-500">
                    Bạn chưa có đơn hàng nào
                </div>`;
            return;
        }

        orders.forEach(order => {
            const orderElement = `
                <div class="border-b pb-4">
                    <div class="flex justify-between items-center mb-2">
                        <p class="font-medium text-lg">Đơn hàng #${order.id} - ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                        <p class="text-sm text-gray-500">Trạng thái: <span class="${order.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}">${order.status}</span></p>
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

// Cập nhật số lượng sản phẩm
async function updateQuantity(cartItemId, newQuantity) {
    const token = sessionStorage.getItem('token');
    if (token) {
        try {
            showSpinner();
            const response = await fetch(`https://localhost:7088/api/Cart/items/${cartItemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: newQuantity })
            });
            if (!response.ok) throw new Error('Không thể cập nhật số lượng');
            showToast('Đã cập nhật số lượng');
            loadCart();
        } catch (e) {
            showToast('Lỗi cập nhật số lượng', 'error');
        } finally {
            hideSpinner();
        }
    } else {
        // Guest: cập nhật localStorage
        let cart = JSON.parse(localStorage.getItem('cart')) || { CartItems: [], TotalPrice: 0 };
        const item = cart.CartItems.find(i => i.id === cartItemId);
        if (item) {
            item.quantity = Math.max(1, newQuantity);
            cart.TotalPrice = cart.CartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        updateCartUI(cart);
    }
}

// Xóa sản phẩm khỏi giỏ hàng
async function removeItem(cartItemId) {
    const token = sessionStorage.getItem('token');
    if (token) {
        try {
            showSpinner();
            const response = await fetch(`https://localhost:7088/api/Cart/items/${cartItemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể xóa sản phẩm');
            showToast('Đã xóa sản phẩm');
            loadCart();
        } catch (e) {
            showToast('Lỗi xóa sản phẩm', 'error');
        } finally {
            hideSpinner();
        }
    } else {
        // Guest: xóa localStorage
        let cart = JSON.parse(localStorage.getItem('cart')) || { CartItems: [], TotalPrice: 0 };
        cart.CartItems = cart.CartItems.filter(item => item.id !== cartItemId);
        cart.TotalPrice = cart.CartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI(cart);
    }
}

// Xóa toàn bộ giỏ hàng
async function clearCart() {
    const token = sessionStorage.getItem('token');
    if (token) {
        try {
            showSpinner();
            const response = await fetch('https://localhost:7088/api/Cart/clear', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể xóa giỏ hàng');
            showToast('Đã xóa toàn bộ giỏ hàng');
            loadCart();
        } catch (e) {
            showToast('Lỗi xóa giỏ hàng', 'error');
        } finally {
            hideSpinner();
        }
    } else {
        // Guest: xóa localStorage
        localStorage.removeItem('cart');
        updateCartUI({ CartItems: [], TotalPrice: 0 });
    }
}

// Checkout
async function checkout(selectedOnly = false) {
    const token = sessionStorage.getItem('token');
    if (!token || !(await isTokenValid(token))) {
        alert('Vui lòng đăng nhập để thanh toán');
        window.location.href = 'login.html';
        return;
    }

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
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                items: selectedOnly ? itemsToCheckout : null 
            })
        });

        if (!response.ok) {
            throw new Error('Không thể thực hiện thanh toán');
        }

        const order = await response.json();
        alert('Đặt hàng thành công!');
        window.location.href = `order-success.html?orderId=${order.id}`;
    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Không thể thực hiện thanh toán. Vui lòng thử lại.');
    }
}

// Check login status
async function checkLoginStatus() {
    const token = getCookie('token');
    const isLoggedIn = getCookie('isLoggedIn');
    const userMenu = document.getElementById('userMenu');

    if (!token || isLoggedIn !== 'true') {
        console.warn('No valid token or login status found.');
        if (userMenu && userMenu.__x && userMenu.__x.$data) {
            userMenu.__x.$data.isLoggedIn = false;
        }
        alert('Vui lòng đăng nhập để tiếp tục.');
        window.location.href = 'login.html';
        return false;
    }

    if (userMenu && userMenu.__x && userMenu.__x.$data) {
        userMenu.__x.$data.isLoggedIn = true;
    }
    return true;
}
// Logout
async function logout() {
    try {
        const response = await axios.post(`${API_BASE_URL}/logout`);
        if (response.data.success) {
            deleteCookie('token');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Không thể đăng xuất. Vui lòng thử lại.');
    }
}

// Spinner
function showSpinner() {
  document.getElementById('loading-spinner').classList.remove('hidden');
}
function hideSpinner() {
  document.getElementById('loading-spinner').classList.add('hidden');
}

// Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 px-4 py-2 rounded shadow-lg z-50 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Modal
function showModal(message, onConfirm) {
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-confirm').classList.remove('hidden');
  const okBtn = document.getElementById('modal-ok');
  const cancelBtn = document.getElementById('modal-cancel');
  function cleanup() {
    document.getElementById('modal-confirm').classList.add('hidden');
    okBtn.removeEventListener('click', okHandler);
    cancelBtn.removeEventListener('click', cancelHandler);
  }
  function okHandler() {
    cleanup();
    if (typeof onConfirm === 'function') onConfirm();
  }
  function cancelHandler() {
    cleanup();
  }
  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', cancelHandler);
}

// Sửa event xóa sản phẩm để xác nhận bằng modal
function removeItemWithConfirm(itemId) {
  showModal('Bạn có chắc chắn muốn xóa sản phẩm này?', () => {
    removeItem(itemId);
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    loadOrderHistory();
    loadNotifications();
    checkLoginStatus();
    

    document.getElementById('cart-items-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('increase-quantity')) {
            const itemId = e.target.getAttribute('data-id');
            updateQuantity(itemId, 1);
        } else if (e.target.classList.contains('decrease-quantity')) {
            const itemId = e.target.getAttribute('data-id');
            updateQuantity(itemId, -1);
        } else if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const itemId = e.target.getAttribute('data-id') || e.target.closest('.remove-item').getAttribute('data-id');
            removeItemWithConfirm(itemId);
        }
    });

    document.getElementById('notification-items').addEventListener('click', (e) => {
        if (e.target.classList.contains('mark-as-read') || e.target.closest('.mark-as-read')) {
            const notificationId = e.target.getAttribute('data-id') || e.target.closest('.mark-as-read').getAttribute('data-id');
            markNotificationAsRead(notificationId);
        }
    });

    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    document.getElementById('delete-selected').addEventListener('click', deleteSelected);
    document.getElementById('checkout-selected').addEventListener('click', () => checkout(true));
    document.getElementById('checkout-all').addEventListener('click', () => checkout(false));
});