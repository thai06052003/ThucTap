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
          this.click();
        }
      });
    });
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

        // Xoá session
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        // Chuyển hướng về trang đăng nhập
        window.location.href = "login.html";
      } catch (err) {
        console.error("Lỗi khi logout:", err);
        alert("Đăng xuất thất bại. Vui lòng thử lại.");
      }
    });
  }
});
