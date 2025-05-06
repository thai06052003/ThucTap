using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Helpers;
using ShopxEX1.Services;
using System.Security.Claims;

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
        /// Lấy danh sách sản phẩm có phân trang và lọc.
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
        /// Lấy danh sách sản phẩm có phân trang và lọc.
        /// </summary>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
        [HttpGet]
        [Authorize(Roles = "Seller")]
        [Route("/api/seller/products")]
        public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetProductsBySeller([FromQuery] ProductFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10")
        {
            int sellerId = _getId.GetSellerId();
            if (sellerId == null) throw new Exception($"Bạn không phải là Seller.");
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
                var result = await _productService.GetProductsBySellerAsync(filter, pageNumber, pageSize, sellerId);
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
        /// <param name="categoryId">ID danh mục muốn lọc</param>
        /// <param name="filter">Tiêu chí lọc sản phẩm.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách sản phẩm tóm tắt có phân trang.</returns>
        [HttpGet("/category/{categoryId}")]
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
        public async Task<ActionResult<ProductDto>> GetProductById(int productId)
        {
            try
            {
                var product = await _productService.GetProductByIdAsync(productId);

                if (product == null)
                {   
                    return NotFound("Không tìm thấy sản phẩm.");
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

            int sellerId = _getId.GetSellerId();

            // Gọi service với sellerId
            try
            {
                var createdProduct = await _productService.CreateProductAsync(sellerId, createDto);
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
        [HttpPut("{productId:int}")] // Endpoint: PUT /api/products/5
        [Authorize(Roles = "Seller")] // Chỉ Seller mới được cập nhật
        public async Task<IActionResult> UpdateProduct(int productId, [FromBody] ProductUpdateDto updateDto)
        {
            int sellerId = _getId.GetSellerId();

            try
            {
                // Service của bạn ném exception thay vì trả về bool
                // await _productService.UpdateProductAsync(productId, sellerId, updateDto); // Gọi trực tiếp
                // return NoContent(); // Nếu thành công, trả về 204

                // ---- HOẶC: Xử lý theo phiên bản service trả về bool ----
                bool success = await _productService.UpdateProductAsync(productId, sellerId, updateDto);
                if (!success)
                {
                    // Không rõ lý do thất bại là do không tìm thấy hay không có quyền
                    // Cần service trả về thông tin rõ hơn hoặc phải query lại để xác định
                    // Tạm thời trả về BadRequest hoặc NotFound
                    _logger.LogWarning("Cập nhật sản phẩm ID {ProductId} thất bại (không tìm thấy hoặc không có quyền).", productId);
                    return NotFound($"Không thể cập nhật sản phẩm ID {productId}. Sản phẩm không tồn tại hoặc bạn không có quyền.");
                }
                return NoContent(); // Trả về 204 No Content khi cập nhật thành công
                // -------------------------------------------------------

            }
            catch (KeyNotFoundException ex) // Do service ném ra
            {
                _logger.LogWarning("Không tìm thấy sản phẩm ID {ProductId} để cập nhật.", productId);
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex) // Do service ném ra
            {
                _logger.LogWarning("Không có quyền cập nhật sản phẩm ID {ProductId}.", productId);
                return Forbid(ex.Message); // Trả về 403 Forbidden
            }
            catch (ArgumentException ex) // Do service ném ra (FK không hợp lệ)
            {
                _logger.LogWarning(ex, "Lỗi ArgumentException khi cập nhật sản phẩm ID {ProductId}.", productId);
                return BadRequest(ex.Message);
            }
            catch (Exception ex) // Các lỗi khác
            {
                _logger.LogError(ex, "Lỗi xảy ra khi cập nhật sản phẩm ID {ProductId}.", productId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình cập nhật sản phẩm.");
            }
        }

        /// <summary>
        /// Xóa hoặc đánh dấu không hoạt động sản phẩm (yêu cầu xác thực là Seller sở hữu sản phẩm).
        /// </summary>
        /// <param name="productId">ID sản phẩm cần xóa/ẩn.</param>
        /// <param name="status">Hành động: "delete" để xóa cứng, "notActive" (mặc định) để xóa mềm.</param>
        /// <returns>Không có nội dung nếu thành công.</returns>
        [HttpDelete("{productId:int}")] // Endpoint: DELETE /api/products/5?status=delete
        [Authorize(Roles = "Seller, Admin")] // Chỉ Seller và Admin mới được xóa
        public async Task<IActionResult> DeleteProduct(int productId, [FromQuery] string status = "notActive")
        {
            int sellerId = _getId.GetSellerId();

            // Kiểm tra giá trị status hợp lệ
            status = status.ToLowerInvariant();
            if (status != "delete" && status != "notactive")
            {
                return BadRequest("Giá trị tham số 'status' không hợp lệ. Chỉ chấp nhận 'delete' hoặc 'notActive'.");
            }

            try
            {
                // ---- Xử lý theo phiên bản service trả về bool ----
                bool success = await _productService.DeleteProductAsync(productId, sellerId, status);
                if (!success)
                {
                    // Tương tự Update, cần xác định rõ lý do thất bại
                    _logger.LogWarning("Xóa sản phẩm thất bại: {Status}) .", status);
                    return NotFound($"Không thể xóa sản phẩm ID {productId}. Sản phẩm không tồn tại hoặc bạn không có quyền.");
                }
                return NoContent(); // Trả về 204 No Content khi thành công

            }
            catch (KeyNotFoundException ex) // Do service ném ra
            {
                _logger.LogWarning("Không tìm thấy sản phẩm để xóa.");
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex) // Do service ném ra
            {
                _logger.LogWarning("Không tìm thấy sản phẩm.");
                return Forbid(ex.Message); // Trả về 403 Forbidden
            }
            catch (Exception ex) // Các lỗi khác
            {
                _logger.LogError(ex, "Lỗi xảy ra khi xóa sản phẩm (status: {Status}).", status);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xóa sản phẩm.");
            }
        }
    }
}
