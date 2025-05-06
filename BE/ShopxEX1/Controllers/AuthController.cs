using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Services;
using ShopxEX1.Dtos.Users; 
using ShopxEX1.Models;
using ShopxEX1.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System;
using System.Threading.Tasks;
using BCrypt.Net;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly AppDbContext _context;

        public AuthController(IAuthService authService, AppDbContext context)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _context = context;
        }

        private User MapToUser(UserDto userDto)
        {
            if (userDto == null) throw new ArgumentNullException(nameof(userDto));

            return new User
            {
                UserID = userDto.UserID,
                FullName = userDto.FullName ?? string.Empty,
                Email = userDto.Email ?? string.Empty,
                Phone = userDto.Phone,
                Address = userDto.Address,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(userDto.Password ?? string.Empty),
                Role = userDto.Role ?? "Customer",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
        }

        private UserDto MapToUserDto(User user)
        {
            if (user == null) throw new ArgumentNullException(nameof(user));

            return new UserDto
            {
                UserID = user.UserID,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Address = user.Address,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                IsActive = user.IsActive
            };
        }

        private int GetCurrentUserIdFromClaims()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định ID người dùng từ thông tin xác thực.");
            }
            return userId;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResultDto>> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu đăng nhập không hợp lệ." });
            }

            try
            {
                var result = await _authService.LoginAsync(loginDto);
                if (result == null || !result.Success)
                {
                    return Unauthorized(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResultDto { Success = false, Message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        [HttpPost("social-login")]
        [AllowAnonymous]
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
                    return BadRequest(result);
                }

                if (result.User != null)
                {
                    result.User = new UserDto
                    {
                        UserID = result.User.UserID,
                        FullName = result.User.FullName,
                        Email = result.User.Email,
                        Phone = result.User.Phone,
                        Address = result.User.Address,
                        Role = result.User.Role,
                        CreatedAt = result.User.CreatedAt,
                        IsActive = result.User.IsActive
                    };
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi SocialLogin: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto 
                { 
                    Success = false, 
                    Message = "Lỗi hệ thống khi xử lý đăng nhập bằng mạng xã hội: " + ex.Message 
                });
            }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] UserDto userDto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == userDto.Email))
            {
                return BadRequest(new { message = "Email đã tồn tại." });
            }

            var user = new User
            {
                FullName = userDto.FullName ?? string.Empty,
                Email = userDto.Email ?? string.Empty,
                Phone = userDto.Phone,
                Address = userDto.Address,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(userDto.Password ?? string.Empty),
                Role = userDto.Role ?? "Customer",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công." });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = GetCurrentUserIdFromClaims();
                var jti = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
                var expClaim = User.FindFirstValue(JwtRegisteredClaimNames.Exp);
                DateTime? expiry = null;
                if (expClaim != null && long.TryParse(expClaim, out long expUnix))
                {
                    expiry = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                }

                await _authService.LogoutAsync(userId, jti, expiry);
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return Ok(new { message = "Đăng xuất thành công." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi Logout: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống khi đăng xuất: " + ex.Message);
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserIdFromClaims();
                await _authService.ChangePasswordAsync(userId, changePasswordDto);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) 
            { 
                Console.WriteLine($"Lỗi ChangePassword: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, "Lỗi hệ thống khi đổi mật khẩu: " + ex.Message); 
            }
        }

        [HttpPost("request-password-reset")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetDto requestDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _authService.RequestPasswordResetAsync(requestDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi RequestPasswordReset: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, "Không thể xử lý yêu cầu đặt lại mật khẩu vào lúc này: " + ex.Message);
            }
        }

        [HttpGet("validate-token")]
        [Authorize]
        public IActionResult ValidateToken()
        {
            try
            {
                var userId = GetCurrentUserIdFromClaims();
                if (userId <= 0)
                {
                    return Unauthorized(new { message = "Token không hợp lệ: Không tìm thấy UserID." });
                }

                return Ok(new { 
                    message = "Token hợp lệ.",
                    userId = userId,
                    email = User.FindFirstValue(ClaimTypes.Email),
                    role = User.FindFirstValue(ClaimTypes.Role)
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xác thực token: " + ex.Message });
            }
        }

        [HttpGet("user-info")]
        [Authorize]
        public async Task<IActionResult> GetUserInfo()
        {
            try
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                Console.WriteLine("userIdClaim: " + userIdClaim);
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    Console.WriteLine("Không xác định được userId từ token");
                    return Unauthorized(new { message = "Không xác định được người dùng từ token." });
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    Console.WriteLine("Không tìm thấy user trong DB với userId: " + userId);
                    return NotFound(new { message = "Không tìm thấy người dùng." });
                }

                return Ok(new {
                    userID = user.UserID,
                    email = user.Email,
                    fullName = user.FullName,
                    phone = user.Phone,
                    birthday = user.Birthday,
                    gender = user.Gender,
                    address = user.Address,
                    role = user.Role,
                    isActive = user.IsActive,
                    createdAt = user.CreatedAt
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi khi lấy thông tin người dùng: " + ex.Message);
                return StatusCode(500, new { message = "Lỗi khi lấy thông tin người dùng: " + ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            return Ok(new UserDto
            {
                UserID = user.UserID,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Address = user.Address,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                IsActive = user.IsActive
            });
        }
    }
}