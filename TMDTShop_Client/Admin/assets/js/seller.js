// API base URL
const API_BASE = 'https://localhost:7088/api';

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

  // Load categories
  async function loadCategories() {
    try {
        console.log('Calling API:', `${API_BASE}/categories`); // Debug log
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status); // Debug log

        if (!response.ok) {
            if (response.status === 401) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = '../../Customer/Templates/login.html';
                return;
            }
            
            const errorText = await response.text(); // Get raw response text
            console.log('Error response:', errorText); // Debug log
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || 'Lỗi không xác định');
            } catch (e) {
                throw new Error(`Lỗi server: ${errorText}`);
            }
        }

        const responseText = await response.text(); // Get raw response text
        console.log('Response text:', responseText); // Debug log

        try {
            const categories = JSON.parse(responseText);
            if (!Array.isArray(categories)) {
                throw new Error('Dữ liệu không hợp lệ');
            }
            renderCategories(categories);
        } catch (e) {
            console.error('Lỗi parse JSON:', e);
            throw new Error('Dữ liệu từ server không hợp lệ');
        }
    } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
        alert('Không thể tải danh sách danh mục: ' + error.message);
    }
  }

  // Render categories to table
  function renderCategories(categories) {
    const tbody = document.getElementById('category-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (categories.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="3" class="px-6 py-4 text-center text-gray-500">
                Chưa có danh mục nào
            </td>
        `;
        tbody.appendChild(row);
        // Xóa bảng sản phẩm nếu không còn danh mục
        document.getElementById('product-table-body').innerHTML = '';
        return;
    }

    categories.forEach(category => {
        const row = document.createElement('tr');
        row.classList.add('hover:bg-gray-50');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${category.categoryName || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.description || 'Không có mô tả'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editCategory(${category.categoryID}, '${category.categoryName || ''}', '${category.description || ''}')" 
                        class="text-blue-600 hover:text-blue-900 action-btn mr-2">
                    <i class="fas fa-edit mr-1"></i>Sửa
                </button>
                <button onclick="deleteCategory(${category.categoryID})" 
                        class="text-red-600 hover:text-red-900 action-btn">
                    <i class="fas fa-trash-alt mr-1"></i>Xóa
                </button>
            </td>
        `;
        // Thêm sự kiện click để filter sản phẩm theo danh mục
        row.addEventListener('click', function(e) {
            // Đừng trigger khi click vào nút Sửa/Xóa
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            loadProductsByCategory(category.categoryID);
        });
        tbody.appendChild(row);
    });
  }

  // Đảm bảo có div filter phía trên bảng sản phẩm
  function ensureCategoryFilterDiv() {
    let filterDiv = document.getElementById('category-filter');
    if (!filterDiv) {
        filterDiv = document.createElement('div');
        filterDiv.id = 'category-filter';
        filterDiv.style.marginBottom = '16px';
        const productsSection = document.getElementById('products-section');
        productsSection.prepend(filterDiv);
    }
    return filterDiv;
  }

  // Khi vào mục Sản phẩm, load danh mục và render filter
  const productsNav = document.querySelector('[data-section="products"]');
  if (productsNav) {
    productsNav.addEventListener('click', () => {
        loadCategoriesForProductFilter();
        // Không gọi loadProducts() ở đây, chỉ hiện khi chọn danh mục
    });
  }

  async function loadCategoriesForProductFilter() {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: {
                'Authorization': `Bearer ${getCookie('token')}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Không thể tải danh mục');
        const categories = await response.json();
        renderCategoryFilter(categories);
    } catch (error) {
        alert(error.message);
    }
  }

  function renderCategoryFilter(categories) {
    const filterDiv = ensureCategoryFilterDiv();
    filterDiv.innerHTML = categories.map(cat =>
        `<button class="category-filter-btn" data-id="${cat.categoryID}" style="margin-right:8px">${cat.categoryName}</button>`
    ).join(' ');
    filterDiv.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadProductsByCategory(this.getAttribute('data-id'), 1); // Trang đầu tiên
        });
    });
  }

  // Hàm load sản phẩm theo danh mục và phân trang
  async function loadProductsByCategory(categoryId, page = 1, pageSize = 10) {
    try {
        const response = await fetch(`${API_BASE}/products?categoryId=${categoryId}&page=${page}&pageSize=${pageSize}`, {
            headers: {
                'Authorization': `Bearer ${getCookie('token')}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Không thể tải sản phẩm');
        const result = await response.json();
        renderProducts(result.products);
        renderPagination(result.totalPages, page, categoryId);
    } catch (error) {
        alert(error.message);
    }
  }

  function renderPagination(totalPages, currentPage, categoryId) {
    let paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'pagination';
        document.getElementById('products-section').appendChild(paginationDiv);
    }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn" data-page="${i}" style="margin:2px;${i===currentPage?'font-weight:bold;':''}">${i}</button>`;
    }
    paginationDiv.innerHTML = html;
    paginationDiv.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadProductsByCategory(categoryId, parseInt(this.getAttribute('data-page')));
        });
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

  // Handle category form submission
  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('category-name');
    const descriptionInput = document.getElementById('category-description');
    
    const name = nameInput.value;
    const description = descriptionInput.value;
    
    console.log('Form inputs:', {
      nameValue: name,
      descriptionValue: description
    });
    
    if (!name || name.trim() === '') {
      alert('Vui lòng nhập tên danh mục');
      nameInput.focus();
      return;
    }

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, name, description);
      } else {
        await addCategory(name, description);
      }
      modal.classList.add('hidden');
      categoryForm.reset();
      await loadCategories(); // Reload categories after successful submission
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.message);
    }
  });

  // Get cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Check if token exists and redirect if not
  function checkAuth() {
    const token = getCookie('token');
    if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục');
        window.location.href = '../../Customer/Templates/login.html';
        return false;
    }
    return true;
  }

  // Update category
  async function updateCategory(id, name, description) {
    try {
        if (!checkAuth()) return;

        const token = getCookie('token');
        console.log('Token:', token ? 'Exists' : 'Missing'); // Debug log

        // Tạo payload JSON thay vì FormData
        const payload = {
            categoryName: name,
            description: description
        };

        console.log('Sending update request:', payload); // Debug log

        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status); // Debug log

        if (response.status === 401) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '../../Customer/Templates/login.html';
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || 'Lỗi khi cập nhật danh mục');
            } catch (e) {
                throw new Error(`Lỗi server: ${errorText || 'Không có phản hồi từ server'}`);
            }
        }

        const result = await response.json();
        console.log('Update successful:', result); // Debug log
        
        alert(result.message || 'Cập nhật danh mục thành công!');
        await loadCategories(); // Reload the categories list
        modal.classList.add('hidden'); // Đóng modal sau khi cập nhật thành công
    } catch (error) {
        console.error('Lỗi khi sửa danh mục:', error);
        alert('Lỗi: ' + error.message);
    }
  }

  // Add category
  async function addCategory(name, description) {
    try {
        if (!checkAuth()) return;

        // Validate input
        if (!name || name.trim() === '') {
            throw new Error('Tên danh mục không được để trống');
        }

        const token = getCookie('token');
        
        const formData = new FormData();
        formData.append('CategoryName', name.trim());
        formData.append('Description', description ? description.trim() : '');

        console.log('Sending data:', formData);

        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (response.status === 401) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '../../Customer/Templates/login.html';
            return;
        }

        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.errors && errorData.errors.CategoryName) {
                    throw new Error(errorData.errors.CategoryName[0]);
                }
                throw new Error(errorData.title || 'Lỗi khi thêm danh mục');
            } catch (e) {
                if (e instanceof SyntaxError) {
                    throw new Error(responseText || 'Lỗi không xác định từ server');
                }
                throw e;
            }
        }

        try {
            const result = JSON.parse(responseText);
            console.log('Add successful:', result);
            return result;
        } catch (e) {
            console.error('Error parsing success response:', e);
            return { message: 'Thêm danh mục thành công' };
        }
    } catch (error) {
        console.error('Lỗi khi thêm danh mục:', error);
        throw error;
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

  // Delete category
  window.deleteCategory = async (id) => {
    if (!checkAuth()) return;
    
    if (confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
        try {
            const token = getCookie('token');
            
            const response = await fetch(`${API_BASE}/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                  window.location.href = '../../Customer/Templates/login.html';
                  return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || 'Lỗi khi xóa danh mục');
                } catch (e) {
                    throw new Error(`Lỗi server: ${errorText || 'Không có phản hồi từ server'}`);
                }
            }

            alert('Xóa danh mục thành công!');
            await loadCategories();
        } catch (error) {
            console.error('Lỗi khi xóa danh mục:', error);
            alert('Lỗi: ' + error.message);
        }
    }
  };

  // Product Management
  const productModal = document.getElementById('product-modal');
  const productModalTitle = document.getElementById('product-modal-title');
  const productForm = document.getElementById('product-form');
  const addProductBtn = document.getElementById('add-product-btn');
  const productCancelBtn = document.getElementById('product-cancel-btn');
  let editingProductId = null;

  // Load products when navigating to products section
  document.querySelector('[data-section="products"]').addEventListener('click', () => {
    loadProducts();
  });

  // Add product button click
  addProductBtn.addEventListener('click', () => {
    productModalTitle.textContent = 'Thêm sản phẩm mới';
    editingProductId = null;
    productForm.reset();
    document.getElementById('image-preview').innerHTML = '';
    productModal.classList.remove('hidden');
  });

  // Cancel product modal
  productCancelBtn.addEventListener('click', () => {
    productModal.classList.add('hidden');
  });

  // Handle image preview
  document.getElementById('product-images').addEventListener('change', function(e) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'w-full h-24 object-cover rounded';
        preview.appendChild(img);
      }
      reader.readAsDataURL(file);
    });
  });

  // Load products
  async function loadProducts() {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const result = await response.json();
      if (!result.products) {
        throw new Error('Invalid response format from server');
      }
      renderProducts(result.products);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Không thể tải danh sách sản phẩm: ' + error.message);
    }
  }

  // Render products to table
  function renderProducts(products) {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!Array.isArray(products) || products.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="7" class="px-6 py-4 text-center text-gray-500">
          Chưa có sản phẩm nào
        </td>
      `;
      tbody.appendChild(row);
      return;
    }
    
    products.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <img src="${product.imageURL || '../assets/images/default-product.png'}" 
               class="w-12 h-12 rounded object-cover">
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          ${product.productName}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${product.categoryName || 'Chưa phân loại'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatCurrency(product.price)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${product.stockQuantity}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${product.isActive ? 'Đang bán' : 'Ngừng bán'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button onclick="editProduct(${product.productID})" 
                  class="text-blue-600 hover:text-blue-900 action-btn mr-2">
            <i class="fas fa-edit mr-1"></i>Sửa
          </button>
          <button onclick="deleteProduct(${product.productID})" 
                  class="text-red-600 hover:text-red-900 action-btn">
            <i class="fas fa-trash-alt mr-1"></i>Xóa
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  // Edit product
  window.editProduct = async (id) => {
    try {
        const token = getCookie('token');
        if (!token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '../../Customer/Templates/login.html';
            return;
        }

        const response = await fetch(`${API_BASE}/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = '../../Customer/Templates/login.html';
                return;
            }
            if (response.status === 403) {
                alert('Bạn không có quyền truy cập sản phẩm này.');
                return;
            }
            const errorText = await response.text();
            let errorMessage = 'Failed to load product';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const product = await response.json();
        productModalTitle.textContent = 'Sửa sản phẩm';
        editingProductId = id;

        document.getElementById('product-name').value = product.productName || '';
        document.getElementById('product-category').value = product.categoryID || '';
        document.getElementById('product-price').value = product.price || 0;
        document.getElementById('product-quantity').value = product.stockQuantity || 0;
        document.getElementById('product-description').value = product.description || '';

        const preview = document.getElementById('image-preview');
        preview.innerHTML = '';
        if (product.imageURL) {
            const img = document.createElement('img');
            img.src = product.imageURL;
            img.className = 'w-full h-24 object-cover rounded';
            preview.appendChild(img);
        }

        productModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Không thể tải thông tin sản phẩm: ' + error.message);
    }
};

  // Delete product
  window.deleteProduct = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        const response = await fetch(`${API_BASE}/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getCookie('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete product');
        }

        alert('Xóa sản phẩm thành công!');
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Không thể xóa sản phẩm');
      }
    }
  };

  // Handle product form submission
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('ProductName', document.getElementById('product-name').value);
    formData.append('CategoryID', document.getElementById('product-category').value);
    formData.append('Price', document.getElementById('product-price').value);
    formData.append('Quantity', document.getElementById('product-quantity').value);
    formData.append('Description', document.getElementById('product-description').value);
    
    const imageFiles = document.getElementById('product-images').files;
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append('Images', imageFiles[i]);
    }

    try {
      const url = editingProductId 
        ? `${API_BASE}/products/${editingProductId}`
        : `${API_BASE}/products`;
        
      const response = await fetch(url, {
        method: editingProductId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      alert(editingProductId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
      productModal.classList.add('hidden');
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Không thể lưu sản phẩm');
    }
  });