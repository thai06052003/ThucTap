using ShopxEX1.Dtos.Shared;

namespace ShopxEX1.Dtos.Orders
{
    // Input: Lọc đơn hàng
    public class OrderFilterDto : DateRangeFilterDto // Kế thừa bộ lọc ngày
    {
        public string? Status { get; set; }
        // SellerID/UserID sẽ lấy từ context hoặc cho Admin lọc
    }
}
