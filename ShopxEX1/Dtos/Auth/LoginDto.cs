using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Đăng nhập
    public class LoginDto
    {
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email phải đúng định dạng.")]
        public string Email { get; set; } = string.Empty; // Dùng Email làm định danh đăng nhập

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        //[DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;
    }
}
