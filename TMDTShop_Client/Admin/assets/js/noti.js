let notifications = [];
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let currentNotification = null;

// Initialize notifications
function initializeNotifications() {
    try {
        const stored = localStorage.getItem('notifications');
        if (!stored) {
            const initialData = [
                {
                    id: 'admin-1',
                    type: 'promotion',
                    title: 'Khuyến mãi tháng 6',
                    message: 'Chi tiết khuyến mãi tháng 6...',
                    isRead: false,
                    created_at: '2025-05-15T10:00:00Z',
                    sent_at: null,
                    scheduled_at: '2025-06-01T00:00:00Z',
                    icon: 'fa-tags',
                    action_text: 'Xem ngay',
                    action_url: '#'
                },
                {
                    id: 'admin-2',
                    type: 'system',
                    title: 'Bảo trì hệ thống',
                    message: 'Hệ thống sẽ bảo trì vào thứ 7.',
                    isRead: false,
                    created_at: '2025-05-14T14:30:00Z',
                    sent_at: '2025-05-14T15:00:00Z',
                    icon: 'fa-cogs'
                },
                {
                    id: 'admin-3',
                    type: 'general',
                    title: 'Chào mừng người dùng mới',
                    message: 'Cảm ơn bạn đã tham gia ShopX!',
                    isRead: false,
                    created_at: '2025-05-13T09:15:00Z',
                    sent_at: '2025-05-13T09:20:00Z',
                    icon: 'fa-handshake'
                }
            ];
            localStorage.setItem('notifications', JSON.stringify(initialData));
            return initialData;
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Lỗi khởi tạo thông báo:', error);
        return [];
    }
}

// Apply filters and fetch notifications
function applyFilters(page = 1) {
    const search = document.getElementById('search').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const sort = document.getElementById('sort').value;
    itemsPerPage = parseInt(document.getElementById('display').value) || 10;

    let filteredNotifications = initializeNotifications();

    // Apply filters
    filteredNotifications = filteredNotifications.filter(notification => {
        const matchesSearch = notification.title.toLowerCase().includes(search);
        const matchesType = !typeFilter || notification.type === typeFilter;
        const createdAt = new Date(notification.created_at);
        const matchesDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
        const matchesDateTo = !dateTo || createdAt <= new Date(dateTo);
        return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    });

    // Apply sorting
    filteredNotifications.sort((a, b) => {
        if (sort === 'title-asc') return a.title.localeCompare(b.title);
        if (sort === 'title-desc') return b.title.localeCompare(a.title);
        if (sort === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'date-desc') return new Date(b.created_at) - new Date(a.created_at);
        return 0; // Default
    });

    notifications = filteredNotifications;
    fetchAdminNotifications(page);
}

// Fetch notifications with pagination
function fetchAdminNotifications(page = 1) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const table = document.getElementById('notification-table');

    loading.style.display = 'flex';
    error.style.display = 'none';
    table.style.display = 'none';

    try {
        currentPage = page;
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginated = notifications.slice(start, end);

        totalPages = Math.ceil(notifications.length / itemsPerPage);

        const tbody = document.getElementById('notification-list');
        tbody.innerHTML = paginated.length === 0
            ? '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Không có thông báo nào.</td></tr>'
            : paginated.map((notification, index) => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${start + index + 1}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${notification.title}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs">${stripHtml(notification.message)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${notification.type}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatTime(notification.created_at)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            notification.sent_at ? 'bg-green-100 text-green-800' :
                            notification.scheduled_at ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }">
                            ${notification.sent_at ? `Đã gửi: ${formatTime(notification.sent_at)}` :
                              notification.scheduled_at ? `Lên lịch: ${formatTime(notification.scheduled_at)}` : 'Bản nháp'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button onclick="openModal('${notification.id}')" class="text-indigo-600 hover:text-indigo-900"><i class="fas fa-edit"></i> Sửa</button>
                        <button onclick="deleteNotification('${notification.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i> Xóa</button>
                        <button onclick="previewNotification('${notification.id}')" class="text-blue-600 hover:text-blue-900"><i class="fas fa-eye"></i> Xem</button>
                    </td>
                </tr>
            `).join('');

        // Update pagination
        const paginationInfo = document.getElementById('pagination-info');
        paginationInfo.textContent = `Hiển thị ${totalPages > 0 ? page : 0} / ${totalPages} trang (Tổng số ${notifications.length} thông báo)`;

        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        const goButton = document.getElementById('go-page');
        const pageInput = document.getElementById('page-input');

        prevButton.disabled = page === 1;
        nextButton.disabled = page === totalPages;
        pageInput.value = page;

        prevButton.onclick = () => page > 1 && fetchAdminNotifications(page - 1);
        nextButton.onclick = () => page < totalPages && fetchAdminNotifications(page + 1);
        goButton.onclick = () => {
            const newPage = parseInt(pageInput.value);
            if (newPage >= 1 && newPage <= totalPages) fetchAdminNotifications(newPage);
        };

        loading.style.display = 'none';
        table.style.display = 'block';
    } catch (err) {
        document.getElementById('error-message').textContent = 'Không thể tải danh sách thông báo. Vui lòng thử lại sau.';
        error.style.display = 'block';
        loading.style.display = 'none';
        console.error('Lỗi tải thông báo:', err);
    }
}

// Open modal for create/edit
function openModal(id) {
    currentNotification = id ? notifications.find(n => n.id === id) : {
        id: null,
        title: '',
        message: '',
        type: 'general',
        icon: 'fa-bell',
        action_text: '',
        action_url: '',
        scheduled_at: '',
        sent_at: null
    };

    const form = document.getElementById('notification-form');
    form.querySelector('#title').value = currentNotification.title;
    form.querySelector('#message').value = currentNotification.message;
    form.querySelector('#type').value = currentNotification.type;
    form.querySelector('#icon').value = currentNotification.icon || '';
    form.querySelector('#action_text').value = currentNotification.action_text || '';
    form.querySelector('#action_url').value = currentNotification.action_url || '';
    form.querySelector('#scheduled_at').value = currentNotification.scheduled_at ?
        new Date(currentNotification.scheduled_at).toISOString().slice(0, 16) : '';

    document.getElementById('modal-title').textContent = id ? 'Sửa thông báo' : 'Tạo thông báo mới';
    document.getElementById('modal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentNotification = null;
}

// Save notification
function saveNotification(event) {
    event.preventDefault();
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    try {
        const form = document.getElementById('notification-form');
        const scheduled_at = form.querySelector('#scheduled_at').value;
        const notification = {
            id: currentNotification?.id || `admin-${Date.now()}`,
            title: form.querySelector('#title').value,
            message: form.querySelector('#message').value,
            type: form.querySelector('#type').value,
            icon: form.querySelector('#icon').value || 'fa-bell',
            action_text: form.querySelector('#action_text').value,
            action_url: form.querySelector('#action_url').value,
            scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
            created_at: currentNotification?.created_at || new Date().toISOString(),
            sent_at: currentNotification?.sent_at || (!scheduled_at ? new Date().toISOString() : null),
            isRead: false
        };

        let stored = JSON.parse(localStorage.getItem('notifications') || '[]');
        stored = currentNotification?.id
            ? stored.map(n => n.id === notification.id ? notification : n)
            : [notification, ...stored];
        localStorage.setItem('notifications', JSON.stringify(stored));
        notifications = stored;

        applyFilters(currentPage);
        closeModal();
    } catch (err) {
        document.getElementById('error-message').textContent = 'Lưu thông báo thất bại. Vui lòng thử lại.';
        document.getElementById('error').style.display = 'block';
        console.error('Lỗi lưu thông báo:', err);
    } finally {
        loading.style.display = 'none';
    }
}

// Delete notification
function deleteNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    try {
        let stored = JSON.parse(localStorage.getItem('notifications') || '[]');
        stored = stored.filter(n => n.id !== id);
        localStorage.setItem('notifications', JSON.stringify(stored));
        notifications = stored;
        applyFilters(currentPage > totalPages ? totalPages : currentPage);
    } catch (err) {
        document.getElementById('error-message').textContent = 'Xóa thông báo thất bại. Vui lòng thử lại.';
        document.getElementById('error').style.display = 'block';
        console.error('Lỗi xóa thông báo:', err);
    } finally {
        loading.style.display = 'none';
    }
}

// Preview notification
function previewNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    document.getElementById('preview-content').innerHTML = `
        ${notification.icon ? `<div class="flex-shrink-0"><i class="fas ${notification.icon} text-blue-600 text-xl mt-1"></i></div>` : ''}
        <div class="flex-1 ${notification.icon ? 'ml-4' : ''}">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">${notification.title}</h3>
                <span class="text-gray-500 text-sm">${formatTime(notification.created_at)}</span>
            </div>
            <p class="text-gray-600 mt-1">${notification.message}</p>
            ${notification.action_text ? `
                <div class="mt-2 flex items-center space-x-4">
                    <a href="${notification.action_url || '#!'}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${notification.action_text}</a>
                </div>` : ''}
        </div>
    `;
    document.getElementById('preview-modal').classList.add('active');
}

// Close preview
function closePreview() {
    document.getElementById('preview-modal').classList.remove('active');
}

// Helper functions
function formatTime(isoString) {
    return isoString ? new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'N/A';
}

function stripHtml(html) {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch (error) {
        console.error('Lỗi xử lý HTML:', error);
        return html;
    }
}

// Load notifications on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        applyFilters(1);
    } catch (error) {
        console.error('Lỗi tải trang:', error);
        document.getElementById('error-message').textContent = 'Không thể tải trang. Vui lòng thử lại.';
        document.getElementById('error').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    }
});