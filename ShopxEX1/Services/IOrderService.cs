using ShopxEX1.Dtos.Orders;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    public interface IOrderService
    {
        /// <summary>
        /// Tạo một hoặc nhiều đơn hàng mới (đơn hàng con theo từng người bán) từ giỏ hàng của người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng đặt hàng.</param>
        /// <param name="createDto">Thông tin cần thiết để tạo đơn hàng (địa chỉ giao, phương thức thanh toán, mã giảm giá).</param>
        /// <returns>Một danh sách các DTO chi tiết của các đơn hàng con vừa được tạo.</returns>
        Task<List<OrderDto>> CreateOrderFromCartAsync(int userId, OrderCreateDto createDto);


        /// <summary>
        /// Lấy danh sách đơn hàng của một người dùng cụ thể (Customer view).
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="filter">Bộ lọc đơn hàng (trạng thái, ngày).</param>
        /// <param name="pageNumber">Số trang.</param>
        /// <param name="pageSize">Kích thước trang.</param>
        /// <returns>Kết quả phân trang chứa danh sách tóm tắt các đơn hàng.</returns>
        Task<PagedResult<OrderDto>> GetOrdersByUserIdAsync(int userId, OrderFilterDto filter, int pageNumber, int pageSize);

        /// <summary>
        /// Lấy danh sách tất cả đơn hàng (Admin view).
        /// </summary>
        /// <param name="filter">Bộ lọc đơn hàng (trạng thái, ngày, có thể cả UserID nếu Admin muốn lọc theo khách hàng).</param>
        /// <param name="pageNumber">Số trang.</param>
        /// <param name="pageSize">Kích thước trang.</param>
        /// <returns>Kết quả phân trang chứa danh sách tóm tắt các đơn hàng.</returns>
        Task<PagedResult<OrderSummaryDto>> GetAllOrdersAsync(OrderFilterDto filter, int pageNumber, int pageSize);

        /// <summary>
        /// Lấy danh sách đơn hàng liên quan đến một người bán cụ thể (Seller view).
        /// Đơn hàng được coi là liên quan nếu chứa ít nhất một sản phẩm của người bán đó.
        /// </summary>
        /// <param name="sellerId">ID của người bán.</param>
        /// <param name="filter">Bộ lọc đơn hàng (trạng thái, ngày).</param>
        /// <param name="pageNumber">Số trang.</param>
        /// <param name="pageSize">Kích thước trang.</param>
        /// <returns>Kết quả phân trang chứa danh sách tóm tắt các đơn hàng.</returns>
        Task<PagedResult<OrderSummaryDto>> GetOrdersBySellerIdAsync(int sellerId, OrderFilterDto filter, int pageNumber, int pageSize);


        /// <summary>
        /// Lấy thông tin chi tiết của một đơn hàng.
        /// </summary>
        /// <param name="orderId">ID của đơn hàng.</param>
        /// <param name="requestingUserId">ID của người dùng yêu cầu (để kiểm tra quyền).</param>
        /// <param name="userRole">Vai trò của người dùng yêu cầu.</param>
        /// <returns>DTO chi tiết đơn hàng hoặc null nếu không tìm thấy hoặc không có quyền truy cập.</returns>
        Task<OrderDto?> GetOrderDetailsByIdAsync(int orderId, int requestingUserId, string userRole);

        /// <summary>
        /// Cập nhật trạng thái của một đơn hàng.
        /// </summary>
        /// <param name="orderId">ID của đơn hàng.</param>
        /// <param name="statusUpdateDto">Thông tin trạng thái mới.</param>
        /// <param name="requestingUserId">ID của người dùng thực hiện cập nhật (Seller hoặc Admin).</param>
        /// <param name="userRole">Vai trò của người dùng thực hiện cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, false nếu thất bại (ví dụ: không tìm thấy đơn hàng, không có quyền, trạng thái không hợp lệ).</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu không tìm thấy đơn hàng.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người dùng không có quyền cập nhật.</exception>
        /// <exception cref="InvalidOperationException">Ném ra nếu việc chuyển trạng thái không hợp lệ.</exception>
        Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatusUpdateDto statusUpdateDto, int requestingUserId, string userRole);
        /// <summary>
        /// Người dùng hủy đơn hàng nếu đơn hàng chưa được gửi
        /// </summary>
        /// <param name="orderId">Id đơn hàng</param>
        /// <param name="userId">Id người dùng (người hủy đơn hàng)</param>
        /// <returns></returns>
        //Task<bool> CancelOrderAsync(int orderId, int userId);
    }
}
