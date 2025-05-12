/* Kiểm tra token phía client và hiển thị tên tài khoản */
async function checkAuthToken() {
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
            throw new Error('Token expired');
        }

        if (payload.nbf && now < payload.nbf) {
            throw new Error('Token not yet valid');
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
        console.error('Token validation failed:', error);
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}

/* Lấy vai trò người dùng từ token */
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