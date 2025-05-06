namespace ShopxEX1.Dtos.Orders
{
    public class OrderDetailDto
    {
        // Output: Chi tiết 1 dòng trong đơn hàng
        public int OrderDetailID { get; set; }
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty; // Cần map từ Product
        public string? ProductImageURL { get; set; } // Cần map từ Product
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; } // Giá lúc đặt hàng
        public decimal LineTotal => UnitPrice * Quantity;
    }
}
