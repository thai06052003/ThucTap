// Toggle cart dropdown
document.addEventListener('DOMContentLoaded', () => {
    const cartButton = document.getElementById('cartButton');
    if (cartButton) {
        cartButton.addEventListener('click', function () {
            const cartDropdown = this.querySelector('.cart-dropdown');
            if (cartDropdown) {
                cartDropdown.classList.toggle('active');
            }
        });
    }

    // User menu toggle (nếu có JS cho phần này, bạn có thể thêm tiếp vào)
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

    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.querySelector('input[name="q"]');
        const productItems = document.querySelectorAll('.product-item'); // Giả sử mỗi sản phẩm có class này

        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            productItems.forEach(item => {
                const productName = item.querySelector('.product-name').textContent.toLowerCase();
                if (productName.includes(query)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
