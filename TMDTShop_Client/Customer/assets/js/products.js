async function showProducts(category) {
    const categoryProductsSection = document.getElementById('category-products');
    const categoryTitle = document.getElementById('category-title');
    const productsList = document.getElementById('products-list');
    const loadingSpinner = document.getElementById('loading-spinner');
  
    productsList.innerHTML = '';
    loadingSpinner.classList.remove('hidden');
  
    categoryTitle.textContent = `Sản phẩm ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  
    try {
      const response = await fetch(`https://your-api-endpoint/products?category=${category}`);
      const products = await response.json();
  
      loadingSpinner.classList.add('hidden');
  
      if (products.length === 0) {
        productsList.innerHTML = '<p class="col-span-full text-center text-gray-500">Không có sản phẩm nào trong danh mục này.</p>';
      } else {
        products.forEach(product => {
          const productHTML = `
            <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition product-card">
              <div class="relative">
                <img src="${product.image}" class="w-full h-48 object-cover">
                ${product.discount ? `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">${product.discount}</div>` : ''}
                <div class="product-actions absolute bottom-0 left-0 right-0 bg-white/90 flex justify-center space-x-2 p-2">
                  <button class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                    <i class="far fa-heart text-sm"></i>
                  </button>
                  <button class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                    <i class="fas fa-search text-sm"></i>
                  </button>
                  <button class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                    <i class="fas fa-shopping-cart text-sm"></i>
                  </button>
                </div>
              </div>
              <div class="p-4">
                <a href="#" class="text-gray-800 hover:text-blue-600 font-medium block mb-1">${product.name}</a>
                <div class="flex items-center mb-2">
                  <div class="flex text-yellow-400 text-sm">
                    ${renderStars(product.rating)}
                  </div>
                  <span class="text-gray-500 text-xs ml-1">(${product.reviews})</span>
                </div>
                <div class="flex items-center">
                  <span class="text-red-500 font-bold">${product.price}</span>
                  ${product.originalPrice ? `<span class="text-gray-500 text-sm line-through ml-2">${product.originalPrice}</span>` : ''}
                </div>
              </div>
            </div>
          `;
          productsList.insertAdjacentHTML('beforeend', productHTML);
        });
      }
  
      categoryProductsSection.classList.remove('hidden');
      categoryProductsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
      loadingSpinner.classList.add('hidden');
      productsList.innerHTML = '<p class="col-span-full text-center text-gray-500">Có lỗi xảy ra khi tải sản phẩm.</p>';
      categoryProductsSection.classList.remove('hidden');
      categoryProductsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }