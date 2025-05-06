document.addEventListener('DOMContentLoaded', async function() {
    // Hàm tiện ích cho cookie
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + 
            "; path=/; SameSite=Lax; Secure; Max-Age=" + (days * 24 * 60 * 60);
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
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax; Secure';
    }

    const API_BASE = "https://localhost:7088/api/Auth";

    // Hàm kiểm tra token hợp lệ
    async function isTokenValid(token) {
        if (!token) {
            console.log('Không tìm thấy token');
            return false;
        }

        try {
            console.log('Đang kiểm tra token...');
            const response = await fetch(`${API_BASE}/check-auth`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                console.log('Token không hợp lệ hoặc đã hết hạn');
                return false;
            }

            if (!response.ok) {
                console.log('Lỗi khi xác thực token:', response.status, response.statusText);
                return false;
            }

            const data = await response.json();
            console.log('Token validation response:', data);
            return data.isAuthenticated;
        } catch (error) {
            console.error('Lỗi khi kiểm tra token:', error);
            return false;
        }
    }

    // Hàm chuyển đổi định dạng ngày từ dd/MM/yyyy sang yyyy-MM-dd
    function convertToInputDateFormat(dateStr) {
        if (!dateStr) return '';
        // Nếu là ISO string (từ database)
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }
        // Nếu là dd/MM/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        }
        // Nếu là yyyy-MM-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        return '';
    }

    // Hàm chuyển đổi định dạng ngày từ yyyy-MM-dd sang dd/MM/yyyy
    function convertToDisplayDateFormat(dateStr) {
        if (!dateStr) return '';
        // Nếu là ISO string (từ database)
        if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
        }
        // Nếu là yyyy-MM-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        // Nếu là dd/MM/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }
        return '';
    }

    // Hàm chuyển đổi ngày về định dạng yyyy-MM-dd cho input type date
    function toInputDateFormat(dateStr) {
        if (!dateStr) return '';
        // Nếu là ISO (yyyy-MM-ddTHH:mm:ss), cắt lấy phần ngày
        let datePart = dateStr.split('T')[0];
        // Nếu là dd/MM/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        }
        // Nếu là yyyy-MM-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }
        return '';
    }

    // Hàm cập nhật thông tin người dùng trong nav, sidebar và form
    function updateUserInfo(name, email, phone, birthday, gender, province, district, ward, address) {
        // Lấy tên người dùng từ cookie nếu không có tham số name
        const userNameFromCookie = getCookie('userName');
        const displayName = name || userNameFromCookie || 'Chưa cập nhật';

        // Cập nhật tên trong nav
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName && userEmail) {
            userName.textContent = displayName;
            userEmail.textContent = email || 'Chưa cập nhật';
        }

        // Cập nhật tên trong sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        if (sidebarUserName && sidebarUserEmail) {
            sidebarUserName.textContent = displayName;
            sidebarUserEmail.textContent = email || 'Chưa cập nhật';
        }

        // Cập nhật tên trong phần tài khoản
        const accountName = document.getElementById('accountName');
        if (accountName) {
            accountName.textContent = displayName;
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

        if (fullNameField) fullNameField.value = displayName;
        if (emailField) emailField.value = email || getCookie('userEmail') || '';
        if (phoneField) phoneField.value = phone || '';
        if (birthdateField) {
            if (birthday) {
                // Đảm bảo luôn là yyyy-MM-dd cho input type="date"
                let formattedDate = '';
                if (typeof birthday === 'string' && birthday.includes('T')) {
                    formattedDate = birthday.split('T')[0];
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
                    formattedDate = birthday;
                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
                    const [day, month, year] = birthday.split('/');
                    formattedDate = `${year}-${month}-${day}`;
                } else if (/^\d{2}-\d{2}-\d{4}$/.test(birthday)) {
                    const [day, month, year] = birthday.split('-');
                    formattedDate = `${year}-${month}-${day}`;
                }
                birthdateField.value = formattedDate;
                // Xóa phần hiển thị ngày sinh chữ đỏ nếu có
                const birthdateDisplay = document.getElementById('birthdateDisplay');
                if (birthdateDisplay) {
                    birthdateDisplay.textContent = '';
                    birthdateDisplay.classList.add('hidden');
                }
            } else {
                birthdateField.value = '';
                const birthdateDisplay = document.getElementById('birthdateDisplay');
                if (birthdateDisplay) {
                    birthdateDisplay.textContent = '';
                    birthdateDisplay.classList.add('hidden');
                }
            }
        }
        if (genderMale && genderFemale) {
            let genderNormalized = gender;
            if (typeof genderNormalized === 'string') {
                if (genderNormalized === 'true' || genderNormalized === '1') genderNormalized = true;
                else if (genderNormalized === 'false' || genderNormalized === '0') genderNormalized = false;
                else genderNormalized = null;
            }
            genderMale.checked = false;
            genderFemale.checked = false;
            if (genderNormalized === true || genderNormalized === 1) genderMale.checked = true;
            else if (genderNormalized === false || genderNormalized === 0) genderFemale.checked = true;
        }
        if (provinceField) provinceField.value = province || '';
        if (districtField) districtField.value = district || '';
        if (wardField) wardField.value = ward || '';
        if (addressField) addressField.value = address || '';
    }

    // Hàm lấy dữ liệu người dùng từ API
    async function fetchUserData() {
        try {
            const token = getCookie('token');
            const isLoggedIn = getCookie('isLoggedIn');
            console.log('Token từ cookie:', token);

            if (!token || isLoggedIn !== 'true') {
                console.log('Không tìm thấy token hoặc chưa đăng nhập, chuyển hướng đến trang đăng nhập');
                window.location.href = 'login.html';
                return;
            }

            const isValid = await isTokenValid(token);
            if (!isValid) {
                console.log('Token không hợp lệ hoặc đã hết hạn, chuyển hướng đến trang đăng nhập');
                deleteCookie('token');
                deleteCookie('isLoggedIn');
                deleteCookie('userName');
                deleteCookie('userEmail');
                deleteCookie('userPhone');
                deleteCookie('userBirthdate');
                deleteCookie('userGender');
                deleteCookie('userAddress');
                window.location.href = 'login.html';
                return;
            }

            // Lấy thông tin người dùng từ API
            console.log('Đang lấy thông tin người dùng...');
            const response = await fetch(`${API_BASE}/check-auth`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.log('Lỗi khi lấy thông tin người dùng:', response.status, response.statusText);
                if (response.status === 401) {
                    console.log('Không được phép truy cập, chuyển hướng đến trang đăng nhập');
                    deleteCookie('token');
                    deleteCookie('isLoggedIn');
                    deleteCookie('userName');
                    deleteCookie('userEmail');
                    deleteCookie('userPhone');
                    deleteCookie('userBirthdate');
                    deleteCookie('userGender');
                    deleteCookie('userAddress');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Không thể lấy dữ liệu người dùng');
            }

            const data = await response.json();
            console.log('Dữ liệu người dùng từ API:', data);

            if (!data || !data.user) {
                console.log('Dữ liệu người dùng không hợp lệ');
                throw new Error('Dữ liệu người dùng không hợp lệ');
            }

            const userData = data.user;
            console.log('Birthday from API:', userData.birthday);

            // Lưu thông tin vào cookie
            setCookie('userName', userData.fullName, 7);
            setCookie('userEmail', userData.email, 7);
            setCookie('userPhone', userData.phone || '', 7);
            setCookie('userBirthdate', userData.birthday || '', 7);
            setCookie('userGender', userData.gender || '', 7);
            setCookie('userAddress', userData.address || '', 7);

            // Cập nhật giao diện với dữ liệu mới
            updateUserInfo(
                userData.fullName,
                userData.email,
                userData.phone,
                userData.birthday,
                userData.gender,
                '', // province
                '', // district
                '', // ward
                userData.address
            );

        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu người dùng:', error);
            // Nếu có lỗi, thử lấy dữ liệu từ cookie
            const savedName = getCookie('userName');
            const savedEmail = getCookie('userEmail');
            const savedPhone = getCookie('userPhone');
            const savedBirthday = getCookie('userBirthdate');
            const savedGender = getCookie('userGender');
            const savedAddress = getCookie('userAddress');

            if (savedName || savedEmail) {
                console.log('Sử dụng dữ liệu từ cookie');
                updateUserInfo(
                    savedName,
                    savedEmail,
                    savedPhone,
                    savedBirthday,
                    savedGender === 'true' ? true : savedGender === 'false' ? false : null,
                    '', // province
                    '', // district
                    '', // ward
                    savedAddress
                );
            } else {
                console.log('Không có dữ liệu từ cookie, chuyển hướng đến trang đăng nhập');
                window.location.href = 'login.html';
            }
        }
    }

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
    logoutButton.addEventListener('click', function () {
        deleteCookie('userName');
        deleteCookie('userEmail');
        deleteCookie('userPhone');
        deleteCookie('userBirthdate');
        deleteCookie('userGender');
        deleteCookie('userAddress');
        deleteCookie('token');
        deleteCookie('isLoggedIn');
        deleteCookie('user');
        window.location.href = 'login.html';
    });

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
            const token = getCookie('token');
            if (!token || !(await isTokenValid(token))) {
                console.log('Invalid or expired token, redirecting to login.html');
                deleteCookie('token');
                deleteCookie('isLoggedIn');
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
                    getCookie('userName'),
                    getCookie('userEmail'),
                    getCookie('userPhone'),
                    getCookie('userBirthdate'),
                    getCookie('userGender') === 'true' ? true : getCookie('userGender') === 'false' ? false : null,
                    '', // province
                    '', // district
                    '', // ward
                    getCookie('userAddress')
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
                const token = getCookie('token');
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

                // Cập nhật thông tin trong cookie
                setCookie('user', JSON.stringify(data.user), 1);
                setCookie('userName', data.user.fullName, 1);
                setCookie('userEmail', data.user.email, 1);
                setCookie('userPhone', data.user.phone || '', 1);
                setCookie('userBirthdate', data.user.birthday || '', 1);
                setCookie('userGender', data.user.gender || '', 1);
                setCookie('userAddress', data.user.address || '', 1);

                alert('Cập nhật thông tin thành công');
                window.location.reload();
            } catch (error) {
                console.error('Lỗi khi cập nhật thông tin:', error.message);
                if (error.message.includes('Token không tồn tại')) {
                    deleteCookie('token');
                    deleteCookie('isLoggedIn');
                    window.location.href = 'login.html';
                } else {
                    alert(error.message || 'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.');
                }
            }
        });
    }
});