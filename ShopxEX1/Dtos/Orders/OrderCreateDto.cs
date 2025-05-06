using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Orders
{
    // Input: Tạo đơn hàng từ client (checkout)
    public class OrderCreateDto
    {
        [Required][StringLength(255)] public string ShippingAddress { get; set; } = string.Empty;
        [Required][StringLength(50)] public string PaymentMethod { get; set; } = string.Empty; // Cần cột này trong Order
        public string? DiscountCode { get; set; }
        // UserID và CartID lấy từ context
    }

}
