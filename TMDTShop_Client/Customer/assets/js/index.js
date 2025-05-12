/* Kiểm tra trạng thái đăng nhập */
function checkAuthToken() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "/Customer/templates/login.html";
        return;
    }

    try {
        // Tách phần payload từ JWT
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);

        // Kiểm tra các trường thời gian quan trọng
        const now = Date.now() / 1000; // Chuyển sang giây
        const bufferTime = 60; // Dự phòng 60 giây

        if (payload.exp && now > payload.exp - bufferTime) {
            throw new Error('Token expired');
        }

        if (payload.nbf && now < payload.nbf) {
            throw new Error('Token not yet valid');
        }

    } catch (error) {
        console.error('Token validation failed:', error);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("tokenExpiry");
        window.location.href = "/Customer/templates/login.html";
        return;
    }
}

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

/* Lấy role người dùng từ token */
function getRoleFromToken() {
    // 1. Lấy token từ Session Storage
    const token = sessionStorage.getItem('token');

    if (!token) {
        console.error('Không tìm thấy token trong Session Storage.');
        return null; // Hoặc trả về giá trị mặc định/xử lý lỗi khác
    }

    try {
        // 2. Tách lấy phần payload (phần thứ 2)
        // Phần payload là chuỗi Base64Url
        const payloadBase64Url = token.split('.')[1];
        if (!payloadBase64Url) {
            console.error('Định dạng token không hợp lệ: Thiếu payload.');
            return null;
        }


        // 3. Chuyển đổi Base64Url thành Base64 chuẩn (thay thế '-' bằng '+' và '_' bằng '/')
        let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Thêm padding '=' nếu cần thiết (Base64 yêu cầu độ dài là bội số của 4)
        // Hàm atob cần điều này
        const padding = payloadBase64.length % 4;
        if (padding) {
            payloadBase64 += '='.repeat(4 - padding);
        }

        // Giải mã Base64 thành chuỗi JSON
        const decodedPayloadString = atob(payloadBase64); // atob là hàm có sẵn của trình duyệt

        // 4. Phân tích chuỗi JSON thành đối tượng JavaScript
        const payloadObject = JSON.parse(decodedPayloadString);

        // 5. Lấy giá trị của thuộc tính 'role'
        const userRole = payloadObject.role;

        if (userRole === undefined) {
            console.warn('Thuộc tính "role" không tồn tại trong payload của token.');
            return null; // Hoặc giá trị mặc định
        }

        return userRole;

    } catch (error) {
        console.error('Lỗi khi giải mã hoặc phân tích token:', error);
        return null; // Xử lý lỗi
    }
}

checkAuthToken()