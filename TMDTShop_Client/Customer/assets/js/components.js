// Component Loader
class ComponentLoader {
    constructor() {
        this.components = {
            header: '/Customer/components/header/header.html',
            footer: '/Customer/components/footer/footer.html'
        };
    }

    // Load component into target element
    async loadComponent(componentName, targetId) {
        try {
            const response = await fetch(this.components[componentName]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            
            // Insert the HTML
            document.getElementById(targetId).innerHTML = html;

            // Re-init AlpineJS for dynamic content
            if (window.Alpine && Alpine.initTree) {
                Alpine.initTree(document.getElementById(targetId));
            }
            // Đảm bảo Alpine nhận diện mọi component động (Alpine 3+)
            if (window.Alpine && Alpine.init) {
                setTimeout(() => Alpine.init(), 0);
            }

            // Xử lý các sự kiện sau khi load component
            if (componentName === 'header') {
                // Gọi attachLogoutEvent nếu có
                if (typeof attachLogoutEvent === 'function') {
                    attachLogoutEvent();
                }
                // Gọi cập nhật tên tài khoản nếu có hàm
                if (typeof displayAccountName === 'function') {
                    displayAccountName();
                }
            }
        } catch (error) {
            console.error(`Error loading ${componentName}:`, error);
        }
    }

    // Helper to load a JS file dynamically
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    // Load all components
    async loadAll() {
        // Don't load header/footer on login page
        if (!window.location.pathname.includes('/login')) {
            await this.loadComponent('header', 'header-container');
            await this.loadComponent('footer', 'footer-container');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ComponentLoader();
    loader.loadAll();
}); 