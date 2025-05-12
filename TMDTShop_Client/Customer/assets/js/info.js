document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE = "https://localhost:7088/api/Auth";
    
    // Cloudinary Configuration
    const CLOUDINARY_CLOUD_NAME = "dgewgggyd";
    const CLOUDINARY_UPLOAD_PRESET = "ShopX_Images";
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    // Hàm upload ảnh lên Cloudinary
    async function uploadImageToCloudinary(file) {
        if (!file) return null;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Lỗi upload ảnh:', error);
            throw error;
        }
    }

    // Hàm cập nhật thông tin người dùng từ userData
    function updateUserInfo() {
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) {
            avatarImg.src = userData.avatar || `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/v1/default-avatar.png`;
        }

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName && userEmail) {
            userName.textContent = userData.fullName || 'Chưa cập nhật';
            userEmail.textContent = userData.email || 'Chưa cập nhật';
        }

        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        if (sidebarUserName && sidebarUserEmail) {
            sidebarUserName.textContent = userData.fullName || 'Chưa cập nhật';
            sidebarUserEmail.textContent = userData.email || 'Chưa cập nhật';
        }

        const accountName = document.getElementById('accountName');
        if (accountName) {
            accountName.textContent = userData.fullName || 'Chưa cập nhật';
        }

        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const birthdateField = document.getElementById('birthdate');
        const genderMale = document.querySelector('input[name="gender"][value="male"]');
        const genderFemale = document.querySelector('input[name="gender"][value="female"]');
        const addressField = document.getElementById('address');

        if (fullNameField) fullNameField.value = userData.fullName || '';
        if (emailField) emailField.value = userData.email || '';
        if (phoneField) phoneField.value = userData.phone || '';
        if (birthdateField) birthdateField.value = userData.birthday ? userData.birthday.split('T')[0] : '';
        if (genderMale && genderFemale) {
            const gender = userData.gender;
            genderMale.checked = gender === true || gender === 'true' || gender === 1;
            genderFemale.checked = gender === false || gender === 'false' || gender === 0 || !gender;
        }
        if (addressField) addressField.value = userData.address || '';
    }

    // Hàm kiểm tra token
    async function checkToken() {
        const token = sessionStorage.getItem('token');
        console.log('Token in info.js:', token);

        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'login.html';
            return false;
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
            console.log('Payload in info.js:', payload);

            const now = Date.now() / 1000;
            const bufferTime = 60;

            if (payload.exp && now > payload.exp - bufferTime) {
                throw new Error('Token expired');
            }

            if (payload.nbf && now < payload.nbf) {
                throw new Error('Token not yet valid');
            }

            return true;
        } catch (error) {
            console.error('Token validation failed:', error);
            sessionStorage.clear();
            window.location.href = 'login.html';
            return false;
        }
    }

    // Kiểm tra token và cập nhật thông tin
    const tokenValid = await checkToken();
    if (tokenValid) {
        updateUserInfo();
    }

    // Đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

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
                    link.click();
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
    const formFields = profileForm?.querySelectorAll('input, select');

    function enableFields() {
        if (formFields) {
            formFields.forEach(field => {
                field.disabled = false;
            });
            document.querySelectorAll('input[name="gender"]').forEach(radio => {
                radio.disabled = false;
            });
        }
    }

    function disableFields() {
        if (formFields) {
            formFields.forEach(field => {
                field.disabled = true;
            });
            document.querySelectorAll('input[name="gender"]').forEach(radio => {
                radio.disabled = true;
            });
        }
    }

    if (editToggle && actionButtons && profileForm) {
        editToggle.addEventListener('click', async function() {
            const tokenValid = await checkToken();
            if (tokenValid) {
                enableFields();
                actionButtons.style.display = 'flex';
                editToggle.style.display = 'none';
            }
        });

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
                updateUserInfo();
            });
        }

        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            try {
                const payloadBase64 = token.split('.')[1];
                if (!payloadBase64) {
                    throw new Error('Invalid token format');
                }

                let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                const padding = payloadBase64Standard.length % 4;
                if (padding) {
                    payloadBase64Standard += '='.repeat(4 - padding);
                }

                const payloadJson = atob(payloadBase64Standard);
                const payload = JSON.parse(payloadJson);

                const now = Date.now() / 1000;
                const bufferTime = 60;
                if (payload.exp && now > payload.exp - bufferTime) {
                    throw new Error('Token expired');
                }
                if (payload.nbf && now < payload.nbf) {
                    throw new Error('Token not yet valid');
                }

                const fullName = document.getElementById('fullName').value;
                const email = document.getElementById('email').value;
                const phone = document.getElementById('phone').value;
                const birthdateInput = document.getElementById('birthdate').value;
                const genderRadio = document.querySelector('input[name="gender"]:checked');
                let genderValue = null;
                if (genderRadio) {
                    genderValue = genderRadio.value === 'male' ? true : false;
                }
                const address = document.getElementById('address').value;

                if (birthdateInput) {
                    const date = new Date(birthdateInput);
                    if (isNaN(date.getTime()) || date > new Date()) {
                        alert('Ngày sinh không hợp lệ!');
                        return;
                    }
                }

                const body = { fullName, email, phone, birthday: birthdateInput, gender: genderValue, address };

                const response = await fetch(`${API_BASE}/update-profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Cập nhật thông tin thất bại');
                }

                // Cập nhật userData trong sessionStorage
                const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                userData.fullName = fullName;
                userData.email = email;
                userData.phone = phone;
                userData.birthday = birthdateInput;
                userData.gender = genderValue?.toString() || '';
                userData.address = address;
                sessionStorage.setItem('userData', JSON.stringify(userData));

                if (data.token) {
                    sessionStorage.setItem('token', data.token);
                }

                alert('Cập nhật thông tin thành công');
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
                updateUserInfo();
            } catch (error) {
                console.error('Lỗi khi cập nhật thông tin:', error.message);
                if (error.message.includes('Token') || error.message.includes('Invalid token')) {
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                } else {
                    alert(error.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
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

        avatarInput.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (file) {
                // Kiểm tra kích thước file (giới hạn 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Kích thước file không được vượt quá 5MB');
                    return;
                }

                // Kiểm tra định dạng file
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)');
                    return;
                }

                try {
                    const token = sessionStorage.getItem('token');
                    if (!token) {
                        window.location.href = 'login.html';
                        return;
                    }

                    // Upload ảnh lên Cloudinary
                    const imageUrl = await uploadImageToCloudinary(file);
                    if (!imageUrl) {
                        throw new Error('Không thể upload ảnh lên Cloudinary');
                    }

                    // Lấy thông tin user hiện tại
                    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');

                    // Tạo payload đúng với DTO backend
                    const payload = {
                        fullName: userData.fullName || '',
                        email: userData.email || '',
                        phone: userData.phone || '',
                        birthday: userData.birthday || '',
                        gender: userData.gender,
                        address: userData.address || '',
                        avatar: imageUrl
                    };
                    // Kiểm tra payload trước khi gửi
                    console.log('Payload gửi lên:', payload);

                    // Gọi API để cập nhật profile với avatar mới
                    const response = await fetch(`${API_BASE}/update-profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Không thể cập nhật avatar');
                    }

                    const result = await response.json();

                    // Cập nhật sessionStorage với thông tin mới
                    sessionStorage.setItem('userData', JSON.stringify(result.user));

                    // Hiển thị avatar mới
                    avatarImg.src = result.user.avatar;
                    alert('Cập nhật avatar thành công');

                } catch (error) {
                    console.error('Lỗi khi upload avatar:', error);
                    alert('Có lỗi xảy ra khi upload avatar: ' + error.message);
                }
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