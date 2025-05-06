using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Linq.Expressions;

namespace ShopxEX1.Services.Implementations
{
    public class ProductService : IProductService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ProductService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsAsync(ProductFilterDto? filter, int pageNumber, int pageSize)
        {
            // Bắt đầu với IQueryable để xây dựng truy vấn động
            IQueryable<Product> query = _context.Products
                              .Include(p => p.Category); // Include Category để lấy CategoryName cho DTO

            // 1. Áp dụng bộ lọc (Filtering)
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm)); // Có thể cần tìm kiếm case-insensitive
            }
            if (filter.CategoryId.HasValue)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter.SellerID.HasValue)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter.SellerCategoryID.HasValue)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            // 2. Áp dụng sắp xếp (Sorting)
            // Xác định biểu thức sắp xếp mặc định hoặc dựa trên filter.SortBy
            Expression<Func<Product, object>> orderByExpression = p => p.ProductID; // Mặc định sắp xếp theo ID
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "priceasc":
                        orderByExpression = p => p.Price;
                        ascending = true;
                        break;
                    case "pricedesc":
                        orderByExpression = p => p.Price;
                        ascending = false;
                        break;
                    case "nameasc":
                        orderByExpression = p => p.ProductName;
                        ascending = true;
                        break;
                        // Thêm các trường hợp sắp xếp khác nếu cần
                }
            }

            if (ascending)
            {
                query = query.OrderBy(orderByExpression);
            }
            else
            {
                query = query.OrderByDescending(orderByExpression);
            }

            // 3. Áp dụng phân trang (Pagination)
            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();
            
            // 4. Map kết quả sang DTO tóm tắt
            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);

            // 5. Tạo và trả về PagedResult
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        public async Task<PagedResult<ProductSummaryDto>> GetProductsBySellerAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int sellerId)
        {
            if (sellerId == null) throw new Exception($"Bạn không phải là Seller.");
            // Bắt đầu với IQueryable để xây dựng truy vấn động
            var query = _context.Products
                              .Include(p => p.Category) // Include Category để lấy CategoryName cho DTO
                                                        // Không cần Include Seller hay SellerCategory nếu DTO tóm tắt chỉ cần ID
                              .Where(p => p.IsActive) // Chỉ lấy sản phẩm đang hoạt động (ví dụ)
                              .Where(p => p.SellerID == sellerId);

            // 1. Áp dụng bộ lọc (Filtering)
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm)); // Có thể cần tìm kiếm case-insensitive
            }
            if (filter.CategoryId.HasValue)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter.SellerID.HasValue)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter.SellerCategoryID.HasValue)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            // 2. Áp dụng sắp xếp (Sorting)
            // Xác định biểu thức sắp xếp mặc định hoặc dựa trên filter.SortBy
            Expression<Func<Product, object>> orderByExpression = p => p.ProductID; // Mặc định sắp xếp theo ID
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "priceasc":
                        orderByExpression = p => p.Price;
                        ascending = true;
                        break;
                    case "pricedesc":
                        orderByExpression = p => p.Price;
                        ascending = false;
                        break;
                    case "nameasc":
                        orderByExpression = p => p.ProductName;
                        ascending = true;
                        break;
                        // Thêm các trường hợp sắp xếp khác nếu cần
                }
            }

            if (ascending)
            {
                query = query.OrderBy(orderByExpression);
            }
            else
            {
                query = query.OrderByDescending(orderByExpression);
            }

            // 3. Áp dụng phân trang (Pagination)
            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            // 4. Map kết quả sang DTO tóm tắt
            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);

            // 5. Tạo và trả về PagedResult
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        public async Task<PagedResult<ProductSummaryDto>> GetProductsByCategoryAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int categoryId)
        {
            // Bắt đầu với IQueryable để xây dựng truy vấn động
            var query = _context.Products
                              .Include(p => p.Category) // Include Category để lấy CategoryName cho DTO
                                                        // Không cần Include Seller hay SellerCategory nếu DTO tóm tắt chỉ cần ID
                              .Where(p => p.IsActive) // Chỉ lấy sản phẩm đang hoạt động (ví dụ)
                              .Where(p => p.CategoryID == categoryId);

            // 1. Áp dụng bộ lọc (Filtering)
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm)); // Có thể cần tìm kiếm case-insensitive
            }
            if (filter.CategoryId.HasValue)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter.SellerID.HasValue)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter.SellerCategoryID.HasValue)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            // 2. Áp dụng sắp xếp (Sorting)
            // Xác định biểu thức sắp xếp mặc định hoặc dựa trên filter.SortBy
            Expression<Func<Product, object>> orderByExpression = p => p.ProductID; // Mặc định sắp xếp theo ID
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "priceasc":
                        orderByExpression = p => p.Price;
                        ascending = true;
                        break;
                    case "pricedesc":
                        orderByExpression = p => p.Price;
                        ascending = false;
                        break;
                    case "nameasc":
                        orderByExpression = p => p.ProductName;
                        ascending = true;
                        break;
                        // Thêm các trường hợp sắp xếp khác nếu cần
                }
            }

            if (ascending)
            {
                query = query.OrderBy(orderByExpression);
            }
            else
            {
                query = query.OrderByDescending(orderByExpression);
            }

            // 3. Áp dụng phân trang (Pagination)
            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            // 4. Map kết quả sang DTO tóm tắt
            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);

            // 5. Tạo và trả về PagedResult
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        public async Task<ProductDto?> GetProductByIdAsync(int productId)
        {
            var product = await _context.Products
                                    .Include(p => p.Category)   // Cần cho CategoryName
                                    .Include(p => p.Seller)     // Cần cho SellerStoreName
                                    .AsNoTracking() // Dùng AsNoTracking nếu chỉ đọc dữ liệu
                                    .FirstOrDefaultAsync(p => p.ProductID == productId && p.IsActive);

            if (product == null)
            {
                // Có thể ném exception ở đây thay vì trả về null
                // throw new NotFoundException($"Sản phẩm với ID {productId} không tồn tại hoặc không hoạt động.");
                return null;
            }

            return _mapper.Map<ProductDto>(product);
        }
        public async Task<ProductDto> CreateProductAsync(int sellerId, ProductCreateDto createDto)
        {
            // --- Validation quan trọng ---
            // 1. Kiểm tra CategoryID có tồn tại không
            var categoryExists = await _context.Categories.FindAsync(createDto.CategoryID);
            if (categoryExists == null)
            {
                throw new ArgumentException($"Danh mục chung với ID {createDto.CategoryID} không tồn tại.");
            }

            // 2. Kiểm tra SellerCategoryID có tồn tại và thuộc về SellerID này không
            var sellerCategoryValid = await _context.SellerCategories
                                           .FirstOrDefaultAsync(sc => sc.SellerCategoryID == createDto.SellerCategoryID && sc.SellerID == sellerId);
            if (sellerCategoryValid == null)
            {
                throw new ArgumentException($"Danh mục người bán với ID {createDto.SellerCategoryID} không tồn tại hoặc không thuộc về người bán ID {sellerId}.");
            }
            // --- Kết thúc Validation ---

            var product = _mapper.Map<Product>(createDto);

            // Gán các giá trị không có trong DTO
            product.SellerID = sellerId;
            product.CreatedAt = DateTime.UtcNow; // Hoặc DateTime.Now tùy cấu hình múi giờ

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            // Lấy lại dữ liệu vừa tạo để có đầy đủ thông tin (bao gồm cả navigation properties) cho DTO trả về
            // Điều này đảm bảo CategoryName và SellerStoreName có trong DTO trả về
            var createdProduct = await _context.Products
                                    .Include(p => p.Category)
                                    .Include(p => p.Seller)
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(p => p.ProductID == product.ProductID);

            if (createdProduct == null)
            {
                // Trường hợp hiếm gặp, nhưng nên xử lý
                throw new Exception("Không thể lấy lại thông tin sản phẩm vừa tạo.");
            }

            return _mapper.Map<ProductDto>(createdProduct);
        }
        public async Task<bool> UpdateProductAsync(int productId, int sellerId, ProductUpdateDto updateDto)
        {
            var existingProduct = await _context.Products.FindAsync(productId);

            if (existingProduct == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm."); // Hoặc dùng NotFoundException tùy chỉnh
            }

            // Kiểm tra quyền sở hữu
            if (existingProduct.SellerID != sellerId)
            {
                throw new UnauthorizedAccessException($"Bạn không có quyền cập nhật sản phẩm.");
            }

            // --- Validation FKs nếu cần ---
            if (existingProduct.CategoryID != updateDto.CategoryID)
            {
                var categoryExists = await _context.Categories.AnyAsync(c => c.CategoryID == updateDto.CategoryID);
                if (!categoryExists) throw new ArgumentException($"Danh mục chung với ID {updateDto.CategoryID} không tồn tại.");
            }
            if (existingProduct.SellerCategoryID != updateDto.SellerCategoryID)
            {
                var sellerCategoryValid = await _context.SellerCategories
                                           .AnyAsync(sc => sc.SellerCategoryID == updateDto.SellerCategoryID && sc.SellerID == sellerId);
                if (!sellerCategoryValid) throw new ArgumentException($"Danh mục người bán với ID {updateDto.SellerCategoryID} không tồn tại hoặc không thuộc về người bán ID {sellerId}.");
            }
            // --- Kết thúc Validation FKs ---


            // Map các giá trị từ DTO update vào entity đã tồn tại
            _mapper.Map(updateDto, existingProduct);

            // EF Core tự động theo dõi thay đổi nếu entity được lấy bằng FindAsync hoặc FirstOrDefaultAsync (không có AsNoTracking)
            // _context.Products.Update(existingProduct); // Không cần thiết nếu đã tracking

            return await _context.SaveChangesAsync() > 0;
        }
        public async Task<bool> DeleteProductAsync(int productId, int sellerId, string status = "notActive")
        {
            var existingProduct = await _context.Products.FindAsync(productId);

            if (existingProduct == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID {productId}."); // Hoặc dùng NotFoundException tùy chỉnh
            }

            // Kiểm tra quyền sở hữu
            if (existingProduct.SellerID != sellerId)
            {
                throw new UnauthorizedAccessException($"Người bán ID {sellerId} không có quyền xóa sản phẩm ID {productId}.");
            }

            
            if (status == "delete")
            {
                _context.Products.Remove(existingProduct);
                return await _context.SaveChangesAsync() > 0;
            }
            else
            {
                if (existingProduct.IsActive) // Chỉ thực hiện nếu đang active
                {
                    // Thực hiện Soft Delete
                    existingProduct.IsActive = false;
                    // _context.Products.Update(existingProduct); // Không cần thiết nếu tracking
                    return await _context.SaveChangesAsync() > 0;
                }
                return true;
            }
        }
    }
}
