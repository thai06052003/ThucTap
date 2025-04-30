using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Discounts
{
    // Input: Tạo mã giảm giá (Admin)
    public class DiscountCreateDto
    {
        [Required][StringLength(50)] public string DiscountCode { get; set; } = string.Empty;
        [Required][Range(0.01, 100)] public decimal DiscountPercent { get; set; }
        [Required] public DateTime StartDate { get; set; }
        [Required] public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        // Validation: EndDate >= StartDate
    }
}
