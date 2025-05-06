function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}



document.addEventListener('DOMContentLoaded', function () {

  // --- Lấy các container tĩnh (phải có trong index.html) ---
  const sidebarContainer = document.getElementById('sidebar');
  const headerContainer = document.getElementById('header');
  const contentArea = document.querySelector('.content-area');
  const bodyElement = document.body;

  if (!sidebarContainer || !headerContainer || !contentArea) {
    return;
  }

  // --- Thiết lập Event Listeners sử dụng Delegation ---
  setupSidebarListeners(sidebarContainer, contentArea);
  setupHeaderListeners(headerContainer);
  setupGlobalListeners(bodyElement, headerContainer); // Cần headerContainer để kiểm tra click ngoài menu

  // --- Gọi các hàm khởi tạo khác (nếu có) ---
  // Ví dụ: Cập nhật badges. Vẫn có thể gặp timing issue nếu badge nằm trong component load động.
  // Gọi sau một khoảng trễ nhỏ là giải pháp tạm thời không lý tưởng.
  // Cách tốt hơn là trigger hàm này sau khi component load xong (từ loadComponent)
  setTimeout(updateBadges, 500); // Đợi 0.5s để component có thể đã load xong

}); // Kết thúc DOMContentLoaded

// --- Hàm thiết lập Listener cho Sidebar ---
function setupSidebarListeners(sidebarContainer, contentArea) {
  sidebarContainer.addEventListener('click', function (e) {
    const sidebarElement = sidebarContainer.querySelector('.sidebar'); // Sidebar thực tế bên trong container
    if (!sidebarElement) return; // Thoát nếu sidebar chưa load

    // 1. Xử lý Sidebar Toggle (Thu gọn/Mở rộng)
    const toggleButton = e.target.closest('#sidebarToggle');
    if (toggleButton) {
      e.preventDefault();
      sidebarElement.classList.toggle('sidebar-collapsed'); // Class để thu gọn
      contentArea.classList.toggle('content-expanded');   // Class để nội dung mở rộng

      // Reset trạng thái các group khi thu gọn sidebar
      if (sidebarElement.classList.contains('sidebar-collapsed')) {
        sidebarContainer.querySelectorAll('.sidebar-group.active').forEach(group => {
          group.classList.remove('active');
          const content = group.querySelector('.sidebar-group-content');
          const icon = group.querySelector('.sidebar-group-toggle .fa-chevron-down');
          if (content) content.style.maxHeight = '0px';
          if (icon) icon.style.transform = 'rotate(0deg)';
        });
      }
      return; // Dừng xử lý click tại đây
    }

    // 2. Xử lý Group Toggle (Accordion)
    const groupToggleButton = e.target.closest('.sidebar-group-toggle');
    if (groupToggleButton && !sidebarElement.classList.contains('sidebar-collapsed')) { // Chỉ hoạt động khi không thu gọn
      e.preventDefault();
      const group = groupToggleButton.closest('.sidebar-group');
      if (group) {
        group.classList.toggle('active');
        const icon = groupToggleButton.querySelector('.fa-chevron-down');
        const content = group.querySelector('.sidebar-group-content');

        if (icon) {
          icon.style.transform = group.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        if (content) {
          // Đặt max-height dựa trên trạng thái active
          content.style.maxHeight = group.classList.contains('active') ? content.scrollHeight + 'px' : '0px';
        }
      }
      return; // Dừng xử lý click tại đây
    }

  });
}

// --- Hàm thiết lập Listener cho Header ---
function setupHeaderListeners(headerContainer) {
  headerContainer.addEventListener('click', function (e) {
    // 1. Xử lý Admin Toggle Dropdown
    const adminToggleButton = e.target.closest('#adminToggle');
    if (adminToggleButton) {
      e.stopPropagation(); // Ngăn sự kiện lan ra body, tránh việc đóng ngay lập tức
      const adminSubmenu = document.getElementById('adminSubmenu'); // Tìm submenu khi click
      adminSubmenu?.classList.toggle('hidden');
      return;
    }

    // 2. Xử lý nút chuông thông báo (nếu cần)
    const bellButton = e.target.closest('.fa-bell'); // Ví dụ selector
    if (bellButton) {
      // Thêm logic xử lý thông báo ở đây
      return;
    }
  });
}

// --- Hàm thiết lập Listener Toàn cục (ví dụ: click ra ngoài) ---
function setupGlobalListeners(bodyElement, headerContainer) { // Truyền headerContainer vào
  bodyElement.addEventListener('click', function (e) {
    // 1. Đóng Admin Submenu khi click ra ngoài
    const adminToggle = headerContainer.querySelector('#adminToggle'); // Tìm trong header
    const adminSubmenu = headerContainer.querySelector('#adminSubmenu'); // Tìm trong header

    if (adminToggle && adminSubmenu && !adminSubmenu.classList.contains('hidden')) {
      // Kiểm tra xem click có nằm ngoài cả nút toggle và submenu không
      if (!adminToggle.contains(e.target) && !adminSubmenu.contains(e.target)) {
        adminSubmenu.classList.add('hidden');
      }
    }
    // 2. Xử lý các link dummy href="#" (nếu chưa được xử lý ở router.js)
    const dummyLink = e.target.closest('a[href="#"]');
    if (dummyLink) {
      e.preventDefault();
    }
  });
}

// --- Hàm cập nhật Badges (Vẫn cần gọi đúng thời điểm) ---
function updateBadges() {
  const badges = document.querySelectorAll('.badge-expanded, .badge-collapsed');
  if (badges.length > 0) {
    badges.forEach(badge => {
      const count = parseInt(badge.getAttribute('data-count')) || 0;
      badge.textContent = count > 99 ? '99+' : (count > 0 ? count : ''); // Ẩn nếu count là 0
      badge.style.display = count > 0 ? '' : 'none'; // Ẩn hoàn toàn nếu count là 0
    });
  } else {
  }
}
console.log(document.querySelector('#previewImage'))

// Chekc trạng thái đơn hàng
function changeStatus(orderId) {
  fetch('/api/orders/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderId: orderId })
  })
  .then(response => response.json())
  .then(data => {
    alert('Trạng thái đã được cập nhật!');
    // Có thể reload hoặc thay đổi nội dung trên nút nếu cần
  })
  .catch(error => {
    console.error('Lỗi cập nhật:', error);
    alert('Có lỗi xảy ra khi cập nhật trạng thái');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Xử lý badge để hiển thị "99+" nếu số lớn hơn 99
  function updateBadges() {
    const badges = document.querySelectorAll('.badge-expanded, .badge-collapsed');
    badges.forEach(badge => {
      const count = parseInt(badge.getAttribute('data-count')) || 0;
      badge.textContent = count > 99 ? '99+' : count;
    });
  }

  // Gọi hàm cập nhật badge khi trang được tải
  updateBadges();

  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      const sidebar = document.querySelector('.sidebar');
      const contentArea = document.querySelector('.content-area');
      console.log('Sidebar toggle clicked');
      if (sidebar && contentArea) {
        sidebar.classList.toggle('sidebar-collapsed');
        contentArea.classList.toggle('content-expanded');
        if (sidebar.classList.contains('sidebar-collapsed')) {
          document.querySelectorAll('.sidebar-group').forEach(group => {
            group.classList.remove('active');
            const content = group.querySelector('.sidebar-group-content');
            if (content) {
              content.style.maxHeight = '0px';
            }
            const icon = group.querySelector('.fa-chevron-down');
            if (icon) {
              icon.style.transform = 'rotate(0deg)';
            }
          });
        }
        console.log('Sidebar class:', sidebar.classList);
        console.log('Content area class:', contentArea.classList);
      } else {
        console.error('Sidebar or content-area not found');
      }
    });
  } else {
    console.error('Sidebar toggle button not found');
  }

  document.querySelectorAll('.sidebar-group-toggle').forEach(toggle => {
    if (!toggle.dataset.listenerAttached) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        const group = this.closest('.sidebar-group');
        group.classList.toggle('active');
        const icon = this.querySelector('.fa-chevron-down');
        if (icon) {
          icon.style.transform = group.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        const content = group.querySelector('.sidebar-group-content');
        if (group.classList.contains('active')) {
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          content.style.maxHeight = '0px';
        }
      });
      toggle.dataset.listenerAttached = 'true';
    }
  });

  document.querySelectorAll('[data-target]').forEach(link => {
    if (!link.dataset.listenerAttached) {
      link.addEventListener('click', function(e) {
        if (!this.closest('.sidebar-group-content')) {
          e.preventDefault();
        }
        const target = this.getAttribute('data-target');
        if (!target) return;
        document.querySelectorAll('[data-content]').forEach(content => {
          content.classList.remove('active');
        });
        const targetContent = document.querySelector(`[data-content="${target}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
        const titleText = this.querySelector('.sidebar-item-text');
        document.getElementById('pageTitle').textContent = titleText ? titleText.textContent : this.textContent;
      });
      link.dataset.listenerAttached = 'true';
    }
  });

  const adminToggle = document.getElementById('adminToggle');
  if (adminToggle && !adminToggle.dataset.listenerAttached) {
    adminToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const submenu = document.getElementById('adminSubmenu');
      if (submenu) {
        submenu.classList.toggle('hidden');
      }
    });
    adminToggle.dataset.listenerAttached = 'true';
  }

  document.addEventListener('click', function(e) {
    const adminToggle = document.getElementById('adminToggle');
    const adminSubmenu = document.getElementById('adminSubmenu');
    if (adminToggle && adminSubmenu && !adminToggle.contains(e.target) && !adminSubmenu.contains(e.target)) {
      adminSubmenu.classList.add('hidden');
    }
  });

  document.querySelectorAll('a[href="#"]').forEach(link => {
    if (!link.dataset.listenerAttached) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
      });
      link.dataset.listenerAttached = 'true';
    }
  });

  if (window.location.hash) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }

  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (sidebarFooter) {
    sidebarFooter.classList.add('hidden');
    sidebarFooter.remove();
  }

  // Pagination
  let currentPage = 1;
  const totalPages = 10; // chỉnh theo số lượng thực tế

  document.getElementById("totalPages").textContent = totalPages;

  function updatePagination() {
    document.getElementById("currentPage").textContent = currentPage;
    document.getElementById("prevPage").disabled = currentPage <= 1;
    document.getElementById("nextPage").disabled = currentPage >= totalPages;
    // TODO: Load data của trang tương ứng từ backend hoặc array
  }

  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updatePagination();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      updatePagination();
    }
  });

  updatePagination();
});
