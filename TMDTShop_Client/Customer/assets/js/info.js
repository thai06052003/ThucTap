document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE = "https://localhost:7088/api/Auth";

    // Hàm kiểm tra token hợp lệ
    async function isTokenValid(token) {
        if (!token) {
            return false;
        }
        try {
            const response = await fetch(`${API_BASE}/check-auth`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 401) {
                return false;
            }
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            return data.isAuthenticated;
        } catch (error) {
            return false;
        }
    }

    // Hàm cập nhật thông tin người dùng trong nav, sidebar và form
    function updateUserInfo(name, email, phone, birthday, gender, province, district, ward, address) {
        // Cập nhật tên trong nav
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName && userEmail) {
            userName.textContent = name || 'Chưa cập nhật';
            userEmail.textContent = email || 'Chưa cập nhật';
        }
        // Cập nhật tên trong sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        if (sidebarUserName && sidebarUserEmail) {
            sidebarUserName.textContent = name || 'Chưa cập nhật';
            sidebarUserEmail.textContent = email || 'Chưa cập nhật';
        }
        // Cập nhật tên trong phần tài khoản
        const accountName = document.getElementById('accountName');
        if (accountName) {
            accountName.textContent = name || 'Chưa cập nhật';
        }
        // Cập nhật các trường trong form
        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const birthdateField = document.getElementById('birthdate');
        const genderMale = document.querySelector('input[name="gender"][value="male"]');
        const genderFemale = document.querySelector('input[name="gender"][value="female"]');
        const provinceField = document.getElementById('province');
        const districtField = document.getElementById('district');
        const wardField = document.getElementById('ward');
        const addressField = document.getElementById('address');
        if (fullNameField) fullNameField.value = name || '';
        if (emailField) emailField.value = email || '';
        if (phoneField) phoneField.value = phone || '';
        if (birthdateField) birthdateField.value = birthday ? (birthday.split('T')[0]) : '';
        if (genderMale && genderFemale) {
            genderMale.checked = gender === true || gender === 'true' || gender === 1;
            genderFemale.checked = gender === false || gender === 'false' || gender === 0;
        }
        if (provinceField) provinceField.value = province || '';
        if (districtField) districtField.value = district || '';
        if (wardField) wardField.value = ward || '';
        if (addressField) addressField.value = address || '';
    }

    // Hàm lấy dữ liệu người dùng từ API
    async function fetchUserData() {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Gọi API để lấy thông tin mới nhất
            const response = await fetch(`${API_BASE}/check-auth`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                sessionStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            const data = await response.json();
            if (!data || !data.user) {
                window.location.href = 'login.html';
                return;
            }
            updateUserInfo(
                data.user.fullName,
                data.user.email,
                data.user.phone,
                data.user.birthday,
                data.user.gender,
                '', '', '',
                data.user.address
            );
        } catch (error) {
            window.location.href = 'login.html';
        }
    }

    await fetchUserData();

    // Đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', async function () {
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

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

    // Chỉnh sửa thông tin hồ sơ
    const editToggle = document.getElementById('editToggle');
    const actionButtons = document.getElementById('actionButtons');
    const profileForm = document.getElementById('profileForm');
    const formFields = profileForm.querySelectorAll('input, select');

    function enableFields() {
        formFields.forEach(field => {
            field.disabled = false;
        });
        // Enable all gender radio buttons
        document.querySelectorAll('input[name="gender"]').forEach(radio => {
            radio.disabled = false;
        });
    }

    function disableFields() {
        formFields.forEach(field => {
            field.disabled = true;
        });
        // Disable all gender radio buttons
        document.querySelectorAll('input[name="gender"]').forEach(radio => {
            radio.disabled = true;
        });
    }

    if (editToggle && actionButtons && profileForm) {
        editToggle.addEventListener('click', async function() {
            const token = sessionStorage.getItem('token');
            if (!token || !(await isTokenValid(token))) {
                console.log('Invalid or expired token, redirecting to login.html');
                sessionStorage.clear();
                window.location.href = 'login.html';
                return;
            }
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

                updateUserInfo(
                    sessionStorage.getItem('userName'),
                    sessionStorage.getItem('userEmail'),
                    sessionStorage.getItem('userPhone'),
                    sessionStorage.getItem('userBirthdate'),
                    sessionStorage.getItem('userGender') === 'true' ? true : sessionStorage.getItem('userGender') === 'false' ? false : null,
                    '', // province
                    '', // district
                    '', // ward
                    sessionStorage.getItem('userAddress')
                );
            });
        }

        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const birthdateInput = document.getElementById('birthdate').value;
            const genderRadio = document.querySelector('input[name="gender"]:checked');
            let genderValue = null;
            if (genderRadio) {
                if (genderRadio.value === 'male') genderValue = true;
                else if (genderRadio.value === 'female') genderValue = false;
                else genderValue = null;
            }
            const address = document.getElementById('address').value;

            // Validate ngày sinh
            if (birthdateInput) {
                const date = new Date(birthdateInput);
                if (isNaN(date.getTime())) {
                    alert('Ngày sinh không hợp lệ!');
                    return;
                }

                const today = new Date();
                if (date > today) {
                    alert('Ngày sinh không được là ngày trong tương lai!');
                    return;
                }
            }

            try {
                const token = sessionStorage.getItem('token');
                if (!token || !(await isTokenValid(token))) {
                    throw new Error('Token không tồn tại hoặc đã hết hạn. Vui lòng đăng nhập lại.');
                }

                const userResponse = await fetch(`${API_BASE}/check-auth`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!userResponse.ok) {
                    throw new Error('Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.');
                }

                const userData = await userResponse.json();
                const currentEmail = userData.user.email;

                const body = {
                    fullName: fullName,
                    phone: phone,
                    birthday: birthdateInput,
                    gender: genderValue,
                    address: address
                };

                if (email !== currentEmail) {
                    body.email = email;
                }

                console.log('Sending update request with body:', body);

                const response = await fetch(`${API_BASE}/update-profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                console.log('Update response status:', response.status);
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server response was not JSON');
                }

                const data = await response.json();
                console.log('Update response data:', data);

                if (!response.ok) {
                    throw new Error(data.message || 'Cập nhật thông tin thất bại');
                }

                if (data.token) {
                    sessionStorage.setItem('token', data.token);
                }
                alert('Cập nhật thông tin thành công');
                window.location.reload();
            } catch (error) {
                console.error('Lỗi khi cập nhật thông tin:', error.message);
                if (error.message.includes('Token không tồn tại')) {
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                } else {
                    alert(error.message || 'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.');
                }
            }
        });
    }

    // === AVATAR UPLOAD ===
    const avatarCamera = document.getElementById('avatarCamera');
    const avatarInput = document.getElementById('avatarInput');
    const avatarImg = document.getElementById('avatarImg');

    if (avatarCamera && avatarInput && avatarImg) {
        avatarCamera.addEventListener('click', function () {
            avatarInput.click();
        });
        avatarInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    avatarImg.src = ev.target.result;
                };
                reader.readAsDataURL(file);
                // TODO: Gửi file lên server nếu có API upload avatar
            }
        });
    }

    // === SIDEBAR TAB SWITCH ===
    const sidebarAccount = document.getElementById('sidebarAccount');
    const sidebarOrders = document.getElementById('sidebarOrders');
    const accountInfoSection = document.getElementById('account-info-section');
    const orderSection = document.getElementById('order-section');

    function setActiveTab(tab) {
        if (tab === 'account') {
            sidebarAccount.classList.add('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarAccount.classList.remove('text-gray-700');
            sidebarOrders.classList.remove('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarOrders.classList.add('text-gray-700');
            accountInfoSection.classList.remove('hidden');
            orderSection.classList.add('hidden');
        } else {
            sidebarOrders.classList.add('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarOrders.classList.remove('text-gray-700');
            sidebarAccount.classList.remove('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarAccount.classList.add('text-gray-700');
            orderSection.classList.remove('hidden');
            accountInfoSection.classList.add('hidden');
        }
    }
    if (sidebarAccount && sidebarOrders && accountInfoSection && orderSection) {
        sidebarAccount.addEventListener('click', function (e) {
            e.preventDefault();
            setActiveTab('account');
        });
        sidebarOrders.addEventListener('click', function (e) {
            e.preventDefault();
            setActiveTab('orders');
        });
    }
});