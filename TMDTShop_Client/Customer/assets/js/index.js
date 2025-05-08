// Đặt ở đầu file index.js, ngoài mọi function
window.displayAccountName = async function displayAccountName() {
    const accountNameElement = document.getElementById('accountName');
    const userNameElement = document.getElementById('userName');
    const token = sessionStorage.getItem('token');

    if (!token) {
        if (accountNameElement) accountNameElement.textContent = 'Tài khoản';
        if (userNameElement) userNameElement.textContent = 'Tài khoản';
        return;
    }

    try {
        const response = await fetch('https://localhost:7088/api/Auth/check-auth', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (accountNameElement) accountNameElement.textContent = 'Tài khoản';
            if (userNameElement) userNameElement.textContent = 'Tài khoản';
            return;
        }

        const data = await response.json();
        const userName = data.user?.fullName || 'Tài khoản';

        if (accountNameElement) accountNameElement.textContent = userName;
        if (userNameElement) userNameElement.textContent = userName;
    } catch (error) {
        if (accountNameElement) accountNameElement.textContent = 'Tài khoản';
        if (userNameElement) userNameElement.textContent = 'Tài khoản';
    }
};

document.addEventListener('DOMContentLoaded', function () {
  const submenuGroups = document.querySelectorAll('.submenu-group');

  submenuGroups.forEach(group => {
    const submenu = group.querySelector('.submenu');
    group.addEventListener('mouseenter', () => submenu.style.display = 'block');
    group.addEventListener('mouseleave', () => submenu.style.display = 'none');
  });

  document.getElementById('cartButton')?.addEventListener('click', function () {
    this.querySelector('.cart-dropdown')?.classList.toggle('active');
  });

  const fadeElements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  fadeElements.forEach(element => observer.observe(element));

  // Xử lý menu tài khoản
  const userMenu = document.getElementById('userMenu');
  const button = userMenu?.querySelector('button');
  const userMenuDropdown = userMenu?.querySelector('#userMenuDropdown');

  if (button && userMenuDropdown) {
      button.addEventListener('click', function (e) {
          e.preventDefault();
          const isExpanded = button.getAttribute('aria-expanded') === 'true';
          userMenuDropdown.classList.toggle('active');
          button.setAttribute('aria-expanded', !isExpanded);
          userMenuDropdown.setAttribute('aria-hidden', isExpanded);
      });

      document.addEventListener('click', function (e) {
          if (!userMenu.contains(e.target)) {
              userMenuDropdown.classList.remove('active');
              button.setAttribute('aria-expanded', 'false');
              userMenuDropdown.setAttribute('aria-hidden', 'true');
          }
      });

      button.addEventListener('keydown', function (e) {
          if (['Enter', ' '].includes(e.key)) {
              e.preventDefault();
              button.click();
          }
      });

      document.querySelectorAll('#userMenuDropdown a').forEach(link => {
          link.addEventListener('keydown', function (e) {
              if (['Enter', ' '].includes(e.key)) {
                  e.preventDefault();
                  this.click();
              }
          });
      });
  }

  // Kiểm tra trạng thái đăng nhập khi trang được tải
  async function checkLoginStatus() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        displayAccountName();
        return;
    }

    try {
        const response = await fetch('https://localhost:7088/api/Auth/check-auth', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            sessionStorage.clear();
            displayAccountName();
            return;
        }

        // Không lưu userInfo nữa
        displayAccountName();
    } catch (error) {
        sessionStorage.clear();
        displayAccountName();
    }
  }

  // Đăng xuất
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
          const token = sessionStorage.getItem("token");

          try {
              await fetch("https://localhost:7088/api/Auth/logout", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + token
                  }
              });

              // Xóa toàn bộ sessionStorage
              sessionStorage.clear();

              // Chuyển hướng về trang đăng nhập
              window.location.href = "login.html";
          } catch (err) {
              alert("Đăng xuất thất bại. Vui lòng thử lại.");
          }
      });
  }

  // Kiểm tra trạng thái đăng nhập khi trang được tải
  checkLoginStatus();
  displayAccountName();
});
