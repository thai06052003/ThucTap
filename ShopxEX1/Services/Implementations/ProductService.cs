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

        public ProductService(AppDbContext context, IMapper mapper, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
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
        public async Task<ProductDto?> GetProductByIdAsync(int productId)
        {
            var product = await _context.Products
                                    .Include(p => p.Category)
                                    .Include(p => p.Seller)
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(p => p.ProductID == productId && p.IsActive);

            if (product == null)
            {
                return null;
            }

            return _mapper.Map<ProductDto>(product);
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
    }
}
