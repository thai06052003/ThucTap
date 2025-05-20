﻿namespace ShopxEX1.Dtos.Discounts
{
    // Output: Hiển thị thông tin mã giảm giá
    public class DiscountDto
    {
        public int DiscountID { get; set; }
        public string DiscountCode { get; set; } = string.Empty;
        public decimal DiscountPercent { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsCurrentlyValid => IsActive && DateTime.UtcNow >= StartDate && DateTime.UtcNow <= EndDate;
    }
}
