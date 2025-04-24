// Danh sách các ảnh banner
const bannerImages = [
    '/img/1.jpg',
    '/img/2.png',
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
    bannerElement.style.opacity = '0';

    setTimeout(() => {
        currentImageIndex = (currentImageIndex + 1) % bannerImages.length;
        bannerElement.style.backgroundImage = `url('${bannerImages[currentImageIndex]}')`;
        bannerElement.style.opacity = '0.9';
    }, 1000);
}

bannerElement.style.backgroundImage = `url('${bannerImages[0]}')`;

let slideshowInterval = setInterval(changeBannerImage, transitionTime);

bannerElement.addEventListener('mouseenter', () => {
    clearInterval(slideshowInterval);
});

bannerElement.addEventListener('mouseleave', () => {
    slideshowInterval = setInterval(changeBannerImage, transitionTime);
});

// Toggle cart dropdown
document.getElementById('cartButton').addEventListener('click', function () {
    const cartDropdown = this.querySelector('.cart-dropdown');
    cartDropdown.classList.toggle('active');
});
