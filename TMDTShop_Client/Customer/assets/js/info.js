// Hàm để kiểm tra và đặt vai trò người dùng (gọi từ HTML)
async function checkRole() {
    // Đọc thông tin từ sessionStorage
    const userDataRaw = sessionStorage.getItem('userData');
    console.log('Raw userData from sessionStorage:', userDataRaw);
    
    // Parse userData
    const userData = JSON.parse(userDataRaw || '{}');
    let role = userData.role || '';
    let shopName = userData.shopName || '';
    
    // Hiển thị thông tin debug chi tiết
    console.log('checkRole function called:');
    console.log('- userDataRaw exists:', !!userDataRaw);
    console.log('- userData after parse:', userData);
    console.log('- role value:', role);
    console.log('- role type:', typeof role);
    console.log('- shopName value:', shopName);
    
    // Cập nhật thông tin shop nếu cần
    if (role.toLowerCase() === 'seller' && window.sellerUtils) {
        try {
            console.log('User is a seller, trying to update shop info with sellerUtils');
            const updatedData = await window.sellerUtils.ensureShopInfo();
            if (updatedData && updatedData.shopName) {
                shopName = updatedData.shopName;
                console.log('Updated shopName in checkRole:', shopName);
            }
        } catch (error) {
            console.error('Error updating shop info in checkRole:', error);
        }
    }
    
    // Kiểm tra DOM
    const roleSelect = document.getElementById('role');
    console.log('- roleSelect element found:', !!roleSelect);
    if (roleSelect) {
        console.log('- Current roleSelect value:', roleSelect.value);
        console.log('- roleSelect options count:', roleSelect.options.length);
    }
    
    // Ghi đè giá trị vai trò nếu là seller
    if (role && role.toLowerCase() === 'seller') {
        console.log('Role is seller, will override select value');
        setTimeout(() => {
            const roleSelectAfterDelay = document.getElementById('role');
            if (roleSelectAfterDelay) {
                // Lưu giá trị ban đầu để so sánh
                const oldValue = roleSelectAfterDelay.value;
                
                // Thiết lập giá trị mới
                roleSelectAfterDelay.value = 'seller';
                
                // Kiểm tra xem việc thiết lập có thành công không
                console.log('Role select modification:');
                console.log('- Old value:', oldValue);
                console.log('- New value after set:', roleSelectAfterDelay.value);
                console.log('- Change successful:', oldValue !== roleSelectAfterDelay.value);
                
                // Hiển thị container shopName nếu là seller
                const shopNameContainer = document.getElementById('shopNameContainer');
                if (shopNameContainer) {
                    shopNameContainer.classList.remove('hidden');
                    console.log('ShopName container is now visible');
                    
                    // Đặt giá trị cho trường shopName
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput && shopName) {
                        shopNameInput.value = shopName;
                        console.log('ShopName value set to:', shopName);
                    }
                }
            } else {
                console.error('roleSelect element not found after delay!');
            }
        }, 300); // Đợi lâu hơn một chút
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE = "https://localhost:7088/api";
    
    // Cloudinary Configuration
    const CLOUDINARY_CLOUD_NAME = "dgewgggyd";
    const CLOUDINARY_UPLOAD_PRESET = "ShopX_Images";
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    // Kiểm tra nếu là seller và cập nhật thông tin shop
    async function ensureSellerShopInfo() {
        try {
            // Đọc userData từ sessionStorage
            const userDataRaw = sessionStorage.getItem('userData');
            if (!userDataRaw) return;
            
            const userData = JSON.parse(userDataRaw);
            console.log('Initial userData on page load:', userData);
            
            // Nếu có sellerUtils và người dùng là seller, sử dụng nó để cập nhật thông tin shop
            if (window.sellerUtils && userData.role?.toLowerCase() === 'seller') {
                console.log('User is a seller, calling sellerUtils.ensureShopInfo()');
                const updatedData = await window.sellerUtils.ensureShopInfo();
                console.log('After ensureShopInfo, userData:', updatedData);
                
                // Kiểm tra cập nhật UI nếu cần
                if (updatedData && updatedData.shopName) {
                    console.log('Updated shop name available:', updatedData.shopName);
                    
                    // Cập nhật trường shopName nếu có
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopNameInput.value = updatedData.shopName;
                        console.log('Updated shopName input with:', updatedData.shopName);
                    }
                }
            }
        } catch (error) {
            console.error('Error in ensureSellerShopInfo:', error);
        }
    }

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
    async function updateUserInfo() {
        // Đảm bảo thông tin shop được cập nhật nếu cần
        try {
            // Nếu có sellerUtils, sử dụng để lấy thông tin shop
            if (window.sellerUtils) {
                await window.sellerUtils.ensureShopInfo();
                console.log('Shop info updated by sellerUtils');
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin shop:', error);
        }
        
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        console.log('userData from sessionStorage in updateUserInfo:', userData);
        
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

        const roleSelect = document.getElementById('role');
        const shopNameContainer = document.getElementById('shopNameContainer');
        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const birthdateField = document.getElementById('birthdate');
        const genderMale = document.querySelector('input[name="gender"][value="male"]');
        const genderFemale = document.querySelector('input[name="gender"][value="female"]');
        const addressField = document.getElementById('address');

        if (roleSelect && shopNameContainer) {
            // Kiểm tra và chuẩn hóa vai trò từ dữ liệu API
            const role = userData.role || '';
            const shopName = userData.shopName || '';
            console.log('Role from userData (raw):', role); // Log để kiểm tra giá trị gốc
            console.log('ShopName from userData:', shopName); // Log để kiểm tra giá trị shopName
            
            // Chuẩn hóa vai trò cho việc so sánh (chuyển thành chữ thường)
            const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
            console.log('Role after lowercase:', roleLower);
            
            // Không tự tạo options mới, chỉ đặt giá trị cho option có sẵn
            try {
                if (roleLower === 'seller') {
                    roleSelect.value = 'seller';
                    console.log('Setting role value to: seller');
                    // Hiển thị phần shop name nếu là seller
                    shopNameContainer.classList.remove('hidden');
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopNameInput.value = shopName;
                        console.log('Shop name set to:', shopName);
                    }
                } else {
                    roleSelect.value = 'customer';
                    console.log('Setting role value to: customer');
                    shopNameContainer.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error setting role value:', error);
            }
            
            console.log('Final selected role:', roleSelect.value);
        }
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

    // Kiểm tra token và cập nhật thông tin, bao gồm thông tin shop
    const tokenValid = await checkToken();
    if (tokenValid) {
        // Đảm bảo thông tin shop trước khi cập nhật UI
        await ensureSellerShopInfo();
        // Cập nhật UI với thông tin người dùng
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
    const roleSelect = document.getElementById('role');
    const shopNameContainer = document.getElementById('shopNameContainer');
    
    console.log('editToggle found:', editToggle !== null);
    console.log('actionButtons found:', actionButtons !== null);
    console.log('profileForm found:', profileForm !== null);
    console.log('roleSelect found:', roleSelect !== null);

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

    // Thêm global event listener để bắt event trên button editToggle
    document.addEventListener('click', function(e) {
        if (e.target.id === 'editToggle' || e.target.closest('#editToggle')) {
            handleEditToggle();
        }
    });

    async function handleEditToggle() {
        console.log('Edit toggle clicked');
        const tokenValid = await checkToken();
        if (tokenValid) {
            enableFields();
            if (actionButtons) actionButtons.style.display = 'flex';
            if (editToggle) editToggle.style.display = 'none';
            if (roleSelect) {
                roleSelect.addEventListener('change', function() {
                    if (shopNameContainer) {
                        shopNameContainer.classList.toggle('hidden', this.value !== 'seller');
                    }
                });
            }
        }
    }

    if (editToggle) {
        console.log('Adding click event to editToggle');
        editToggle.addEventListener('click', handleEditToggle);
    }
    
    // Xử lý sự kiện hủy
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            disableFields();
            actionButtons.style.display = 'none';
            editToggle.style.display = '';
            shopNameContainer.classList.add('hidden');
            updateUserInfo();
        });
    }

    // Xử lý sự kiện submit form
    if (profileForm) {
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
                const userId = payload.sub; // Giả sử 'sub' là UserId

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
                const genderValue = genderRadio ? (genderRadio.value === 'male' ? true : false) : null;
                const address = document.getElementById('address').value;
                const role = roleSelect.value;
                
                // Lấy giá trị shopName nếu có
                let shopName = '';
                if (role === 'seller') {
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopName = shopNameInput.value.trim();
                        console.log('Got shopName from form:', shopName);
                    }
                } else {
                    // If current role is not seller, check if there was previously a shopName in userData
                    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    if (userData.role?.toLowerCase() === 'seller' && userData.shopName) {
                        shopName = userData.shopName;
                        console.log('Preserved existing shopName from userData:', shopName);
                    }
                }

                if (birthdateInput) {
                    const date = new Date(birthdateInput);
                    if (isNaN(date.getTime()) || date > new Date()) {
                        alert('Ngày sinh không hợp lệ!');
                        return;
                    }
                }

                let body = { fullName, email, phone, birthday: birthdateInput, gender: genderValue, address };
                if (role === 'seller' && shopName) {
                    try {
                        const convertResponse = await fetch(`${API_BASE}/seller/convert-to-seller`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ UserId: userId, ShopName: shopName })
                        });

                        if (!convertResponse.ok) {
                            const errorData = await convertResponse.json();
                            throw new Error(errorData.message || 'Chuyển đổi thành Seller thất bại');
                        }

                        const result = await convertResponse.json();
                        body = { ...body, role: 'seller', shopName: shopName, sellerId: result.SellerId };
                        console.log('Body for profile update with seller info:', body);
                        console.log('Explicitly checking if shopName is in body:', 'shopName' in body, body.shopName);
                    } catch (error) {
                        console.error('Lỗi khi chuyển đổi thành seller:', error);
                        alert('Lỗi khi chuyển đổi thành seller: ' + error.message);
                        return;
                    }
                } else {
                    body = { ...body, role: role || 'customer' };
                    // If we have a shopName but role is not seller, still include shopName in the request
                    if (shopName) {
                        body.shopName = shopName;
                        console.log('Including shopName in body even though role is not seller:', shopName);
                    }
                    console.log('Body for profile update:', body);
                }

                const response = await fetch(`${API_BASE}/Auth/update-profile`, {
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

                // Log kết quả từ API để kiểm tra
                console.log('Profile update API response:', data);
                
                // Đảm bảo giữ nguyên giá trị shopName khi cập nhật userData
                const updatedUserData = data.user || data;
                
                // Đảm bảo shopName được lưu trữ chính xác
                if (role === 'seller' && shopName && (!updatedUserData.shopName || updatedUserData.shopName === '')) {
                    updatedUserData.shopName = shopName;
                    console.log('Added missing shopName to userData:', shopName);
                }
                
                // Log full userData to check all properties
                console.log('Final userData before saving to sessionStorage:', updatedUserData);
                console.log('shopName in final userData:', updatedUserData.shopName);
                
                // Cập nhật userData trong sessionStorage
                sessionStorage.setItem('userData', JSON.stringify(updatedUserData));

                if (data.token) {
                    sessionStorage.setItem('token', data.token);
                }

                alert('Cập nhật thông tin thành công');
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
                shopNameContainer.classList.add('hidden');
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
                if (file.size > 5 * 1024 * 1024) {
                    alert('Kích thước file không được vượt quá 5MB');
                    return;
                }

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

                    const imageUrl = await uploadImageToCloudinary(file);
                    if (!imageUrl) {
                        throw new Error('Không thể upload ảnh lên Cloudinary');
                    }

                    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    
                    // Log shopName before creating payload
                    console.log('Current shopName in userData:', userData.shopName);
                    
                    const payload = {
                        fullName: userData.fullName || '',
                        email: userData.email || '',
                        phone: userData.phone || '',
                        birthday: userData.birthday || '',
                        gender: userData.gender,
                        address: userData.address || '',
                        avatar: imageUrl,
                        role: userData.role || '',
                        shopName: userData.shopName || ''
                    };
                    
                    console.log('Avatar update payload with role and shopName:', payload);
                    console.log('Explicitly checking if shopName is included:', 'shopName' in payload, payload.shopName);

                    const response = await fetch(`${API_BASE}/Auth/update-profile`, {
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
                    
                    // Đảm bảo giữ nguyên giá trị shopName
                    const updatedUserData = result.user || result;
                    const originalShopName = userData.shopName;
                    
                    if (originalShopName && (!updatedUserData.shopName || updatedUserData.shopName === '')) {
                        updatedUserData.shopName = originalShopName;
                        console.log('Preserved shopName in avatar update:', originalShopName);
                    }
                    
                    // Log to check what's actually in the updated data
                    console.log('Final userData before saving to sessionStorage:', updatedUserData);
                    console.log('shopName in final userData:', updatedUserData.shopName);
                    
                    sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
                    avatarImg.src = updatedUserData.avatar;
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

    // Ngay khi trang tải xong, kiểm tra vai trò
    checkRole();
});