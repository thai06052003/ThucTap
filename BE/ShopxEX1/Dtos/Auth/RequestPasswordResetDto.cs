using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Yêu cầu reset mật khẩu
    public class RequestPasswordResetDto
    {
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
