// Toggle sidebar
document.getElementById('toggleSidebar').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');

    if (sidebar.classList.contains('collapsed')) {
      this.innerHTML = '<i class="fas fa-chevron-right"></i><span class="sidebar-text">Mở rộng</span>';
    } else {
      this.innerHTML = '<i class="fas fa-chevron-left"></i><span class="sidebar-text">Thu gọn</span>';
    }
  });

  // Mobile menu toggle
  document.getElementById('mobileMenuButton').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
  });

  // Section navigation
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');
  const pageTitle = document.getElementById('pageTitle');

  navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const sectionId = this.getAttribute('data-section');
      const sectionTitle = this.querySelector('.sidebar-text').textContent;

      // Remove active class from all nav items and sections
      navItems.forEach(nav => nav.classList.remove('bg-blue-50', 'text-blue-600'));
      sections.forEach(section => section.classList.remove('active'));

      // Add active class to current nav item and section
      this.classList.add('bg-blue-50', 'text-blue-600');
      document.getElementById(`${sectionId}-section`).classList.add('active');

      // Update page title
      pageTitle.textContent = sectionTitle;

      // Load categories if navigating to categories section
      if (sectionId === 'categories') {
        loadCategories();
      }
    });
  });

  // API base URL (Thay thế bằng URL thực tế của backend)
  const API_BASE = 'https://localhost:5191/api';

  // Load categories
  async function loadCategories() {
    try {
      const token = getCookie('token');
      console.log('Token:', token);
      if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục.');
        window.location.href = 'login.html'; // Chuyển hướng đến trang đăng nhập
        return;
      }
  
      const response = await fetch(`${API_BASE}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.status === 401) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = 'login.html';
        return;
      }
  
      if (response.status === 403) {
        alert('Bạn không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản người bán.');
        window.location.href = 'login.html';
        return;
      }
  
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Lỗi không xác định');
        } else {
          throw new Error('Phản hồi từ server không phải JSON');
        }
      }
  
      const categories = await response.json();
      renderCategories(categories);
    } catch (error) {
      console.error('Lỗi khi lấy danh mục:', error);
      alert('Không thể tải danh sách danh mục: ' + error.message);
    }
  }

  // Render categories to table
  function renderCategories(categories) {
    const tbody = document.getElementById('category-table-body');
    tbody.innerHTML = '';
    categories.forEach(category => {
      const row = document.createElement('tr');
      row.classList.add('table-row');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${category.CategoryName}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.Description || 'Không có mô tả'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button onclick="editCategory(${category.CategoryID}, '${category.CategoryName}', '${category.Description || ''}')" class="text-blue-600 hover:text-blue-900 action-btn mr-2">
            <i class="fas fa-edit mr-1"></i>Sửa
          </button>
          <button onclick="deleteCategory(${category.CategoryID})" class="text-red-600 hover:text-red-900 action-btn">
            <i class="fas fa-trash-alt mr-1"></i>Xóa
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Add/Edit Category Modal
  const modal = document.getElementById('category-modal');
  const modalTitle = document.getElementById('modal-title');
  const categoryForm = document.getElementById('category-form');
  const addCategoryBtn = document.getElementById('add-category-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  let editingCategoryId = null;

  addCategoryBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Thêm danh mục mới';
    editingCategoryId = null;
    categoryForm.reset();
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('category-name').value;
    const description = document.getElementById('category-description').value;

    if (editingCategoryId) {
      await updateCategory(editingCategoryId, name, description);
    } else {
      await addCategory(name, description);
    }
    modal.classList.add('hidden');
  });

  // Add category
  async function addCategory(name, description) {
    try {
      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ CategoryName: name, Description: description })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      alert('Thêm danh mục thành công!');
      loadCategories();
    } catch (error) {
      console.error('Lỗi khi thêm danh mục:', error);
      alert(`Lỗi: ${error.message}`);
    }
  }

  // Edit category
  window.editCategory = async (id, name, description) => {
    modalTitle.textContent = 'Sửa danh mục';
    editingCategoryId = id;
    document.getElementById('category-name').value = name;
    document.getElementById('category-description').value = description;
    modal.classList.remove('hidden');
  };

  // Update category
  async function updateCategory(id, name, description) {
    try {
      const response = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ CategoryName: name, Description: description })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      alert('Cập nhật danh mục thành công!');
      loadCategories();
    } catch (error) {
      console.error('Lỗi khi sửa danh mục:', error);
      alert(`Lỗi: ${error.message}`);
    }
  }

  // Delete category
  window.deleteCategory = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
      try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getCookie('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message);
        }
        alert('Xóa danh mục thành công!');
        loadCategories();
      } catch (error) {
        console.error('Lỗi khi xóa danh mục:', error);
        alert(`Lỗi: ${error.message}`);
      }
    }
  };

  // Get cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }