namespace ShopxEX1.Models
{
    public class Discount
    {
        public int DiscountID { get; set; }
        public string DiscountCode { get; set; } = string.Empty;
        // Bỏ Description nếu không có cột
        public decimal DiscountPercent { get; set; } // NOT NULL trong SQL mới
        // Bỏ DiscountAmount nếu không có cột
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>(); // Quan hệ 1-n
    }
}
