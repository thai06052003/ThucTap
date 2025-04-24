// === Firebase Initialization ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, signInWithRedirect, getRedirectResult, signInWithPopup,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
  FacebookAuthProvider, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Đăng ký sự kiện click cho liên kết "Quên mật khẩu"
document.getElementById('forgotPasswordForm')?.addEventListener('click', (e) => {
  e.preventDefault();
  showForm('forgotPasswordForm');
});

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDE2e4kVbx-FI1bZqNFPH7gPfyUHreYlgM",
  authDomain: "shopx-a9954.firebaseapp.com",
  projectId: "shopx-a9954",
  storageBucket: "shopx-a9954.firebasestorage.app",
  messagingSenderId: "318593412881",
  appId: "1:318593412881:web:3f785d1d6ea2325bece6b0",
  measurementId: "G-P5V81N7HY8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const API_BASE = "https://localhost:5191/api/Users";
let tempUser = null;

// === Helper Functions ===
function showForm(formId) {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById(formId)?.classList.remove('hidden');
  document.getElementById('successMessage')?.classList.add('hidden');
}

function showSuccessMessage() {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById('successMessage')?.classList.remove('hidden');
  setTimeout(() => window.location.href = 'index.html', 500);
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

      const data = await res.json();
      if (res.ok) {
          alert("Đăng ký thành công! Vui lòng đăng nhập.");
          showForm("loginForm");
      } else {
          alert("Đăng ký thất bại: " + (data.message || "Lỗi không xác định"));
      }
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

      const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi đăng nhập`);

      // Lưu token và thông tin người dùng
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("userName", data.user?.name || "");
      sessionStorage.setItem("userEmail", data.user?.email || email);
      sessionStorage.setItem("userPhone", data.user?.phone || "");
      sessionStorage.setItem("userBirthdate", data.user?.birthdate || "");

      showSuccessMessage();
  } catch (error) {
      console.error("Login error:", error);
      alert(`Đăng nhập thất bại: ${error.message}`);
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

    const data = await res.json();
    if (res.ok) {
      // Lưu token vào localStorage để sử dụng trong bước đặt lại mật khẩu
      sessionStorage.setItem("resetToken", data.token);
      alert("Yêu cầu đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email.");
      showForm("resetPasswordForm");
    } else {
      alert("Lỗi: " + (data.message || "Không thể gửi yêu cầu."));
    }
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
  const token =sessionStorage.getItem("resetToken"); // Lấy token từ localStorage

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
      sessionStorage.removeItem("resetToken"); // Xóa token sau khi sử dụng
      alert("Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập lại.");
      showForm("loginForm");
    } else {
      alert("Lỗi: " + (data.message || "Không thể đặt lại mật khẩu."));
    }
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
      const res = await fetch(`${API_BASE}/social-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData)
      });

      const data = await res.json();
      if (res.ok) {
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("userName", data.user?.name || "Social User");
          sessionStorage.setItem("userEmail", data.user?.email || user.email || "");
          sessionStorage.setItem("userPhone", data.user?.phone || "");
          sessionStorage.setItem("userBirthdate", data.user?.birthdate || "");
          showSuccessMessage();
      } else {
          alert("Đăng nhập thất bại: " + (data.message || "Lỗi không xác định"));
      }
  } catch (err) {
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