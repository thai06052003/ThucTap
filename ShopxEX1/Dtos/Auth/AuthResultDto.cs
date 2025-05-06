using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Dtos.Auth
{
    // Output: Kết quả Đăng nhập / Đăng ký thành công
    public class AuthResultDto
    {
        public bool Success { get; set; }
        public string? Token { get; set; } // JWT Token (cho duy trì đăng nhập)
        public DateTime? Expiration { get; set; }
        public UserDto? User { get; set; } // Trả về thông tin cơ bản
<<<<<<< HEAD
=======
        public string? RefreshToken { get; set; } // Refresh Token
>>>>>>> 12acb0a141e50d009a689c12f2bba62dab1a2c0d
        public string? Message { get; set; } // Thông báo lỗi hoặc thành công
    }
}
