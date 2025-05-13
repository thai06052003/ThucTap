// START OF FILE components.js

// Component Loader
class ComponentLoader {
    constructor() {
        this.components = {
            header: '/Customer/components/header/header.html',
            footer: '/Customer/components/footer/footer.html'
        };
    }

    async loadComponent(componentName, targetId) {
        try {
            const response = await fetch(this.components[componentName]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${componentName}`);
            const html = await response.text();
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.innerHTML = html; // Chèn HTML

                // headerData đã được đăng ký toàn cục từ index.js
                // Giờ Alpine.initTree sẽ tìm thấy nó.
                if (window.Alpine && typeof Alpine.initTree === 'function') {
                    Alpine.initTree(targetElement);
                    console.log(`Alpine.initTree called on #${targetId} for component ${componentName}.`);
                } else {
                    console.error("Alpine.initTree is not available or Alpine is not loaded when trying to init component:", componentName);
                }
            } else {
                console.error(`Target element with ID '${targetId}' not found for component '${componentName}'.`);
            }
        } catch (error) {
            console.error(`Error loading ${componentName}:`, error);
            const targetElement = document.getElementById(targetId);
            if (targetElement) targetElement.innerHTML = `<p class="text-red-500 p-4">Lỗi tải component ${componentName}. Xem console.</p>`;
        }
    }

    async loadAll() {
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('/login.html') || path.includes('/Admin/templates/auth/login.html');

        if (!isLoginPage) {
            await this.loadComponent('header', 'header-container');
            await this.loadComponent('footer', 'footer-container');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem Alpine đã được load chưa
    if (window.Alpine) {
        console.log("Alpine is loaded globally before ComponentLoader runs in DOMContentLoaded.");
    } else {
        console.error("Alpine is NOT loaded before ComponentLoader runs in DOMContentLoaded.");
    }
    const loader = new ComponentLoader();
    loader.loadAll();
});
// END OF FILE components.js