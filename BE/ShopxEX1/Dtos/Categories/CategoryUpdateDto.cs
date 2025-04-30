using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Categories
{
    // Input: Admin cập nhật danh mục sản phẩm
    public class CategoryUpdateDto
    {
        [Required(ErrorMessage = "Tên danh mục không được để trống.")]
        [StringLength(50, ErrorMessage = "Tên danh mục không được vượt quá 50 ký tự.")]
        public string CategoryName { get; set; } = string.Empty;

        [StringLength(255, ErrorMessage = "Mô tả không được vượt quá 255 ký tự.")]
        public string? Description { get; set; }
    }
}
