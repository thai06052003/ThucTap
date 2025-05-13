/* URL API */
const API_BASE_URL = 'https://localhost:7088/api'

// --- Phần logic hiển thị của bạn ---
const adminView = `<a href="/Admin/index.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100" role="menuitem">Truy cập với quyền ADMIN</a>`;
const sellerView = `<a href="/Admin/templates/seller.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100" role="menuitem">Truy cập với quyền Seller</a>`;

// Lấy vai trò từ token
const role = getRoleFromToken();
console.log(role)

// Tìm phần tử container trong HTML bằng ID
const linkContainer = document.getElementById('role-specific-link-container');

// Kiểm tra xem phần tử container có tồn tại không
if (linkContainer) {
    // Kiểm tra vai trò và chèn HTML tương ứng
    if (role === "Admin") {
        linkContainer.innerHTML = adminView; // Chèn view Admin vào container
    } else if (role === "Seller") {
        linkContainer.innerHTML = sellerView; // Chèn view Seller vào container
    } else {
        // Tùy chọn: Xử lý trường hợp không phải Admin/Seller hoặc không có vai trò
        // Ví dụ: để trống hoặc hiển thị một thông báo khác
        linkContainer.innerHTML = ''; // Để trống container
        console.log("Vai trò không phải Admin hoặc Seller, hoặc không tìm thấy vai trò.");
    }
} else {
    console.error("Không tìm thấy phần tử với ID 'role-specific-link-container'.");
}

// kiểm tra trạng thái đăng nhập
function checkAuthToken() {
    const accountNameElement = document.getElementById('accountName');
    const userNameElement = document.getElementById('userName');
    const token = sessionStorage.getItem("token");

    console.log('Token in index.js:', token);

    if (!token) {
        console.log('No token found, redirecting to login');
        if (accountNameElement) accountNameElement.textContent = 'Tài khoản';
        if (userNameElement) userNameElement.textContent = 'Tài khoản';
        window.location.href = "login.html";
        return;
    }

    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) {
            throw new Error('Invalid token format: Missing payload');
        }

        let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padding = payloadBase64Standard.length % 4;
        if (padding) {
            payloadBase64Standard += '='.repeat(4 - padding);
        }

        const payloadJson = atob(payloadBase64Standard);
        const payload = JSON.parse(payloadJson);
        console.log('Payload in index.js:', payload);

        const now = Date.now() / 1000;
        const bufferTime = 60;

        if (payload.exp && now > payload.exp - bufferTime) {
            throw new Error('Token đã hết hạn');
        }

        if (payload.nbf && now < payload.nbf) {
            throw new Error('Token không có hiệu lực');
        }

        // Lấy thông tin từ userData trong sessionStorage
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const userName = userData.fullName || 'Tài khoản';

        if (accountNameElement) accountNameElement.textContent = userName;
        if (userNameElement) userNameElement.textContent = userName;

        // Hiển thị vai trò nếu có
        const userRole = getRoleFromToken();
        if (userRole) {
            console.log('Vai trò người dùng:', userRole);
        }
    } catch (error) {
        console.error('Token lỗi:', error);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("tokenExpiry");
        window.location.href = "/Customer/templates/login.html";
        return;
    }
}

// Tạo mới + cập nhật session
function setSession(key, value) {
    // Kiểm tra xem sessionStorage có chứa key hay không
    if (sessionStorage.getItem(key) === null) {
        // Nếu chưa tồn tại, tạo mới và gán giá trị
        sessionStorage.setItem(key, value);
        console.log(`Đã tạo session mới với key: ${key}`);
    } else {
        // Nếu đã tồn tại, cập nhật giá trị
        sessionStorage.setItem(key, value);
        console.log(`Đã cập nhật session với key: ${key}`);
    }
}

// Xóa session
function removeSession(key) {
    sessionStorage.removeItem(key)
}

// Xử lý ảnh 
function getImageUrl(apiImageUrl) {
    const placeholderImage = '../assets/images/placeholder.png';
    if (!apiImageUrl || apiImageUrl.toLowerCase() === 'string' || apiImageUrl.trim() === '') {
        return placeholderImage;
    }
    if (/^(https?:)?\/\//i.test(apiImageUrl)) {
        return apiImageUrl;
    }
    return placeholderImage;
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
            sessionStorage.removeItem("token")
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
  displayAccountName();
});

/* Lấy role người dùng từ token */
function getRoleFromToken() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        console.error('Không tìm thấy token trong Session Storage.');
        return null;
    }

    try {
        const payloadBase64Url = token.split('.')[1];
        if (!payloadBase64Url) {
            console.error('Định dạng token không hợp lệ: Thiếu payload.');
            return null;
        }

        let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = payloadBase64.length % 4;
        if (padding) {
            payloadBase64 += '='.repeat(4 - padding);
        }

        const payloadObject = JSON.parse(atob(payloadBase64));

        const userRole = payloadObject.role;
        if (userRole === undefined) {
            console.warn('Thuộc tính "role" không tồn tại trong payload của token.');
            return null;
        }

        return userRole;
    } catch (error) {
        console.error('Lỗi khi giải mã hoặc phân tích token:', error);
        return null;
    }
}

window.displayAccountName = checkAuthToken;

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
                    link.click();
                }
            });
        });
    }

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

    checkAuthToken();
});

window.attachLogoutEvent = function attachLogoutEvent() {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.onclick = function () {
            try {
                sessionStorage.clear();
                window.location.href = "login.html";
            } catch (err) {
                console.error('Logout failed:', err);
                alert("Đăng xuất thất bại. Vui lòng thử lại.");
            }
        };
    }
};