using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Dtos.Orders
{
    // Output: Chi tiết đơn hàng (cho Seller xem hoặc User xem lịch sử chi tiết)
    public class OrderDto
    {
        public int OrderID { get; set; }
        public DateTime? OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string? DiscountCode { get; set; }
        public string PaymentMethod { get; set; } = string.Empty; // Lấy từ Order Model đã sửa
        public List<OrderDetailDto> Items { get; set; } = new List<OrderDetailDto>();
        public UserDto? CustomerInfo { get; set; }
    }
}
