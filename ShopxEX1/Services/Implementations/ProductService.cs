using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Security.Claims;
using System.Reflection.Metadata.Ecma335;

namespace ShopxEX1.Services.Implementations
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ProductService : IProductService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GetID getID;
        private readonly ILogger _logger;

        public ProductService(AppDbContext context, IMapper mapper, IHttpContextAccessor httpContextAccessor, ILogger<ProductService> logger)
        {
            _context = context;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định ID người dùng từ thông tin xác thực.");
            }
            return userId;
        }

        private bool IsAdmin()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            return user?.IsInRole("Admin") ?? false;
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsAsync(ProductFilterDto? filter, int pageNumber, int pageSize, bool customerPage = false)
        {
            IQueryable<Product> query = null;
            if (customerPage)
            {
                query = _context.Products
                                  .Include(p => p.Category)
                                  .Include(p => p.Seller)
                                  .Where(p => p.IsActive == true);
            }                   
            else
            {
                query = _context.Products
                                  .Include(p => p.Category)
                                  .Include(p => p.Seller);
            }

            if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
            }
            if (filter?.CategoryId.HasValue == true)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter?.SellerID.HasValue == true)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter?.SellerCategoryID.HasValue == true)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter?.MinPrice.HasValue == true)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter?.MaxPrice.HasValue == true)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            Expression<Func<Product, object>> orderByExpression = p => p.ProductID;
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter?.SortBy))
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
                    case "createdatdesc":
                        orderByExpression = p => p.CreatedAt;
                        ascending = false;
                        break;
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

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();
            
            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        // Cập nhật method signature để hỗ trợ tham số includeInactive (thêm overload mới)
public async Task<ProductDto?> GetProductByIdAsync(int productId, bool includeInactive = false)
{
    var query = _context.Products
                        .Include(p => p.Category)
                        .Include(p => p.Seller)
                        .AsNoTracking();
    
    // Nếu includeInactive = false, chỉ lấy sản phẩm đang hoạt động
    if (!includeInactive)
    {
        query = query.Where(p => p.IsActive);
    }
                        
    var product = await query.FirstOrDefaultAsync(p => p.ProductID == productId);

    if (product == null)
    {
        return null;
    }

    var productDto = _mapper.Map<ProductDto>(product);
    // Đồng bộ Status với IsActive để đảm bảo tính nhất quán
    productDto.Status = product.IsActive ? "active" : "inactive";
    return productDto;
}

// Giữ lại phương thức cũ để tương thích ngược
public async Task<ProductDto?> GetProductByIdAsync(int productId)
{
    return await GetProductByIdAsync(productId, false);
}
        public async Task<ProductDto> CreateProductAsync(int sellerId, ProductCreateDto createDto)
        {
            var categoryExists = await _context.Categories.FindAsync(createDto.CategoryID);
            if (categoryExists == null)
            {
                throw new ArgumentException($"Danh mục chung với ID {createDto.CategoryID} không tồn tại.");
            }

            var sellerCategoryValid = await _context.SellerCategories
                                           .FirstOrDefaultAsync(sc => sc.SellerCategoryID == createDto.SellerCategoryID && sc.SellerID == sellerId);
            if (sellerCategoryValid == null)
            {
                throw new ArgumentException($"Danh mục người bán với ID {createDto.SellerCategoryID} không tồn tại hoặc không thuộc về người bán ID {sellerId}.");
            }

            var product = _mapper.Map<Product>(createDto);
            product.SellerID = sellerId;
            product.CreatedAt = DateTime.UtcNow;

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            var createdProduct = await _context.Products
                                    .Include(p => p.Category)
                                    .Include(p => p.Seller)
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(p => p.ProductID == product.ProductID);

            if (createdProduct == null)
            {
                throw new Exception("Không thể lấy lại thông tin sản phẩm vừa tạo.");
            }

            return _mapper.Map<ProductDto>(createdProduct);
        }

        public async Task<bool> UpdateProductAsync(int productId, int sellerId, ProductUpdateDto updateDto)
        {
            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.ProductID == productId);

                if (product == null)
                {
                    return false;
                }

                // Nếu sellerId = 0 là Admin, bỏ qua kiểm tra quyền
                if (sellerId != 0 && product.SellerID != sellerId)
                {
                    return false;
                }

                // Cập nhật các trường bắt buộc
                product.ProductName = updateDto.ProductName;
                product.Price = updateDto.Price;
                product.StockQuantity = updateDto.StockQuantity;
                product.IsActive = updateDto.IsActive;
                product.CategoryID = updateDto.CategoryID;
                product.SellerCategoryID = updateDto.SellerCategoryID;

                // Cập nhật các trường có thể null
                if (!string.IsNullOrEmpty(updateDto.Description))
                {
                    product.Description = updateDto.Description;
                }
                if (!string.IsNullOrEmpty(updateDto.ImageURL))
                {
                    product.ImageURL = updateDto.ImageURL;
                }

                product.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<bool> DeleteProductAsync(int productId, int sellerId, string status = "notActive")
        {
            var existingProduct = await _context.Products.FindAsync(productId);

            if (existingProduct == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID {productId}.");
            }

            if (!IsAdmin())
            {
                if (existingProduct.SellerID != sellerId)
                {
                    throw new UnauthorizedAccessException($"Người bán ID {sellerId} không có quyền xóa sản phẩm ID {productId}.");
                }
            }

            if (status == "delete")
            {
                _context.Products.Remove(existingProduct);
                return await _context.SaveChangesAsync() > 0;
            }
            else if (status == "notactive")
            {
                if (existingProduct.IsActive)
                {
                    existingProduct.IsActive = false;
                    return await _context.SaveChangesAsync() > 0;
                }
                return true;
            }
            else if (status == "active")
            {
                if (!(existingProduct.IsActive))
                {
                    existingProduct.IsActive = true;
                    return await _context.SaveChangesAsync() > 0;
                }
                return true;
            }
            return false;
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsBySellerAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int userId)
{
    IQueryable<Product> query = _context.Products
                      .Include(p => p.Category);
                      
    // Lọc theo sellerId
    query = query.Where(p => p.SellerID == userId);

    // Chỉ lọc theo IsActive nếu không yêu cầu bao gồm sản phẩm không hoạt động
    if (filter?.IncludeInactive != true)
    {
        query = query.Where(p => p.IsActive);
    }

    // Các điều kiện lọc khác
    if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
    {
        query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
    }
    if (filter?.CategoryId.HasValue == true)
    {
        query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
    }
    if (filter?.SellerCategoryID.HasValue == true)
    {
        query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
    }
    if (filter?.MinPrice.HasValue == true)
    {
        query = query.Where(p => p.Price >= filter.MinPrice.Value);
    }
    if (filter?.MaxPrice.HasValue == true)
    {
        query = query.Where(p => p.Price <= filter.MaxPrice.Value);
    }

    var totalCount = await query.CountAsync();
    var items = await query
                        .Skip((pageNumber - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();
    
    var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
    return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
}

        public async Task<PagedResult<ProductSummaryDto>> GetProductsByCategoryAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int categoryId)
        {
            IQueryable<Product> query = _context.Products
                              .Include(p => p.Category)
                              .Where(p => p.IsActive == true)
                              .Where(p => p.CategoryID == categoryId);

            if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
            }
            if (filter?.SellerID.HasValue == true)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter?.SellerCategoryID.HasValue == true)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter?.MinPrice.HasValue == true)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter?.MaxPrice.HasValue == true)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();
            
            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        public async Task<List<ProductSummaryDto>> GetBestSellingProductsAsync(int count = 5)
        {
            if (count <= 0)
            {
                _logger.LogWarning("GetBestSellingProductsAsync: Tham số count không hợp lệ ({RequestedCount}), sử dụng giá trị mặc định là 5.", count);
                count = 5;
            }

            _logger.LogInformation("Bắt đầu lấy {Count} sản phẩm bán chạy nhất.", count);

            // Bước 1: Tính toán doanh số (giữ nguyên)
            var productSales = await _context.OrderDetails
                .GroupBy(od => od.ProductID)
                .Select(g => new
                {
                    ProductID = g.Key,
                    TotalQuantitySold = g.Sum(od => od.Quantity)
                })
                .OrderByDescending(ps => ps.TotalQuantitySold) // Sắp xếp theo số lượng bán giảm dần
                .Take(count) // Lấy top 'count' sản phẩm
                .ToListAsync();

            if (!productSales.Any())
            {
                _logger.LogInformation("Không tìm thấy sản phẩm nào được bán.");
                return new List<ProductSummaryDto>();
            }

            // Lấy thông tin chi tiết của các sản phẩm bán chạy này
            var bestSellingProductIds = productSales.Select(ps => ps.ProductID).ToList();
            _logger.LogDebug("Các ProductID bán chạy nhất được xác định: {ProductIds}", string.Join(", ", bestSellingProductIds));

            // Bước 2: Xây dựng Expression Tree cho mệnh đề WHERE động
            ParameterExpression parameter = Expression.Parameter(typeof(Product), "p"); // Tham số đầu vào cho lambda: (Product p)
            Expression? finalFilterExpression = null;

            if (bestSellingProductIds.Any())
            {
                // Xây dựng phần (p.ProductID == id1 || p.ProductID == id2 || ...)
                MemberExpression productIdProperty = Expression.Property(parameter, nameof(Product.ProductID));
                Expression? orChainExpression = null;

                foreach (var id in bestSellingProductIds)
                {
                    ConstantExpression idConstant = Expression.Constant(id);
                    BinaryExpression equalsExpression = Expression.Equal(productIdProperty, idConstant); // p.ProductID == id

                    if (orChainExpression == null)
                    {
                        orChainExpression = equalsExpression;
                    }
                    else
                    {
                        orChainExpression = Expression.OrElse(orChainExpression, equalsExpression); // (prevExpression) OR (p.ProductID == id)
                    }
                }

                // Xây dựng phần p.IsActive == true
                MemberExpression isActiveProperty = Expression.Property(parameter, nameof(Product.IsActive));
                ConstantExpression trueConstant = Expression.Constant(true);
                BinaryExpression isActiveCheck = Expression.Equal(isActiveProperty, trueConstant); // p.IsActive == true

                // Kết hợp hai phần: (orChainExpression) AND (isActiveCheck)
                if (orChainExpression != null) // Đảm bảo có ít nhất một ID
                {
                    finalFilterExpression = Expression.AndAlso(orChainExpression, isActiveCheck);
                }
                else // Trường hợp list ID rỗng (mặc dù đã kiểm tra productSales.Any() ở trên)
                {
                    // Không nên xảy ra nếu productSales.Any() là true, nhưng để an toàn
                    finalFilterExpression = Expression.Constant(false); // p => false
                }
            }
            else
            {
                // Nếu không có ID nào (không nên xảy ra ở đây vì đã kiểm tra productSales.Any())
                // Tạo một biểu thức luôn trả về false để không có sản phẩm nào được chọn
                finalFilterExpression = Expression.Constant(false); // p => false
            }

            // Tạo Lambda Expression hoàn chỉnh: p => ( (p.ProductID == id1 || ...) AND p.IsActive )
            Expression<Func<Product, bool>> productFilterLambda = Expression.Lambda<Func<Product, bool>>(finalFilterExpression ?? Expression.Constant(false), parameter);
            _logger.LogDebug("Expression tree filter được tạo: {ExpressionTree}", productFilterLambda.ToString());


            // Bước 3: Lấy thông tin sản phẩm với filter động
            var productsQuery = _context.Products.Where(productFilterLambda);

            var products = await productsQuery
                .Include(p => p.Category)
                .Include(p => p.Seller)
                .AsNoTracking()
                .ToListAsync();
            _logger.LogInformation("Đã truy vấn được {ProductCount} sản phẩm chi tiết từ DB.", products.Count);


            // Bước 4: Sắp xếp lại danh sách products theo đúng thứ tự bán chạy và map sang DTO (giữ nguyên)
            var sortedProducts = products
                .OrderBy(p => bestSellingProductIds.IndexOf(p.ProductID))
                .ToList();

            return _mapper.Map<List<ProductSummaryDto>>(sortedProducts);
        }
        public async Task<List<ProductSummaryDto>> GetNewestProductsAsync(int count = 20)
        {
            if (count <= 0)
            {
                count = 20; // Giá trị mặc định an toàn
            }

            var newestProducts = await _context.Products
                .Where(p => p.IsActive) // Chỉ lấy sản phẩm còn active
                .OrderByDescending(p => p.CreatedAt) // Sắp xếp theo ngày tạo giảm dần (mới nhất lên đầu)
                .Take(count) // Lấy top 'count' sản phẩm
                .Include(p => p.Category) // Include thông tin cần thiết cho ProductSummaryDto
                .Include(p => p.Seller)   // Include thông tin cần thiết cho ProductSummaryDto
                .AsNoTracking()
                .ToListAsync();

            return _mapper.Map<List<ProductSummaryDto>>(newestProducts);
        }
    }
}
