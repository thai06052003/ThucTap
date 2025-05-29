using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Dtos.Orders
{
    // Output: Chi tiết đơn hàng (cho Seller xem hoặc User xem lịch sử chi tiết)
    public class OrderDto
    {
        public int OrderID { get; set; }
        public DateTime? OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPayment { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string? DiscountCode { get; set; }
        
        public string OrderDateDisplay => Status == "Đã giao" ? "Ngày giao" : "Ngày đặt";
        public bool CanRequestRefund => Status == "Đã giao" && OrderDate.HasValue && 
            (DateTime.UtcNow - OrderDate.Value).TotalDays <= 3;
        public int DaysLeftForRefund => Status == "Đã giao" && OrderDate.HasValue ? 
            Math.Max(0, 3 - (int)(DateTime.UtcNow - OrderDate.Value).TotalDays) : 0;
        
        // ✅ NEW: Status check properties
        public bool IsDelivered => Status == "Đã giao";
        public bool IsCompleted => Status == "Hoàn thành";
        public bool IsRefunded => Status == "Đã hoàn tiền";
        public bool IsCancelled => Status == "Đã hủy";
        public bool IsRefundRequested => Status == "Yêu cầu trả hàng/ hoàn tiền";
        public bool IsFinalStatus => IsCompleted || IsRefunded || IsCancelled;
        
        // ✅ NEW: Business logic helpers
        public bool CanSellerAcceptRefund => IsRefundRequested;
        public bool CanSellerRejectRefund => IsRefundRequested;
        public bool WillAutoComplete => IsDelivered && DaysLeftForRefund <= 0;
                public List<OrderDetailDto> Items { get; set; } = new List<OrderDetailDto>();
        public UserDto? CustomerInfo { get; set; }
    }
}
