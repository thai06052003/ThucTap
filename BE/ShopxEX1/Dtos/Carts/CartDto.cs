namespace ShopxEX1.Dtos.Carts
{
    // Output: Toàn bộ giỏ hàng
    public class CartDto
    {
        public int CartID { get; set; }
        public List<CartItemDto> Items { get; set; } = new List<CartItemDto>();
        public decimal TotalPrice { get; set; } // Tính toán trong service/mapper
        public int TotalItems => Items?.Sum(i => i.Quantity) ?? 0;
    }
}
