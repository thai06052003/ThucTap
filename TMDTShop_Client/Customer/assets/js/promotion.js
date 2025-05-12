// Danh sách các ảnh banner (chỉ dùng ảnh tồn tại)
const bannerImages = [
    'https://cf.shopee.vn/file/sg-11134258-7rent-m8fzgr5jebvt46_xxhdpi',
    'https://cf.shopee.vn/file/sg-11134258-7rep5-m8fzmzczc42v61_xxhdpi',
    'https://cf.shopee.vn/file/sg-11134258-7reqm-m8fwfbeasjaf71_xxhdpi',
    'https://cf.shopee.vn/file/sg-11134258-7ren7-m8k4tvphqvtd35_xxhdpi',
];

let currentImageIndex = 0;
const bannerElement = document.getElementById('banner-image');
const transitionTime = 3000;

// Hàm chuyển ảnh
function changeBannerImage() {
    if (!bannerElement) return;
    bannerElement.style.opacity = '0';

    setTimeout(() => {
        currentImageIndex = (currentImageIndex + 1) % bannerImages.length;
        bannerElement.style.backgroundImage = `url('${bannerImages[currentImageIndex]}')`;
        bannerElement.style.opacity = '0.9';
    }, 1000);
}

if (bannerElement) {
    bannerElement.style.backgroundImage = `url('${bannerImages[0]}')`;
    let slideshowInterval = setInterval(changeBannerImage, transitionTime);

    bannerElement.addEventListener('mouseenter', () => {
        clearInterval(slideshowInterval);
    });

    bannerElement.addEventListener('mouseleave', () => {
        slideshowInterval = setInterval(changeBannerImage, transitionTime);
    });
}

// Toggle cart dropdown
const cartBtn = document.getElementById('cartButton');
if (cartBtn) {
    cartBtn.addEventListener('click', function () {
        const cartDropdown = this.querySelector('.cart-dropdown');
        if (cartDropdown) cartDropdown.classList.toggle('active');
    });
}

// Thông báo dropdown JS thuần
const notificationBtn = document.getElementById('notificationButton');
const notificationDropdown = document.getElementById('notification-dropdown');

if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        notificationDropdown.classList.toggle('hidden');
    });

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function (e) {
        if (!notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.add('hidden');
        }
    });

    // Ngăn click bên trong dropdown bị đóng
    notificationDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}
