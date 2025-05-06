// === Firebase Initialization ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, signInWithRedirect, getRedirectResult, signInWithPopup,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
  FacebookAuthProvider, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Import Firebase config
import { firebaseConfig } from './config.js';

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

// Đăng ký sự kiện click cho liên kết "Quên mật khẩu"
document.getElementById('forgotPasswordForm')?.addEventListener('click', (e) => {
  e.preventDefault();
  showForm('forgotPasswordForm');
});

// Cấu hình Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const API_BASE = "https://localhost:5191/api/Auth";
let tempUser = null;

// Hàm kiểm tra token hợp lệ
async function isTokenValid(token) {
    try {
        console.log("Validating token:", token);
        const response = await fetch(`${API_BASE}/validate-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            console.error("Token không hợp lệ hoặc đã hết hạn");
            return false;
        }

        if (response.status === 404) {
            console.error("Không tìm thấy endpoint xác thực token");
            return false;
        }

        if (!response.ok) {
            console.error(`Lỗi xác thực token: ${response.status} ${response.statusText}`);
            return false;
        }

        const data = await response.json();
        console.log("Token validation response:", data);
        return true;
    } catch (error) {
        console.error('Lỗi khi xác thực token:', error);
        return false;
    }
}

// === Helper Functions ===
function showForm(formId) {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById(formId)?.classList.remove('hidden');
  document.getElementById('successMessage')?.classList.add('hidden');
}

function showSuccessMessage() {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById('successMessage')?.classList.remove('hidden');
  
  // Kiểm tra token đã được lưu chưa
  const token = getCookie('token');
  const isLoggedIn = getCookie('isLoggedIn');
  
  if (!token || isLoggedIn !== 'true') {
    console.error('Token không được lưu thành công');
    alert('Có lỗi xảy ra khi lưu thông tin đăng nhập. Vui lòng thử lại.');
    return;
  }
  
  console.log('Đăng nhập thành công, chuyển hướng...');
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

// === Handle Redirect Result for Social Login ===
getRedirectResult(auth).then(async result => {
  if (result?.user) {
    await handleSocialLogin(result.user);
  }
}).catch(error => {
  console.error("Redirect error:", error);
  alert("Đăng nhập thất bại: " + error.message);
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

      if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Lỗi đăng ký");
      }

      const data = await res.json();
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      showForm("loginForm");
  } catch (err) {
      console.error("Register error:", err);
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

      console.log("Attempting login with email:", email);
      const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        let errorMessage = "Lỗi đăng nhập";
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.message || `Lỗi server: ${response.status}`;
            } else {
                errorMessage = `Lỗi server: ${response.status} - Phản hồi không phải JSON`;
            }
        } catch (parseError) {
            errorMessage = `Lỗi server: ${response.status} - Không thể parse phản hồi`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Login response data:", data);

      if (!data || !data.token) {
          throw new Error("Không nhận được token từ server");
      }

      const token = data.token;
      console.log("Token received:", token);

      // Lưu token và thông tin người dùng vào cookie
      setCookie("token", token, 7);
      setCookie("isLoggedIn", "true", 7);
      
      // Kiểm tra token đã được lưu chưa
      const savedToken = getCookie('token');
      const savedIsLoggedIn = getCookie('isLoggedIn');
      
      console.log("Saved token:", savedToken);
      console.log("Saved isLoggedIn:", savedIsLoggedIn);
      
      if (!savedToken || savedIsLoggedIn !== 'true') {
          throw new Error("Không thể lưu token vào cookie");
      }

      // Lưu thông tin người dùng nếu có
      if (data.user) {
          setCookie("userId", data.user.userID || "", 7);
          setCookie("userName", data.user.fullName || "", 7);
          setCookie("userEmail", data.user.email || email, 7);
          setCookie("userPhone", data.user.phone || "", 7);
          setCookie("userBirthdate", data.user.birthday || "", 7);
      }

      console.log("Login successful, cookies set, redirecting...");
      showSuccessMessage();
  } catch (error) {
      console.error("Login error:", error);
      alert(`Đăng nhập thất bại: ${error.message}`);
      deleteCookie('token');
      deleteCookie('isLoggedIn');
  } finally {
      submitBtn.innerHTML = "Đăng nhập";
      submitBtn.disabled = false;
  }
});

// === Forgot Password ===
document.querySelector('#forgotPasswordFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;

  try {
    const res = await fetch(`${API_BASE}/forgotpassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Không thể gửi yêu cầu");
    }

    const data = await res.json();
    setCookie("resetToken", data.token, 7);
    alert("Yêu cầu đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email.");
    showForm("resetPasswordForm");
  } catch (err) {
    console.error("Forgot Password error:", err);
    alert("Lỗi khi gửi yêu cầu: " + err.message);
  }
});

// === Reset Password ===
document.querySelector('#resetPasswordFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  const token = getCookie("resetToken");

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

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Không thể đặt lại mật khẩu");
    }

    const data = await res.json();
    deleteCookie("resetToken");
    alert("Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập lại.");
    showForm("loginForm");
  } catch (err) {
    console.error("Reset Password error:", err);
    alert("Lỗi khi đặt lại mật khẩu: " + err.message);
  }
});

// === Handle Social Login Logic ===
async function handleSocialLogin(user) {
  const provider = user.providerData[0]?.providerId;

  if (!user.email && provider === 'facebook.com') {
      tempUser = { ...user };
      document.getElementById('emailPrompt').classList.remove('hidden');
      return;
  }

  const userData = {
      email: user.email,
      provider,
      userId: user.uid
  };

  try {
      console.log("Attempting social login with provider:", provider);
      const res = await fetch(`${API_BASE}/social-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData)
      });

      if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Lỗi đăng nhập xã hội");
      }

      const data = await res.json();
      
      if (!data || !data.token) {
          throw new Error("Không nhận được token từ server");
      }

      const token = data.token;
      console.log("Received token after social login:", token);

      if (!(await isTokenValid(token))) {
          throw new Error("Token không hợp lệ. Vui lòng thử lại.");
      }

      // Lưu thông tin người dùng vào cookie
      setCookie("token", token, 7);
      setCookie("isLoggedIn", "true", 7);
      
      // Kiểm tra và lưu thông tin người dùng nếu có
      if (data.user) {
          setCookie("userId", data.user.userID || "", 7);
          setCookie("userName", data.user.fullName || "Social User", 7);
          setCookie("userEmail", data.user.email || user.email || "", 7);
          setCookie("userPhone", data.user.phone || "", 7);
          setCookie("userBirthdate", data.user.birthday || "", 7);
      } else {
          // Nếu không có thông tin người dùng, chỉ lưu email
          setCookie("userEmail", user.email || "", 7);
      }

      console.log("Social login successful, redirecting...");
      showSuccessMessage();
  } catch (err) {
      console.error("Social login error:", err);
      alert("Đăng nhập thất bại: " + err.message);
  } finally {
      tempUser = null;
  }
}

// === Social Email Prompt for Facebook (Missing Email) ===
window.submitManualEmail = async () => {
  const emailInput = document.getElementById('manualEmailInput').value;
  if (!emailInput.includes('@')) return alert("Email không hợp lệ!");

  if (tempUser) {
    tempUser.email = emailInput;
    document.getElementById('emailPrompt').classList.add('hidden');
    await handleSocialLogin(tempUser);
  } else {
    alert("Không tìm thấy thông tin người dùng.");
    document.getElementById('emailPrompt').classList.add('hidden');
  }
};

// === Social Login Handlers ===
window.loginWithFacebook = async () => {
  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error('Facebook Login Error:', error);
    alert(`Facebook Login Lỗi: ${error.message}`);
  }
};

window.loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error('Google Login Error:', error);
    alert(`Google Login Lỗi: ${error.message}`);
  }
};