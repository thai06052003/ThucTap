using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Discounts
{
    // Input: Cập nhật mã giảm giá (Admin)
    public class DiscountUpdateDto
    {
        [Required][Range(0.01, 100)] public decimal DiscountPercent { get; set; }
        [Required][Range(1, int.MaxValue, ErrorMessage = "Budget phải là số không âm.")] public int Budget { get; set; }
        [Required][Range(1, int.MaxValue, ErrorMessage = "Budget phải là số không âm.")] public int MaxDiscountPercent { get; set; }
        [Required][Range(0, int.MaxValue, ErrorMessage = "Budget phải là số không âm.")] public int RemainingBudget { get; set; }
        [Required] public DateTime StartDate { get; set; }
        [Required] public DateTime EndDate { get; set; }
        [Required] public bool IsActive { get; set; }
        // Không cho đổi DiscountCode
    }
}
