const API_BASE = "https://localhost:7088/api";
let currentSellerId = 1;
let sellerCategories = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeUI();
    loadShopCategories();
});

function initializeUI() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarBtn = document.getElementById("toggleSidebar");
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const pageTitle = document.getElementById("pageTitle");
    const shopCategoryModal = document.getElementById("category-modal");
    const addShopCategoryBtn = document.getElementById("add-category-btn");
    const closeShopCategoryModalBtn = document.getElementById("close-category-modal-btn");
    const cancelShopCategoryBtn = document.getElementById("cancel-category-form-btn");
    const shopCategoryForm = document.getElementById("category-form");
    const logoutBtn = document.getElementById("logout-btn");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute("data-section");
            if (sectionId !== "shop-categories") {
                showToast("Chức năng này không khả dụng.", "info");
                return;
            }
            sections.forEach(section => section.classList.remove("active"));
            document.getElementById(`${sectionId}-section`).classList.add("active");
            navItems.forEach(nav => nav.classList.remove("bg-gray-200"));
            item.classList.add("bg-gray-200");
            const sidebarText = item.querySelector(".sidebar-text")?.textContent || item.textContent;
            if (pageTitle) pageTitle.textContent = sidebarText;
        });
    });

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            const icon = toggleSidebarBtn.querySelector("i");
            const text = toggleSidebarBtn.querySelector(".sidebar-text");
            if (sidebar.classList.contains("collapsed")) {
                icon.classList.replace("fa-chevron-left", "fa-chevron-right");
                text.textContent = "Mở rộng";
            } else {
                icon.classList.replace("fa-chevron-right", "fa-chevron-left");
                text.textContent = "Thu gọn";
            }
        });
    }

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener("click", () => {
            sidebar.classList.toggle("hidden");
        });
    }

    if (addShopCategoryBtn) {
        addShopCategoryBtn.addEventListener("click", () => {
            shopCategoryModal.classList.remove("hidden");
            document.getElementById("modal-title").textContent = "Thêm Danh Mục Shop";
            shopCategoryForm.reset();
            document.getElementById("category-is-active").checked = true;
            shopCategoryForm.dataset.mode = "create";
        });
    }

    if (closeShopCategoryModalBtn) {
        closeShopCategoryModalBtn.addEventListener("click", () => {
            shopCategoryModal.classList.add("hidden");
        });
    }

    if (cancelShopCategoryBtn) {
        cancelShopCategoryBtn.addEventListener("click", () => {
            shopCategoryModal.classList.add("hidden");
        });
    }

    if (shopCategoryForm) {
        shopCategoryForm.addEventListener("submit", handleShopCategoryFormSubmit);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    }
}

async function loadShopCategories() {
    try {
        const categories = await fetchAPI(`/sellers/${currentSellerId}/categories`);
        sellerCategories = categories || [];
        renderShopCategories();
        renderCategoryList();
    } catch (error) {
        showToast(`Không thể tải danh mục: ${error.message}`, "error");
    }
}

function renderShopCategories() {
    const tbody = document.getElementById("category-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    sellerCategories.forEach(category => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${category.categoryName || "N/A"}</td>
            <td class="px-6 py-4 whitespace-nowrap">${category.description || "N/A"}</td>
            <td class="px-6 py-4 whitespace-nowrap">${category.isActive ? "Hoạt động" : "Không hoạt động"}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="edit-btn text-blue-600 hover:text-blue-900 mr-4">Sửa</button>
                <button class="delete-btn text-red-600 hover:text-red-900">Xóa</button>
            </td>
        `;
        row.querySelector(".edit-btn").addEventListener("click", () => openEditShopCategoryModal(category.sellerCategoryID));
        row.querySelector(".delete-btn").addEventListener("click", () => deleteShopCategory(category.sellerCategoryID));
        tbody.appendChild(row);
    });
}

function renderCategoryList() {
    const container = document.getElementById("categoryList");
    if (!container) return;
    container.innerHTML = sellerCategories.length ? "" : "<p>Chưa có danh mục nào.</p>";
    sellerCategories.forEach(category => {
        const div = document.createElement("div");
        div.className = "border p-4 rounded-lg";
        div.innerHTML = `
            <h4 class="font-semibold">${category.categoryName || "N/A"}</h4>
            <p>${category.description || "Không có mô tả"}</p>
            <p>Trạng thái: ${category.isActive ? "Hoạt động" : "Không hoạt động"}</p>
        `;
        container.appendChild(div);
    });
}

async function handleShopCategoryFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.dataset.mode;
    const submitButton = document.getElementById("save-btn");
    const saveText = document.getElementById("save-text");
    const saveSpinner = document.getElementById("save-spinner");

    const categoryData = {
        categoryName: document.getElementById("category-name").value,
        description: document.getElementById("category-description").value,
        isActive: document.getElementById("category-is-active").checked
    };

    if (!categoryData.categoryName) {
        showToast("Tên danh mục không được để trống.", "error");
        return;
    }

    submitButton.disabled = true;
    saveText.classList.add("hidden");
    saveSpinner.classList.remove("hidden");

    try {
        let response;
        if (mode === "edit") {
            const categoryId = form.dataset.categoryId;
            response = await fetchAPI(`/sellers/${currentSellerId}/categories/${categoryId}`, {
                method: "PUT",
                body: JSON.stringify(categoryData)
            });
            sellerCategories = sellerCategories.map(cat =>
                cat.sellerCategoryID === parseInt(categoryId) ? { ...cat, ...categoryData } : cat
            );
            showToast("Danh mục đã được cập nhật!", "success");
        } else {
            response = await fetchAPI(`/sellers/${currentSellerId}/categories`, {
                method: "POST",
                body: JSON.stringify(categoryData)
            });
            sellerCategories.push(response);
            showToast("Danh mục đã được tạo!", "success");
        }
        renderShopCategories();
        renderCategoryList();
        document.getElementById("category-modal").classList.add("hidden");
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, "error");
    } finally {
        submitButton.disabled = false;
        saveText.classList.remove("hidden");
        saveSpinner.classList.add("hidden");
    }
}

async function openEditShopCategoryModal(categoryId) {
    try {
        const category = await fetchAPI(`/sellers/${currentSellerId}/categories/${categoryId}`);
        if (!category) {
            showToast("Không tìm thấy danh mục.", "error");
            return;
        }
        const modal = document.getElementById("category-modal");
        const form = document.getElementById("category-form");
        document.getElementById("modal-title").textContent = "Sửa Danh Mục Shop";
        document.getElementById("category-name").value = category.categoryName || "";
        document.getElementById("category-description").value = category.description || "";
        document.getElementById("category-is-active").checked = category.isActive;
        form.dataset.mode = "edit";
        form.dataset.categoryId = categoryId;
        modal.classList.remove("hidden");
    } catch (error) {
        showToast(`Không thể tải danh mục: ${error.message}`, "error");
    }
}

async function deleteShopCategory(categoryId) {
    if (!confirm("Bạn có chắc chắn muốn xóa danh mục này?")) return;
    try {
        await fetchAPI(`/sellers/${currentSellerId}/categories/${categoryId}`, { method: "DELETE" });
        sellerCategories = sellerCategories.filter(cat => cat.sellerCategoryID !== categoryId);
        renderShopCategories();
        renderCategoryList();
        showToast("Danh mục đã được xóa!", "success");
    } catch (error) {
        showToast(`Lỗi khi xóa danh mục: ${error.message}`, "error");
    }
}

async function fetchAPI(endpoint, options = {}) {
    const token = getTokenFromSession();
    const defaultHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    };
    if (token) defaultHeaders["Authorization"] = `Bearer ${token}`;
    options.headers = { ...defaultHeaders, ...options.headers };

    const fullUrl = `${API_BASE}${endpoint}`;
    try {
        const response = await fetch(fullUrl, options);
        if (response.status === 401) {
            showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", "error");
            setTimeout(() => { window.location.href = "../../Customer/Templates/login.html"; }, 1500);
            throw new Error("Unauthorized");
        }
        if (!response.ok) {
            let errorMessage = `Lỗi HTTP: ${response.status} tại ${fullUrl}`;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.message || JSON.stringify(errorData.errors) || errorMessage;
            } else {
                errorMessage = await response.text() || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return response.status === 204 ? null : await response.json();
    } catch (error) {
        console.error(`API Error (${fullUrl}):`, error.message);
        throw error;
    }
}

function getTokenFromSession() {
    return sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500"}`;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function logout() {
    sessionStorage.removeItem("authToken");
    localStorage.removeItem("authToken");
    window.location.href = "../../Customer/Templates/login.html";
}