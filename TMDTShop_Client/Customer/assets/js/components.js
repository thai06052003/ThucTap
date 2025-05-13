// Component Loader
class ComponentLoader {
    constructor() {
        this.components = {
            header: '/Customer/components/header/header.html', // Đảm bảo đường dẫn đúng
            footer: '/Customer/components/footer/footer.html'  // Đảm bảo đường dẫn đúng
        };
        // API_BASE_URL và setSession sẽ được lấy từ index.js (global)
    }

    async loadComponent(componentName, targetId) {
        try {
            const response = await fetch(this.components[componentName]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.innerHTML = html;

                if (window.Alpine && Alpine.initTree) {
                    Alpine.initTree(targetElement);
                }
                if (window.Alpine && Alpine.start) {
                    Alpine.start();
                }

                // Sau khi header được load, gọi hàm khởi tạo từ index.js
                if (componentName === 'header') {
                    if (typeof window.initializeHeaderFunctionality === 'function') {
                        window.initializeHeaderFunctionality(); // Gọi hàm global từ index.js
                    } else {
                        console.warn('initializeHeaderFunctionality function not found. Make sure it is defined globally in index.js');
                    }
                }
            } else {
                console.error(`Target element with ID '${targetId}' not found for component '${componentName}'.`);
            }
        } catch (error) {
            console.error(`Error loading ${componentName}:`, error);
        }
    }

    async loadAll() {
        const path = window.location.pathname;
        // Điều chỉnh điều kiện kiểm tra trang login cho phù hợp
        const isLoginPage = path.endsWith('/login.html') || path.includes('/Admin/templates/auth/login.html');

        if (!isLoginPage) {
            await this.loadComponent('header', 'header-container');
            await this.loadComponent('footer', 'footer-container');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loader = new ComponentLoader();
    loader.loadAll();
});