document.addEventListener('DOMContentLoaded', async function() {
    // Hàm cập nhật thông tin người dùng trong nav, sidebar và form
    function updateUserInfo(name, email, phone, birthdate) {
        // Cập nhật trong header (#userMenuDropdown)
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName && userEmail) {
            userName.textContent = name || 'Chưa cập nhật';
            userEmail.textContent = email || 'Chưa cập nhật';
        }
  
        // Cập nhật trong sidebar (User Info)
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        if (sidebarUserName && sidebarUserEmail) {
            sidebarUserName.textContent = name || 'Chưa cập nhật';
            sidebarUserEmail.textContent = email || 'Chưa cập nhật';
        }
  
        // Cập nhật tên trong phần tài khoản (header)
        const accountName = document.getElementById('accountName');
        if (accountName) {
            accountName.textContent = name || 'Tài khoản';
        }
  
        // Cập nhật các trường trong form
        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const birthdateField = document.getElementById('birthdate');
        const birthdateDisplay = document.getElementById('birthdateDisplay');
  
        if (fullNameField) fullNameField.value = name || 'Nguyễn Văn A';
        if (emailField) emailField.value = email || 'user@example.com';
        if (phoneField) phoneField.value = phone || '0901234567';
        if (birthdateField && birthdateDisplay) {
            if (birthdate) {
                // Chuyển đổi từ dd/mm/yyyy sang yyyy-mm-dd để hiển thị trong input type="date"
                const [day, month, year] = birthdate.split('/');
                birthdateField.value = `${year}-${month}-${day}`; // "1990-01-01"
                birthdateDisplay.textContent = birthdate; // "01/01/1990"
            } else {
                birthdateField.value = '1990-01-01';
                birthdateDisplay.textContent = '01/01/1990';
            }
        }
    }
  
    // Hàm lấy dữ liệu người dùng từ API
    async function fetchUserData() {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
    
            // Ưu tiên lấy dữ liệu từ sessionStorage
            const savedName = sessionStorage.getItem('userName');
            const savedEmail = sessionStorage.getItem('userEmail');
            const savedPhone = sessionStorage.getItem('userPhone');
            const savedBirthdate = sessionStorage.getItem('userBirthdate');
    
            if (savedName || savedEmail) {
                updateUserInfo(savedName, savedEmail, savedPhone, savedBirthdate);
                return; // Dừng lại nếu đã có dữ liệu trong sessionStorage
            }
    
            const response = await fetch('https://localhost:5191/api/Users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu người dùng');
            }
    
            const userData = await response.json();
            const { name, email, phone, birthdate } = userData;
    
            sessionStorage.setItem('userName', name);
            sessionStorage.setItem('userEmail', email);
            sessionStorage.setItem('userPhone', phone);
            sessionStorage.setItem('userBirthdate', birthdate);
    
            updateUserInfo(name, email, phone, birthdate);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu người dùng:', error);
            const savedName = sessionStorage.getItem('userName');
            const savedEmail = sessionStorage.getItem('userEmail');
            const savedPhone = sessionStorage.getItem('userPhone');
            const savedBirthdate = sessionStorage.getItem('userBirthdate');
    
            if (savedName || savedEmail) {
                updateUserInfo(savedName, savedEmail, savedPhone, savedBirthdate);
            } else {
                window.location.href = 'login.html';
            }
        }
    }
  
    // Gọi hàm lấy dữ liệu người dùng khi trang tải
    await fetchUserData();
  
    // Giỏ hàng
    document.getElementById('cartButton')?.addEventListener('click', function () {
        this.querySelector('.cart-dropdown')?.classList.toggle('active');
    });
  
    // Menu tài khoản
    const userMenu = document.getElementById('userMenu');
    const button = userMenu?.querySelector('button');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
  
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
  
    // Menu di động
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
        });
    }
  
    // Đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            sessionStorage.removeItem('userName');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userPhone');
            sessionStorage.removeItem('userBirthdate');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
  
    // Chỉnh sửa thông tin hồ sơ
    const editToggle = document.getElementById('editToggle');
    const actionButtons = document.getElementById('actionButtons');
    const profileForm = document.getElementById('profileForm');
    const formFields = profileForm.querySelectorAll('input, select');
    const birthdateField = document.getElementById('birthdate');
    const birthdateDisplay = document.getElementById('birthdateDisplay');
  
    function enableFields() {
        formFields.forEach(field => {
            field.disabled = false;
        });
        if (birthdateField && birthdateDisplay) {
            birthdateField.classList.remove('hidden');
            birthdateDisplay.classList.add('hidden');
        }
    }
  
    function disableFields() {
        formFields.forEach(field => {
            field.disabled = true;
        });
        if (birthdateField && birthdateDisplay) {
            birthdateField.classList.add('hidden');
            birthdateDisplay.classList.remove('hidden');
        }
    }
  
    if (editToggle && actionButtons && profileForm) {
        editToggle.addEventListener('click', function() {
            enableFields();
            actionButtons.style.display = 'flex';
            editToggle.style.display = 'none';
        });
  
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
  
                // Khôi phục giá trị từ sessionStorage khi hủy
                updateUserInfo(
                    sessionStorage.getItem('userName'),
                    sessionStorage.getItem('userEmail'),
                    sessionStorage.getItem('userPhone'),
                    sessionStorage.getItem('userBirthdate')
                );
            });
        }
  
        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const birthdateInput = document.getElementById('birthdate').value; // "1990-01-01"
  
            // Kiểm tra ngày sinh hợp lệ
            const date = new Date(birthdateInput);
            if (isNaN(date.getTime())) {
                alert('Ngày sinh không hợp lệ!');
                return;
            }
  
            // Kiểm tra ngày sinh không trong tương lai
            const today = new Date();
            if (date > today) {
                alert('Ngày sinh không được là ngày trong tương lai!');
                return;
            }
  
            // Chuyển đổi sang định dạng dd/mm/yyyy để lưu
            const formattedBirthdate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`; // "01/01/1990"
  
            try {
                // Gửi dữ liệu cập nhật lên API
                const response = await fetch('/api/user/update', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: fullName,
                        email: email,
                        phone: phone,
                        birthdate: formattedBirthdate,
                    }),
                });
  
                if (!response.ok) {
                    throw new Error('Không thể cập nhật thông tin người dùng');
                }
  
                // Lưu vào sessionStorage
                sessionStorage.setItem('userName', fullName);
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userPhone', phone);
                sessionStorage.setItem('userBirthdate', formattedBirthdate);
  
                // Cập nhật thông tin trong nav, sidebar và form
                updateUserInfo(fullName, email, phone, formattedBirthdate);
  
                // Vô hiệu hóa các trường và ẩn nút
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
            } catch (error) {
                console.error('Lỗi khi cập nhật thông tin:', error);
                alert('Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.');
            }
        });
    }
  });