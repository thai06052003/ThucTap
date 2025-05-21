using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Orders;
using ShopxEX1.Helpers;
using ShopxEX1.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Yêu cầu xác thực cho tất cả các action
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly GetID _getID; // Helper để lấy UserID/SellerID từ token
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(IOrderService orderService, GetID getID, ILogger<OrdersController> logger)
        {
            _orderService = orderService;
            _getID = getID;
            _logger = logger;
        }

        /// <summary>
        /// Tạo một đơn hàng mới từ giỏ hàng của người dùng hiện tại.
        /// </summary>
        [HttpPost]
public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] OrderCreateDto createDto)
{
    if (!ModelState.IsValid)
    {
        return BadRequest(ModelState);
    }
    try
    {
        var userId = _getID.GetCurrentUserId();
        
        // Kiểm tra trạng thái của các shop trước khi tạo đơn hàng
        if (createDto.SelectedCartItemIds?.Any() == true)
        {
            // Lấy AppDbContext từ DI container
            using var scope = HttpContext.RequestServices.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            // Lấy các CartItems theo ID để truy xuất thông tin seller
            var sellerIds = await dbContext.CartItems
                .Where(c => createDto.SelectedCartItemIds.Contains(c.CartItemID))
                .Include(c => c.Product)
                .Select(c => c.Product.SellerID)
                .Distinct()
                .ToListAsync();
            
            // Kiểm tra shop có đang bảo trì không
            var inactiveShops = await dbContext.Sellers
                .Where(s => sellerIds.Contains(s.SellerID) && !s.IsActive)
                .Select(s => new { s.SellerID, s.ShopName })
                .ToListAsync();
            
            if (inactiveShops.Any())
            {
                return BadRequest(new {
                    success = false,
                    message = "Không thể đặt hàng vì một số shop đang trong chế độ bảo trì",
                    shops = inactiveShops
                });
            }
        }
        
        // Tiếp tục logic tạo đơn hàng hiện có
        var createdOrders = await _orderService.CreateOrderFromCartAsync(userId, createDto);

        if (createdOrders.Any())
        {
            return Ok(createdOrders);
        }
        else
        {
            // Trường hợp hiếm hoi không có đơn hàng nào được tạo dù không có lỗi
            return BadRequest("Không thể tạo đơn hàng từ giỏ hàng hiện tại.");
        }
    }
    catch (KeyNotFoundException ex)
    {
        _logger.LogWarning(ex, "Lỗi tạo đơn hàng: Resource không tìm thấy.");
        return NotFound(new { message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        _logger.LogWarning(ex, "Lỗi tạo đơn hàng: Thao tác không hợp lệ.");
        return BadRequest(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi không mong muốn khi tạo đơn hàng.");
        return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi xử lý yêu cầu của bạn.");
    }
}

        /// <summary>
        /// [Customer] Lấy lịch sử đơn hàng của người dùng hiện tại.
        /// </summary>
        [HttpGet("my-orders")]
        public async Task<ActionResult<PagedResult<OrderDto>>> GetMyOrders( // Thay đổi ở đây
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10) // Giữ pageSize là int nếu API Customer không cần linh hoạt như Admin
        {
            // Đảm bảo pageSize hợp lệ cho Customer
            const int MaxCustomerPageSize = 20; // Ví dụ
            const int DefaultCustomerPageSize = 1;
            if (pageSize < 1 || pageSize > MaxCustomerPageSize) pageSize = DefaultCustomerPageSize;


            try
            {
                var userId = _getID.GetCurrentUserId();
                // Gọi hàm service đã được cập nhật
                var orders = await _orderService.GetOrdersByUserIdAsync(userId, filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đơn hàng của tôi.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }

        /// <summary>
        /// [Admin] Lấy tất cả đơn hàng trong hệ thống.
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResult<OrderSummaryDto>>> GetAllOrders(
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] String pageSizeInput = "10")
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
                var orders = await _orderService.GetAllOrdersAsync(filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy tất cả đơn hàng (Admin).");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }


        /// <summary>
        /// [Seller] Lấy các đơn hàng liên quan đến người bán hiện tại.
        /// </summary>
        [HttpGet("seller-orders")]
        [Authorize(Roles = "Seller")]
        public async Task<ActionResult<PagedResult<OrderSummaryDto>>> GetSellerOrders(
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var sellerId = _getID.GetSellerId(); // Giả sử GetSellerId() trả về int? và đã được implement
                if (!sellerId.HasValue)
                {
                    _logger.LogWarning("Yêu cầu GetSellerOrders nhưng không tìm thấy SellerId từ token.");
                    return Unauthorized("Không thể xác định thông tin người bán.");
                }
                var orders = await _orderService.GetOrdersBySellerIdAsync(sellerId.Value, filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đơn hàng của người bán.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }


        /// <summary>
        /// Lấy chi tiết một đơn hàng theo ID.
        /// Customer chỉ xem được đơn của mình. Seller xem được đơn có sản phẩm của mình. Admin xem được tất cả.
        /// </summary>
        [HttpGet("{orderId}")]
        public async Task<ActionResult<OrderDto>> GetOrderById(int orderId)
        {
            try
            {
                var userId = _getID.GetCurrentUserId();
                var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Customer"; // Lấy vai trò, mặc định là Customer nếu không có

                var order = await _orderService.GetOrderDetailsByIdAsync(orderId, userId, userRole);
                if (order == null)
                {
                    return NotFound($"Không tìm thấy đơn hàng với ID {orderId} hoặc bạn không có quyền xem.");
                }
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết đơn hàng ID {OrderId}.", orderId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }

        /// <summary>
        /// [Seller, Admin] Cập nhật trạng thái của một đơn hàng.
        /// </summary>
        [HttpPut("{orderId}/status")]
        [Authorize(Roles = "Seller,Admin")]
        public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] OrderStatusUpdateDto statusUpdateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var requestingUserId = _getID.GetCurrentUserId(); // Nếu là Admin, ID này có thể không quan trọng bằng role
                                                                  // Nếu là Seller, GetID nên có cách lấy SellerID từ UserID
                var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";

                // Nếu là Seller, cần lấy SellerID từ UserID. Giả sử GetSellerId() làm việc đó.
                int idForService = userRole == "Seller" ? (_getID.GetSellerId() ?? 0) : requestingUserId;
                if (userRole == "Seller" && idForService == 0)
                {
                    return Unauthorized("Không thể xác định thông tin người bán hợp lệ.");
                }


                var success = await _orderService.UpdateOrderStatusAsync(orderId, statusUpdateDto, idForService, userRole);
                if (success)
                {
                    return NoContent(); // 204 No Content
                }
                // Trường hợp service trả về false (ví dụ: trạng thái không đổi) nhưng không ném exception
                return BadRequest("Không thể cập nhật trạng thái đơn hàng hoặc trạng thái không thay đổi.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không tìm thấy OrderID {OrderId}.", orderId);
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không có quyền cho OrderID {OrderId}.", orderId);
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Thao tác không hợp lệ cho OrderID {OrderId}.", orderId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi cập nhật trạng thái đơn hàng OrderID {OrderId}.", orderId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }
    }
}
