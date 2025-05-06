// --- Các hàm tiện ích và DOM elements ---
const API_SERVER_ROOT = 'https://localhost:7088'; // Chỉ chứa phần gốc của server
const API_PRODUCTS_ENDPOINT = `${API_SERVER_ROOT}/api/Product`; // Endpoint lấy sản phẩm
const productListContainer = document.getElementById('product-list');
const productListStatus = document.getElementById('product-list-status');

function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) { // Thêm kiểm tra isNaN
        return 'Liên hệ'; // Hoặc giá trị mặc định khác
    }
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function createProductCardHTML(product) {
    // Kiểm tra và gán giá trị mặc định cho các trường tùy chọn
    const price = product.price ?? null; // Dùng ?? để xử lý cả null và undefined
    const originalPrice = product.originalPrice ?? null;
    const ratingAverage = Math.round(product.ratingAverage ?? 0);
    const reviewCount = product.reviewCount ?? 0;
    const discountPercent = product.discountPercent ?? 0;
    const isNew = product.isNew ?? false;
    const stockQuantity = product.stockQuantity ?? 0;
    const productName = product.productName || 'Sản phẩm không tên'; // Đặt tên mặc định

    const formattedPrice = formatCurrency(price);

    // --- Sửa URL ảnh ---
    // Giả sử imageURL trả về từ API là đường dẫn tương đối bắt đầu bằng '/', ví dụ: "/images/sanpham.jpg"
    // Nếu imageURL là URL đầy đủ rồi thì không cần nối API_SERVER_ROOT
    let imageUrl = 'https://via.placeholder.com/500x500.png?text=No+Image'; // Placeholder mặc định
    if (product.imageURL) {
        if (product.imageURL.startsWith('http://') || product.imageURL.startsWith('https://')) {
             imageUrl = product.imageURL; // Nếu đã là URL đầy đủ
        } else if (product.imageURL.startsWith('/')) {
             imageUrl = `${API_SERVER_ROOT}${product.imageURL}`; // Nếu là đường dẫn tương đối từ gốc server
        } else {
            // Xử lý trường hợp khác nếu cần, ví dụ nối với một thư mục cụ thể
            imageUrl = `${API_SERVER_ROOT}/${product.imageURL}`;
        }
    }
    // --------------------

    const ratingStars = '<i class="fas fa-star text-yellow-400"></i>'.repeat(ratingAverage) +
                      '<i class="far fa-star text-gray-300"></i>'.repeat(5 - ratingAverage);

    const showOriginalPrice = originalPrice && price !== null && originalPrice > price;

    return `
        <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition product-card fade-in">
            <div class="relative">
                <a href="#"> <!-- Thêm link chi tiết sản phẩm nếu có -->
                    <img src="${imageUrl}" alt="${productName}" class="w-full h-48 object-cover" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/500x500.png?text=Image+Error';"> <!-- Thêm onerror -->
                </a>
                <div class="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Mới
                </div>
                ${discountPercent > 0 ? `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-${discountPercent}%</div>` : ''}
                ${isNew ? `<div class="absolute top-2 ${discountPercent > 0 ? 'right-2' : 'left-2'} bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">Mới</div>` : ''}

                <div class="product-actions absolute bottom-0 left-0 right-0 bg-white/90 flex justify-center space-x-2 p-2">
                    <button title="Yêu thích" class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                        <i class="far fa-heart text-sm"></i>
                    </button>
                    <button title="Xem nhanh" class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                        <i class="fas fa-search text-sm"></i>
                    </button>
                    <button title="Thêm vào giỏ" onclick="addToCart(${product.productID})" class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                        <i class="fas fa-shopping-cart text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <a href="#" class="text-gray-800 hover:text-blue-600 font-medium block mb-1 truncate" title="${productName}">${productName}</a>
                 <div class="flex items-center mb-2">
                    <div class="flex text-sm">
                        ${ratingStars}
                    </div>
                    <span class="text-gray-500 text-xs ml-1">(${reviewCount})</span>
                </div>
                <div class="flex items-center">
                    <span class="text-red-500 font-bold">${formattedPrice}</span>
                    ${showOriginalPrice ? `<span class="text-gray-500 text-sm line-through ml-2">${formatCurrency(originalPrice)}</span>` : ''}
                </div>
                 <p class="text-xs text-gray-500 mt-1">Kho: ${stockQuantity > 0 ? stockQuantity : 'Hết hàng'}</p>
            </div>
        </div>
    `;
}

async function fetchAndDisplayProducts() {
    if (!productListContainer || !productListStatus) {
        console.error("Không tìm thấy container hoặc status element.");
        return;
    }

    productListStatus.textContent = 'Đang tải sản phẩm...';
    productListStatus.style.display = 'block'; // Đảm bảo status hiển thị
    productListContainer.innerHTML = ''; // Xóa các card cũ (nếu có) trước khi thêm status

    try {
        console.log(`Đang gọi API: ${API_PRODUCTS_ENDPOINT}`); // Log URL để kiểm tra
        const response = await fetch(API_PRODUCTS_ENDPOINT); // *** Sửa URL fetch ***

         console.log('Trạng thái Response:', response.status, response.statusText); // Log trạng thái

        if (!response.ok) {
            // Log thêm thông tin lỗi nếu có thể
            let errorBody = 'Không thể đọc nội dung lỗi.';
            try {
                 errorBody = await response.text(); // Thử đọc body lỗi dạng text
                 console.error('Nội dung lỗi từ server:', errorBody);
            } catch (e) {}
            throw new Error(`Lỗi HTTP: ${response.status} ${response.statusText}. ${errorBody}`);
        }

        const products = await response.json();
        console.log('Dữ liệu sản phẩm nhận được:', products);

        productListStatus.style.display = 'none'; // Ẩn status đi khi có dữ liệu

        if (!Array.isArray(products)) {
             console.error("Dữ liệu trả về không phải là một mảng:", products);
             throw new Error("Định dạng dữ liệu API không đúng.");
        }


        if (products.length === 0) {
            productListContainer.innerHTML = '<p id="product-list-status" class="col-span-full">Không tìm thấy sản phẩm nào.</p>';
            return;
        }

        // Thêm từng card vào container
        products.forEach(product => {
            if (product && typeof product === 'object' && product.productID) { // Kiểm tra cơ bản product hợp lệ
                 const productCardHTML = createProductCardHTML(product);
                 productListContainer.insertAdjacentHTML('beforeend', productCardHTML);
            } else {
                 console.warn("Bỏ qua sản phẩm không hợp lệ:", product);
            }
        });

        // Kích hoạt hiệu ứng fade-in
        fadeInElements();

    } catch (error) {
        console.error('Lỗi nghiêm trọng khi tải hoặc xử lý sản phẩm:', error);
        // Hiển thị lỗi trong container chính thay vì status element đã bị ẩn
        productListContainer.innerHTML = `<p id="product-list-status" class="col-span-full text-red-600 font-semibold">Đã xảy ra lỗi khi tải sản phẩm. Chi tiết: ${error.message}. Vui lòng kiểm tra Console (F12).</p>`;
        productListStatus.style.display = 'none'; // Đảm bảo status ẩn đi
    }
}

function fadeInElements() {
     // Chắc chắn rằng productListContainer đã được cập nhật trước khi querySelectorAll
    const fadeElements = productListContainer.querySelectorAll('.product-card.fade-in');
    if (fadeElements.length === 0) return; // Không có gì để làm animation

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => { // Thêm index để tạo stagger
            if (entry.isIntersecting) {
                // Thêm độ trễ nhỏ dựa trên vị trí phần tử
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, 100 * (index % 10)); // Stagger effect cho tối đa 10 phần tử cùng lúc
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 }); // Kích hoạt khi 10% phần tử hiển thị

    fadeElements.forEach(element => {
        element.classList.remove('visible'); // Reset trạng thái trước khi observe
        observer.observe(element);
    });
}

async function addToCart(productId) {
    if (!productId) return;
    console.log(`Thêm sản phẩm ID: ${productId} vào giỏ.`);
    alert(`Đã thêm sản phẩm ID: ${productId} vào giỏ (chức năng demo)`);
    // Logic gọi API thêm vào giỏ hàng sẽ ở đây
}

// --- KHỞI CHẠY ---
// Đảm bảo DOM đã sẵn sàng trước khi chạy script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndDisplayProducts);
} else {
    // DOM đã sẵn sàng
    fetchAndDisplayProducts();
}

// Toggle cart dropdown
document.getElementById('cartButton').addEventListener('click', function () {
    const cartDropdown = this.querySelector('.cart-dropdown');
    cartDropdown.classList.toggle('active');
});

// Fade in animation on scroll
document.addEventListener('DOMContentLoaded', function () {
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    fadeElements.forEach(element => observer.observe(element));
});

// Toggle user menu
document.getElementById('userMenu').addEventListener('click', function (e) {
    e.preventDefault();
    const userMenuDropdown = this.querySelector('#userMenuDropdown');
    const isExpanded = this.querySelector('button').getAttribute('aria-expanded') === 'true';
    userMenuDropdown.classList.toggle('active');
    this.querySelector('button').setAttribute('aria-expanded', !isExpanded);
    userMenuDropdown.setAttribute('aria-hidden', isExpanded);
    document.querySelectorAll('.cart-dropdown.active').forEach(dropdown => dropdown.classList.remove('active'));
});

// Close menu when clicking outside
document.addEventListener('click', function (e) {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu.contains(e.target)) {
        const userMenuDropdown = userMenu.querySelector('#userMenuDropdown');
        userMenuDropdown.classList.remove('active');
        userMenu.querySelector('button').setAttribute('aria-expanded', 'false');
        userMenuDropdown.setAttribute('aria-hidden', 'true');
    }
});

// Keyboard support
document.getElementById('userMenu').querySelector('button').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
    }
});

document.querySelectorAll('#userMenuDropdown a').forEach(link => {
    link.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
});