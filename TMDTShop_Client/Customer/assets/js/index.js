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

  // Xử lý submenu
  const submenuGroups = document.querySelectorAll('.submenu-group');

  submenuGroups.forEach(group => {
      const submenu = group.querySelector('.submenu');
      group.addEventListener('mouseenter', () => submenu.style.display = 'block');
      group.addEventListener('mouseleave', () => submenu.style.display = 'none');
  });

  // Xử lý giỏ hàng
  document.getElementById('cartButton')?.addEventListener('click', function () {
      this.querySelector('.cart-dropdown')?.classList.toggle('active');
  });

  // Hiệu ứng fade-in
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
 // Hiển thị tên tài khoản trong header
 function displayAccountName() {
    const accountNameElement = document.getElementById('accountName');
    const userNameElement = document.getElementById('userName');
    const userName = getCookie('userName') || 'Tài khoản'; // Lấy tên từ cookie, mặc định là "Tài khoản"

    if (accountNameElement) {
        accountNameElement.textContent = userName; // Cập nhật tên trong header
    }
    if (userNameElement) {
        userNameElement.textContent = userName; // Cập nhật tên trong dropdown
    }
}
displayAccountName();
  // Đăng xuất
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
          const token = getCookie("token");

          try {
              await fetch("https://localhost:5191/api/Auth/logout", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + token
                  }
              });

              // Xóa Ascending sẽ sử dụng cookie thay vì sessionStorage
              deleteCookie("token");
              deleteCookie("user");

              // Chuyển hướng về trang đăng nhập
              window.location.href = "login.html";
          } catch (err) {
              console.error("Lỗi khi logout:", err);
              alert("Đăng xuất thất bại. Vui lòng thử lại.");
          }
      });
  }
});
