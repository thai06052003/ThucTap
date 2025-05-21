using ShopxEX1.Dtos.Auth;
using ShopxEX1.Models;

namespace ShopxEX1.Services
{
    public interface IAuthService
    {
        // Xử lý đăng nhập người dùng bằng email và mật khẩu.
        Task<AuthResultDto> LoginAsync(LoginDto loginDto);
        // Xử lý đăng nhập hoặc đăng ký bằng thông tin từ nhà cung cấp mạng xã hội
        Task<AuthResultDto> SocialLoginAsync(SocialLoginRequestDto socialLoginDto);
        // Đăng ký tài khoản người dùng mới (vai trò Customer)
        Task<AuthResultDto> RegisterAsync(RegisterDto registerDto);
        // Xử lý đăng xuất (hiện tại không cần logic phía server nếu dùng JWT không trạng thái
        Task LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiry);
        // Cho phép người dùng đã đăng nhập thay đổi mật khẩu của họ
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto);
        // Bắt đầu quy trình yêu cầu đặt lại mật khẩu (tạo token, gửi email)
        Task<PasswordResetResultDto> RequestPasswordResetAsync(RequestPasswordResetDto resetRequestDto);
        // Thực hiện đặt lại mật khẩu bằng token đã nhận qua email
        Task<PasswordResetResultDto> ResetPasswordAsync(PasswordResetDto resetDto);
        // Làm mới Access Token bằng Refresh Token.
        Task<RefreshTokenResultDto> RefreshTokenAsync(RefreshTokenRequestDto refreshTokenDto);
        // Kiểm tra xem người dùng có Refresh Token còn hiệu lực hay không
        Task<bool> CheckRefreshTokenValidityAsync(int userId);
        Task<AuthResultDto> UpdateProfileAsync(int userId, UpdateProfileDto updateDto);
        // Thêm phương thức public để tạo JWT token
        (string Token, DateTime Expiration) GenerateJwtToken(User user);
    }
}
