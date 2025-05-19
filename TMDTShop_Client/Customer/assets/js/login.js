// Import Firebase config
import { firebaseConfig } from './config.js';

// Đăng ký sự kiện click cho liên kết "Quên mật khẩu"
document.getElementById('forgotPasswordForm')?.addEventListener('click', (e) => {
  e.preventDefault();
  showForm('forgotPasswordForm');
});

const API_BASE = "https://localhost:7088/api/Auth";
let tempUser = null;

// Khởi tạo Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// === Helper Functions ===
function showForm(formId) {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById(formId)?.classList.remove('hidden');
  document.getElementById('successMessage')?.classList.add('hidden');
  document.getElementById('forgotSuccessMessage')?.classList.add('hidden');
}

function showSuccessMessage() {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById('successMessage')?.classList.remove('hidden');
  
  setTimeout(() => window.location.href = 'index.html', 1000);
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  input.type = (input.type === 'password') ? 'text' : 'password';
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}

// === On Load: Show correct form from hash ===
window.addEventListener('load', () => {
  const formId = window.location.hash.substring(1);
  if (formId) showForm(formId);
});

// === Registration ===
document.querySelector('#registerFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`;
  const email = document.getElementById('registerEmail').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) return alert("Mật khẩu không đủ mạnh!");
  if (password !== confirmPassword) return alert("Mật khẩu nhập lại không khớp!");

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, fullName, phone, address })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      showForm("loginForm");
    } else {
      alert("Đăng ký thất bại: " + (data.message || "Lỗi không xác định"));
    }
  } catch (err) {
    alert("Lỗi khi đăng ký: " + err.message);
  }
});

// === Login ===
document.querySelector('#loginFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  submitBtn.disabled = true;

  try {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log('Login response data:', data);
    if (!response.ok) throw new Error(data.message || `Lỗi đăng nhập`);

    // Log thông tin vai trò để debug
    console.log('Role from API:', data.user?.role);
    console.log('Full API response data:', JSON.stringify(data, null, 2));
    
    // Lưu token và thông tin người dùng dưới dạng JSON
    sessionStorage.clear();
    sessionStorage.setItem('token', data.token);
    
    // Đảm bảo vai trò và thông tin shop được lưu chính xác
    let userRole = '';
    let shopName = '';
    
    if (data.user) {
        userRole = data.user.role || '';
        if (data.user.shopName) {
            shopName = data.user.shopName;
        } else if (data.shopName) {
            shopName = data.shopName;
        }
    } else if (data.role) {
        userRole = data.role;
        shopName = data.shopName || '';
    }
    
    console.log('Determined role value to save:', userRole);
    console.log('Determined shopName to save:', shopName);
    
    const userData = {
      fullName: data.user?.fullName || data.fullName || email,
      email: data.user?.email || email,
      phone: data.user?.phone || '',
      birthday: data.user?.birthday || '',
      gender: data.user?.gender,
      address: data.user?.address || '',
      avatar: data.user?.avatar || '',
      role: userRole,
      shopName: shopName
    };
    
    console.log('Role being saved:', userData.role);
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Nếu là seller, lấy thông tin shop nếu chưa có
    if (userRole.toLowerCase() === 'seller' && (!shopName || shopName === '')) {
      try {
        // Sử dụng sellerUtils nếu đã tải
        if (window.sellerUtils) {
          await window.sellerUtils.ensureShopInfo();
          console.log('Shop info updated by sellerUtils after login');
        }
      } catch (error) {
        console.error('Error getting shop info:', error);
      }
    }
    
    console.log('Token saved:', sessionStorage.getItem('token'));
    console.log('UserData saved:', sessionStorage.getItem('userData'));

    showSuccessMessage();
  } catch (error) {
    alert(`Đăng nhập thất bại: ${error.message}`);
  } finally {
    submitBtn.innerHTML = "Đăng nhập";
    submitBtn.disabled = false;
  }
});

// === Forgot Password ===
document.querySelector('#forgotPasswordFormSubmit')?.addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('forgotPasswordForm').classList.add('hidden');
  document.getElementById('forgotSuccessMessage').classList.remove('hidden');
});

// === Reset Password ===
document.querySelector('#resetPasswordFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  const token = sessionStorage.getItem("resetToken");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) return alert("Mật khẩu mới không đủ mạnh!");
  if (newPassword !== confirmNewPassword) return alert("Mật khẩu nhập lại không khớp!");

  if (!token) return alert("Không tìm thấy token. Vui lòng thử lại từ bước quên mật khẩu.");

  try {
    const res = await fetch(`${API_BASE}/resetpassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword, confirmNewPassword })
    });

    const data = await res.json();
    if (res.ok) {
      sessionStorage.removeItem("resetToken");
      alert("Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập lại.");
      showForm("loginForm");
    } else {
      alert("Lỗi: " + (data.message || "Không thể đặt lại mật khẩu."));
    }
  } catch (err) {
    alert("Lỗi khi đặt lại mật khẩu: " + err.message);
  }
});

// === Social Login Handlers ===
document.getElementById('googleLogin')?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await handleSocialLogin(result.user);
  } catch (error) {
    alert("Đăng nhập bằng Google thất bại: " + error.message);
  }
});

document.getElementById('facebookLogin')?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    await handleSocialLogin(result.user);
  } catch (error) {
    alert("Đăng nhập bằng Facebook thất bại: " + error.message);
  }
});

// === Handle Social Login Logic ===
async function handleSocialLogin(user) {
  const provider = user.providerData[0]?.providerId;
  
  if (!user.email && provider === 'facebook.com') {
    tempUser = { ...user };
    document.getElementById('emailPrompt')?.classList.remove('hidden');
    return;
  }

  // Đổi tên thành requestData để tránh xung đột
  const requestData = {
    email: user.email,
    provider: provider,
    userId: user.uid,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    phoneNumber: user.phoneNumber || '',
    role: user.role || '',
    shopName: user.shopName || ''
  };

  try {
    const res = await fetch(`${API_BASE}/social-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });

    const data = await res.json();
    console.log('Social login response data:', data);
    if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

    // Log thông tin vai trò để debug
    console.log('Role from Social API:', data.user?.role || data.role);
    console.log('Full Social API response data:', JSON.stringify(data, null, 2));
    
    // Lưu token và thông tin người dùng dưới dạng JSON
    sessionStorage.clear();
    sessionStorage.setItem('token', data.token);
    
    // Đảm bảo vai trò và thông tin shop được lưu chính xác
    let userRole = '';
    let shopName = '';
    
    if (data.user) {
        userRole = data.user.role || '';
        if (data.user.shopName) {
            shopName = data.user.shopName;
        } else if (data.shopName) {
            shopName = data.shopName;
        }
    } else if (data.role) {
        userRole = data.role;
        shopName = data.shopName || '';
    }
    
    console.log('Determined role value to save:', userRole);
    console.log('Determined shopName to save:', shopName);
    
    // Biến này vẫn có thể giữ tên userData vì nó là biến mới
    const userData = {
      fullName: data.user?.fullName || data.fullName || user.displayName || user.email,
      email: data.user?.email || user.email,
      phone: data.user?.phone || user.phoneNumber || '',
      birthday: data.user?.birthday || '',
      gender: data.user?.gender,
      address: data.user?.address || '',
      avatar: data.user?.avatar || '',
      role: userRole,
      shopName: shopName || ''
    };
    
    // Lưu userData vào sessionStorage
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    console.log('Social login - Role being saved:', userData.role);
    console.log('Token saved:', sessionStorage.getItem('token'));
    console.log('UserData saved:', sessionStorage.getItem('userData'));

    showSuccessMessage();
  } catch (error) {
    alert("Đăng nhập thất bại: " + error.message);
  }
}

// Xử lý khi người dùng nhập email cho Facebook login
document.getElementById('emailPromptForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!tempUser) return;

  const email = document.getElementById('socialEmail').value;
  tempUser.email = email;
  await handleSocialLogin(tempUser);
  document.getElementById('emailPrompt')?.classList.add('hidden');
});