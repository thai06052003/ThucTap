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

  // Hiển thị tên tài khoản trong header
  function displayAccountName() {
    const accountNameElement = document.getElementById('accountName');
    const userNameElement = document.getElementById('userName');
    const token = getCookie('token');
    const isLoggedIn = getCookie('isLoggedIn');

    if (!token || isLoggedIn !== 'true') {
        if (accountNameElement) accountNameElement.textContent = 'Tài khoản';
        if (userNameElement) userNameElement.textContent = 'Tài khoản';
        return;
    }

    const userName = getCookie('userName') || 'Tài khoản';

    if (accountNameElement) {
        accountNameElement.textContent = userName;
    }
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
  }

  // Kiểm tra trạng thái đăng nhập khi trang được tải
  async function checkLoginStatus() {
    const token = getCookie('token');
    const isLoggedIn = getCookie('isLoggedIn');

    if (!token || isLoggedIn !== 'true') {
        console.log('Chưa đăng nhập');
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
            console.log('Token không hợp lệ, xóa thông tin đăng nhập');
            deleteCookie('token');
            deleteCookie('isLoggedIn');
            deleteCookie('userName');
            deleteCookie('userEmail');
            deleteCookie('userPhone');
            deleteCookie('userBirthdate');
            deleteCookie('userGender');
            deleteCookie('userAddress');
            displayAccountName();
            return;
        }

        const data = await response.json();
        if (data.isAuthenticated && data.user) {
            setCookie('userName', data.user.fullName, 7);
            setCookie('userEmail', data.user.email, 7);
            setCookie('userPhone', data.user.phone || '', 7);
            setCookie('userBirthdate', data.user.birthday || '', 7);
            setCookie('userGender', data.user.gender || '', 7);
            setCookie('userAddress', data.user.address || '', 7);
            displayAccountName();
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái đăng nhập:', error);
    }
  }

  // Đăng xuất
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
          const token = getCookie("token");

          try {
              await fetch("https://localhost:7088/api/Auth/logout", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + token
                  }
              });

              // Xóa tất cả cookie
              deleteCookie("token");
              deleteCookie("isLoggedIn");
              deleteCookie("userName");
              deleteCookie("userEmail");
              deleteCookie("userPhone");
              deleteCookie("userBirthdate");
              deleteCookie("userGender");
              deleteCookie("userAddress");

              // Chuyển hướng về trang đăng nhập
              window.location.href = "login.html";
          } catch (err) {
              console.error("Lỗi khi logout:", err);
              alert("Đăng xuất thất bại. Vui lòng thử lại.");
          }
      });
  }

  // Kiểm tra trạng thái đăng nhập khi trang được tải
  checkLoginStatus();
  displayAccountName();
});
