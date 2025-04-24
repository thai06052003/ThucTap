using System;

namespace backend.Models
{
    public partial class Discounts
    {
        public int DiscountId { get; set; }
        public string? DiscountCode { get; set; }
        public decimal DiscountPercent { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
    }
}