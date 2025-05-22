using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Helpers;
using ShopxEX1.Services;
using System.Security.Claims;
using ShopxEX1.Data;
using Microsoft.Extensions.DependencyInjection;
using ShopxEX1.Models;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly GetID _getId;
        private readonly ILogger<ProductsController> _logger; // Thêm logger để ghi log

        public ProductsController(IProductService productService, GetID getId ,ILogger<ProductsController> logger)
        {
            _productService = productService;
            _getId = getId;
            _logger = logger;
        }
        /// <summary>
/// Lấy danh sách sản phẩm theo shop (có kiểm tra trạng thái shop).
/// </summary>
/// <param name="sellerId">ID của shop cần xem sản phẩm</param>
/// <param name="filter">Tiêu chí lọc sản phẩm</param>
/// <param name="pageNumber">Số trang (mặc định 1)</param>
/// <param name="pageSize">Số lượng mục trên trang (mặc định 10)</param>
/// <returns>Danh sách sản phẩm của shop và thông tin shop</returns>
[HttpGet("shop/{sellerId}")]
public async Task<IActionResult> GetProductsByShopId(int sellerId, 
    [FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, 
    [FromQuery] string pageSizeInput = "10")
{
    const int MaxPageSize = 100;
    int pageSize;

    if (!int.TryParse(pageSizeInput, out pageSize))
    {
        pageSize = MaxPageSize; // Đặt về mặc định
    }

    // Đảm bảo pageNumber và pageSize hợp lệ
    if (pageNumber < 1) pageNumber = 1;
    if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

    try
    {
        // Lấy AppDbContext từ DI container
        using var scope = HttpContext.RequestServices.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
        // Kiểm tra thông tin seller
        var seller = await dbContext.Sellers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SellerID == sellerId);
            
        if (seller == null)
        {
            return NotFound(new { message = "Không tìm thấy cửa hàng" });
        }
        
        // Nếu shop đang bảo trì (IsActive = false)
        if (!seller.IsActive)
        {
            return Ok(new {
                shop = new {
                    sellerId = seller.SellerID,
                    shopName = seller.ShopName,
                    status = "maintenance",
                    statusName = "Đang bảo trì",
                    canOrder = false
                },
                products = new object[] { } // Không trả về sản phẩm khi đang bảo trì
            });
        }
        
        // Nếu shop đang hoạt động, lấy sản phẩm
        var result = await _productService.GetProductsBySellerAsync(filter, pageNumber, pageSize, sellerId);
        
        var response = new {
            shop = new {
                sellerId = seller.SellerID,
                shopName = seller.ShopName,
                status = "active",
                statusName = "Đang hoạt động",
                canOrder = true
            },
            products = result
        };
        
        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách sản phẩm theo shop.");
        return StatusCode(500, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
    }
}

        /// <summary>
        /// Lấy danh sách sản phẩm có phân trang và lọc (trang admin).
        /// </summary>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
        [HttpGet]
        public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetProducts([FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10"){
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize))
            {
                pageSize = MaxPageSize; // Đặt về mặc định
            }

            // Đảm bảo pageNumber và pageSize hợp lệ
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

            try
            {
                var result = await _productService.GetProductsAsync(filter, pageNumber, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách sản phẩm.");
                // Trả về lỗi chung cho client, chi tiết lỗi đã được log
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
            }
        }
        /// <summary>
        /// Lấy danh sách sản phẩm có phân trang và lọc (trang customer).
        /// </summary>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
        [HttpGet("Customer")]
        public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetProductsByCustomerPage([FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10")
        {
            bool customerPage = true;
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize))
            {
                pageSize = MaxPageSize; // Đặt về mặc định
            }

            // Đảm bảo pageNumber và pageSize hợp lệ
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

            try
            {
                var result = await _productService.GetProductsAsync(filter, pageNumber, pageSize, customerPage);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách sản phẩm.");
                // Trả về lỗi chung cho client, chi tiết lỗi đã được log
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
            }
        }
        /// <summary>
        /// Lấy danh sách sản phẩm có phân trang và lọc.
        /// </summary>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
       [HttpGet]
[Authorize(Roles = "Seller")]
[Route("/api/seller/products")]
[HttpGet]
[Authorize(Roles = "Seller")]
[Route("/api/seller/products")]
public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetProductsBySeller([FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10", [FromQuery] bool includeInactive = true)
{
    int? sellerId = _getId.GetSellerId();
    if (!sellerId.HasValue) throw new Exception($"Bạn không phải là Seller.");

    const int MaxPageSize = 100;
    int pageSize;

    if (!int.TryParse(pageSizeInput, out pageSize))
    {
        pageSize = MaxPageSize; // Đặt về mặc định
    }

    if (pageNumber < 1) pageNumber = 1;
    if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

    try
    {
        // Đảm bảo filter không null
        filter ??= new ProductFilterDto();
        
        // Gán SellerID vào filter
        filter.SellerID = sellerId.Value;
        
        // Đây là dòng quan trọng! Đảm bảo includeInactive được truyền vào filter
        filter.IncludeInactive = includeInactive;
        
        var result = await _productService.GetProductsBySellerAsync(filter, pageNumber, pageSize, sellerId.Value);
        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách sản phẩm theo seller.");
        return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
    }
}
        /// <summary>
        /// Lấy danh sách sản phẩm có phân trang và lọc.
        /// </summary>
        /// <param name="categoryId">ID danh mục muốn lọc</param>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
        [HttpGet("Category/{categoryId}")]
        public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetProductsByCategory(int categoryId, [FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10")
        {
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize))
            {
                pageSize = MaxPageSize; // Đặt về mặc định
            }

            // Đảm bảo pageNumber và pageSize hợp lệ
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

            try
            {
                var result = await _productService.GetProductsByCategoryAsync(filter, pageNumber, pageSize, categoryId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách sản phẩm.");
                // Trả về lỗi chung cho client, chi tiết lỗi đã được log
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết của một sản phẩm theo ID.
        /// </summary>
        /// <param name="productId">ID của sản phẩm.</param>
        /// <returns>Chi tiết sản phẩm.</returns>
[HttpGet("{productId}")]
public async Task<ActionResult<ProductDto>> GetProductById(int productId, [FromQuery] bool includeInactive = false)
{
    try
    {
        // Kiểm tra quyền truy cập - chỉ Seller hoặc Admin mới thấy sản phẩm đã ngừng bán
        bool isSellerOrAdmin = User.Identity != null && User.Identity.IsAuthenticated && 
                              (User.IsInRole("Seller") || User.IsInRole("Admin"));
        
        // Nếu là seller, cần kiểm tra xem sản phẩm có thuộc về họ không
        int? sellerId = _getId.GetSellerId();
        
        // Chỉ lấy sản phẩm không hoạt động khi:
        // 1. Người dùng yêu cầu bằng tham số includeInactive=true
        // 2. Người dùng có quyền (là Seller hoặc Admin)
        bool showInactive = includeInactive && isSellerOrAdmin;
        
        var product = await _productService.GetProductByIdAsync(productId, showInactive);

        if (product == null)
        {   
            return NotFound("Không tìm thấy sản phẩm.");
        }

        // Nếu sản phẩm không active, kiểm tra xem người dùng có phải seller của sản phẩm này không
        if (product.Status == "inactive" || !product.IsActive)
        {
            // Kiểm tra cả Status và IsActive để đảm bảo tính nhất quán
            if (sellerId.HasValue && product.SellerID != sellerId.Value && !User.IsInRole("Admin"))
            {
                // Nếu không phải admin và không phải seller của sản phẩm này
                return NotFound("Không tìm thấy sản phẩm.");
            }
        }

        return Ok(product);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi xảy ra khi lấy chi tiết sản phẩm.");
        return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
    }
}

/// <summary>
/// Tạo một sản phẩm mới (yêu cầu xác thực là Seller).
/// </summary>
/// <param name="createDto">Thông tin sản phẩm cần tạo.</param>
/// <returns>Sản phẩm vừa được tạo.</returns>
[HttpPost]
[Authorize(Roles = "Seller")]
public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] ProductCreateDto createDto)
{
    int? sellerId = _getId.GetSellerId();
            if (!sellerId.HasValue) throw new Exception($"Bạn không phải là Seller.");

            // Gọi service với sellerId
            try
            {
                var createdProduct = await _productService.CreateProductAsync(sellerId.Value, createDto);
                return CreatedAtAction(nameof(GetProductById), new { productId = createdProduct.ProductID }, createdProduct);
            }
            // ... (Xử lý lỗi ArgumentException, Exception khác) ...
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo sản phẩm.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình tạo sản phẩm.");
            }
        }

        /// <summary>
        /// Cập nhật thông tin sản phẩm (yêu cầu xác thực là Seller sở hữu sản phẩm).
        /// </summary>
        /// <param name="productId">ID sản phẩm cần cập nhật.</param>
        /// <param name="updateDto">Thông tin cập nhật.</param>
        /// <returns>Không có nội dung nếu thành công.</returns>
        [HttpPut("{productId:int}")]
[Authorize(Roles = "Admin,Seller")]
public async Task<IActionResult> UpdateProduct(int productId, [FromBody] ProductUpdateDto updateDto)
{
    int? sellerId = _getId.GetSellerId();
    if (!sellerId.HasValue && !User.IsInRole("Admin")) 
        throw new Exception($"Bạn không có quyền cập nhật sản phẩm.");

    try
    {
        // Kiểm tra sản phẩm có tồn tại không (bao gồm cả sản phẩm không hoạt động)
        var product = await _productService.GetProductByIdAsync(productId, true); // includeInactive = true
        
        if (product == null)
        {
            return NotFound($"Không tìm thấy sản phẩm có ID: {productId}");
        }
        
        // Kiểm tra quyền - nếu không phải Admin và không phải seller sở hữu sản phẩm
        if (!User.IsInRole("Admin") && product.SellerID != sellerId.Value)
        {
            return Forbid("Bạn không có quyền cập nhật sản phẩm này vì không thuộc về bạn.");
        }

        // Thực hiện cập nhật
        bool result = await _productService.UpdateProductAsync(productId, sellerId.Value, updateDto);
        
        if (result)
        {
            // Lấy lại sản phẩm đã cập nhật để trả về
            var updatedProduct = await _productService.GetProductByIdAsync(productId, true);
            return Ok(updatedProduct);
        }
        else
        {
            return StatusCode(500, "Không thể cập nhật sản phẩm.");
        }
    }
    catch (KeyNotFoundException ex)
    {
        _logger.LogWarning("Không tìm thấy sản phẩm ID {ProductId} để cập nhật.", productId);
        return NotFound(ex.Message);
    }
    catch (UnauthorizedAccessException ex)
    {
        _logger.LogWarning("Không có quyền cập nhật sản phẩm ID {ProductId}.", productId);
        return Forbid();
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning(ex, "Lỗi ArgumentException khi cập nhật sản phẩm ID {ProductId}.", productId);
        return BadRequest(ex.Message);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi xảy ra khi cập nhật sản phẩm ID {ProductId}.", productId);
        return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình cập nhật sản phẩm.");
    }
}

        /// <summary>
/// Xóa, vô hiệu hóa hoặc kích hoạt lại sản phẩm (yêu cầu xác thực là Seller sở hữu sản phẩm).
/// </summary>
/// <param name="productId">ID sản phẩm cần thao tác.</param>
/// <param name="status">
///     Hành động: 
///     "delete" - xóa cứng (chỉ Admin), 
///     "notactive" - vô hiệu hóa (mặc định),  
///     "active" - kích hoạt lại
/// </param>
/// <returns>Không có nội dung nếu thành công.</returns>
[HttpDelete("{productId:int}")]
[Authorize(Roles = "Seller, Admin")]
public async Task<IActionResult> DeleteProduct(int productId, [FromQuery] string status = "notactive")
{
    try
    {
        int? sellerId = _getId.GetSellerId();
        int actualSellerId = sellerId ?? 0; // 0 cho Admin
        
        // Kiểm tra quyền xóa cứng - chỉ Admin mới được
        if (sellerId.HasValue && status.ToLowerInvariant() == "delete")
        {
            return Forbid("Chỉ Admin mới có quyền xóa cứng sản phẩm.");
        }

        // Chuẩn hóa status để tránh lỗi do viết hoa/thường
        status = status.ToLowerInvariant();
        
        // Kiểm tra giá trị status hợp lệ
        if (status != "delete" && status != "notactive" && status != "active")
        {
            return BadRequest("Giá trị tham số 'status' không hợp lệ. Các giá trị hợp lệ: 'delete', 'notactive', 'active'.");
        }

        // Trước khi xóa, kiểm tra sản phẩm có tồn tại không và thuộc seller không
        var product = await _productService.GetProductByIdAsync(productId, true);
        if (product == null)
        {
            return NotFound($"Không tìm thấy sản phẩm với ID {productId}.");
        }
        
        // Nếu là Seller (không phải Admin) thì phải kiểm tra quyền sở hữu
        if (sellerId.HasValue && product.SellerID != sellerId.Value)
        {
            return Forbid("Bạn không có quyền thay đổi trạng thái sản phẩm này vì không thuộc về bạn.");
        }

        // Thực hiện thay đổi trạng thái
        await _productService.DeleteProductAsync(productId, actualSellerId, status);
        
        // Trả về thông báo phù hợp với trạng thái
        switch (status)
        {
            case "delete":
                return Ok(new { success = true, message = "Sản phẩm đã được xóa vĩnh viễn." });
            case "notactive":
                return Ok(new { success = true, message = "Sản phẩm đã được vô hiệu hóa." });
            case "active":
                return Ok(new { success = true, message = "Sản phẩm đã được kích hoạt lại." });
            default:
                return NoContent();
        }
    }
    catch (KeyNotFoundException ex)
    {
        _logger.LogWarning("Không tìm thấy sản phẩm để thay đổi trạng thái.");
        return NotFound(ex.Message);
    }
    catch (UnauthorizedAccessException ex)
    {
        _logger.LogWarning("Không có quyền thay đổi trạng thái sản phẩm.");
        return Forbid();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi xảy ra khi thay đổi trạng thái sản phẩm (status: {Status}).", status);
        return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
    }
}
        [HttpGet("best-selling")]
        [AllowAnonymous] // Hoặc [Authorize] tùy theo yêu cầu
        public async Task<ActionResult<List<ProductSummaryDto>>> GetBestSelling(int count = 5)
        {
            try
            {
                var products = await _productService.GetBestSellingProductsAsync(count);
                if (products == null || !products.Any())
                {
                    return NotFound("Không tìm thấy sản phẩm bán chạy nào.");
                }
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy sản phẩm bán chạy nhất.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi máy chủ nội bộ.");
            }
        }

        [HttpGet("newest")]
        [AllowAnonymous] // Hoặc [Authorize] tùy theo yêu cầu
        public async Task<ActionResult<List<ProductSummaryDto>>> GetNewest(int count = 20)
        {
            try
            {
                var products = await _productService.GetNewestProductsAsync(count);
                if (products == null || !products.Any())
                {
                    return NotFound("Không tìm thấy sản phẩm mới nào.");
                }
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy sản phẩm mới nhất.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi máy chủ nội bộ.");
            }
        }
    }
}
