using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Services;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ISessionService _sessionService;
        // private readonly ILogger<AuthController> _logger; // Inject nếu cần log chi tiết

        public AuthController(IAuthService authService, ISessionService sessionService)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        }
        // --- Helper function để lấy User ID từ Claims (Được Middleware xác thực điền vào HttpContext.User) ---
        private int GetCurrentUserIdFromClaims()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định ID người dùng từ thông tin xác thực.");
            }
            return userId;
        }
        // Đăng nhập người dùng bằng email và mật khẩu
        [HttpPost("login")]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<ActionResult<AuthResultDto>> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                // Trả về lỗi validation nếu DTO không hợp lệ ngay từ đầu
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu đăng nhập không hợp lệ.", User = null });
            }

            try
            {
                // Service trả về AuthResultDto (có thể success=false nếu sai pass/user)
                    var result = await _authService.LoginAsync(loginDto);

                if (result == null || !result.Success)
                {
                    // Trả về 401 Unauthorized cùng với thông báo lỗi từ service
                    return Unauthorized(result);
                }
                // Trả về 200 OK với token và thông tin user
                return Ok(result);
            }
            catch (Exception ex) // Bắt các lỗi không mong muốn khác từ service (ví dụ lỗi DB khi lưu RT/LastLogin)
            {
                // _logger.LogError(ex, "Lỗi hệ thống khi đăng nhập.");
                Console.WriteLine($"Lỗi Login: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Đã xảy ra lỗi hệ thống khi đăng nhập: " + ex.Message + " *** " + ex.Source});
            }
        }
        [HttpPost("social-login")]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<ActionResult<AuthResultDto>> SocialLogin([FromBody] SocialLoginRequestDto socialLoginDto)
        {
            if (!ModelState.IsValid)
            {   
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu social login không hợp lệ." });
            }

            try
            {
                var result = await _authService.SocialLoginAsync(socialLoginDto);

                if (!result.Success)
                {
                    // Lỗi trả về từ service (ví dụ: email đã liên kết tài khoản social khác)
                    return BadRequest(result);
                }

                // Trả về thành công với Access Token và User Info
                return Ok(result);
            }
            catch (Exception ex) // Bắt lỗi hệ thống từ service
            {
                Console.WriteLine($"Lỗi SocialLogin: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Lỗi hệ thống khi xử lý đăng nhập bằng mạng xã hội." });
            }
        }
        // Đăng ký tài khoản người dùng mới (vai trò Customer)
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResultDto>> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu đăng ký không hợp lệ.", User = null });
            }

            try
            {
                // Service trả về AuthResultDto (có thể success=false nếu email tồn tại)
                var result = await _authService.RegisterAsync(registerDto);

                if (!result.Success)
                {
                    // Trả về 400 Bad Request với thông báo lỗi từ service
                    return BadRequest(result);
                }
                // Trả về 200 OK với thông tin user mới (không có token)
                return Ok(result);
            }
            catch (Exception ex) // Bắt lỗi không mong muốn khác (ví dụ: lỗi lưu DB)
            {
                // _logger.LogError(ex, "Lỗi hệ thống khi đăng ký.");
                Console.WriteLine($"Lỗi Register: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Đã xảy ra lỗi hệ thống khi đăng ký." });
            }
        }
        // Đăng xuất người dùng hiện tại (blacklist Access Token, revoke Refresh Tokens)
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = GetCurrentUserIdFromClaims();

                // Lấy JTI và Expiry từ token hiện tại để gửi cho service blacklist
                var jti = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
                var expClaim = User.FindFirstValue(JwtRegisteredClaimNames.Exp);
                DateTime? expiry = null;
                if (expClaim != null && long.TryParse(expClaim, out long expUnix))
                {
                    expiry = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                }

                await _authService.LogoutAsync(userId, jti, expiry);

                return Ok(new { message = "Đăng xuất thành công." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex) // Bắt lỗi không mong muốn khác từ service (ví dụ lỗi DB khi revoke/blacklist)
            {
                // _logger.LogError(ex, "Lỗi không mong muốn khi thực hiện logout cho User ID."); // Cần userId ở đây nếu log
                Console.WriteLine($"Lỗi Logout: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống khi đăng xuất.");
            }
        }
        // Đặt lại mật khẩu bằng token nhận được
        [HttpGet("check-auth")]
        [Authorize]
        public async Task<IActionResult> CheckAuth()
        {
            var user = await _sessionService.GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập đã hết hạn" });
            }

            return Ok(new
            {
                isAuthenticated = true,
                user = user
            });
        }
        // Thay đổi mật khẩu cho người dùng đang đăng nhập.
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserIdFromClaims();
                await _authService.ChangePasswordAsync(userId, changePasswordDto);
                return NoContent(); // Thành công
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); } // Sai mật khẩu cũ hoặc lỗi token
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); } // Không tìm thấy user
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); } // Mật khẩu mới không khớp (nếu service check)
            catch (Exception ex) { Console.WriteLine($"Lỗi ChangePassword: {ex}"); return StatusCode(500, "Lỗi hệ thống khi đổi mật khẩu."); }
        }
        // Gửi yêu cầu đặt lại mật khẩu qua email
        [HttpPost("request-password-reset")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetDto requestDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _authService.RequestPasswordResetAsync(requestDto);
                // Luôn trả về OK để bảo mật, thông báo chi tiết nằm trong result.Message
                return Ok(result);
            }
            catch (Exception ex) // Bắt lỗi từ service (ví dụ: lỗi gửi mail nghiêm trọng hoặc lỗi DB)
            {
                Console.WriteLine($"Lỗi RequestPasswordReset: {ex}");
                return StatusCode(500, "Không thể xử lý yêu cầu đặt lại mật khẩu vào lúc này.");
            }
        }
        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto updateDto)
        {
            try
            {
                Console.WriteLine($"UpdateProfile request received for user {User.FindFirst(ClaimTypes.NameIdentifier)?.Value}");
                Console.WriteLine($"Update data: {JsonSerializer.Serialize(updateDto)}");

                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                if (userId == 0)
                {
                    Console.WriteLine("Invalid user ID from token");
                    return Unauthorized(new { message = "Invalid token" });
                }

                var result = await _authService.UpdateProfileAsync(userId, updateDto);
                Console.WriteLine($"Update result: {JsonSerializer.Serialize(result)}");

                if (!result.Success)
                {
                    return BadRequest(new { message = result.Message });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateProfile: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while updating profile" });
            }
        }
    }
}
