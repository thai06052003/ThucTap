using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using backend.Models;
using System.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UsersController> _logger; // Khai báo _logger

        public UsersController(ApplicationDbContext context, IConfiguration configuration, ILogger<UsersController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger; // Gán logger từ dependency injection
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid input received: {Errors}", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return BadRequest(new { message = "Invalid input", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
                }

                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Registration failed: Email {Email} already exists", model.Email);
                    return BadRequest(new { message = "Email already exists" });
                }

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);

                var user = new Users
                {
                    Email = model.Email,
                    PasswordHash = passwordHash,
                    FullName = model.FullName,
                    Phone = model.Phone,
                    Address = model.Address,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    Role = "Customer"
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation("User registered successfully: {UserId}", user.UserId);
                return Ok(new { message = "Registration successful", userId = user.UserId });
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UQ_Users_Email") == true)
            {
                _logger.LogWarning("Registration failed: Email {Email} already exists", model.Email);
                return BadRequest(new { message = "Email already exists" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration for email {Email}", model.Email);
                return StatusCode(500, new { message = "An error occurred during registration", details = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var token = GenerateJwtToken(user);
            var userData = new
            {
                name = user.FullName,
                email = user.Email,
                phone = user.Phone,
                birthdate = user.Birthday?.ToString("dd/MM/yyyy")
            };

            return Ok(new { token, user = userData });
        }

        [HttpPost("social-login")]
public async Task<IActionResult> SocialLogin([FromBody] SocialLoginModel model)
{
    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.SocialProvider == model.Provider && u.SocialId == model.UserId);
    if (existingUser != null)
    {
        var token = GenerateJwtToken(existingUser);
        var userData = new
        {
            name = existingUser.FullName,
            email = existingUser.Email,
            phone = existingUser.Phone,
            birthdate = existingUser.Birthday?.ToString("dd/MM/yyyy")
        };
        return Ok(new { token, user = userData });
    }

    if (!string.IsNullOrEmpty(model.Email))
    {
        var emailUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        if (emailUser != null)
        {
            return BadRequest(new { message = "Email already registered." });
        }

        var newUser = new Users
        {
            Email = model.Email,
            SocialProvider = model.Provider,
            SocialId = model.UserId,
            FullName = "Social User",
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Role = "Customer"
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(newUser);
        var userData = new
        {
            name = newUser.FullName,
            email = newUser.Email,
            phone = newUser.Phone,
            birthdate = newUser.Birthday?.ToString("dd/MM/yyyy")
        };
        return Ok(new { token, user = userData });
    }
    else
    {
        var newUser = new Users
        {
            SocialProvider = model.Provider,
            SocialId = model.UserId,
            FullName = "Social User",
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Role = "Customer",
            Email = $"temp_{model.UserId}_{model.Provider}@socialuser.com"
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(newUser);
        var userData = new
        {
            name = newUser.FullName,
            email = newUser.Email,
            phone = newUser.Phone,
            birthdate = newUser.Birthday?.ToString("dd/MM/yyyy")
        };
        return Ok(new { token, user = userData, needsEmail = true });
    }
}

        [HttpPost("submit-manual-email")]
        public async Task<IActionResult> SubmitManualEmail([FromBody] ManualEmailModel model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.SocialProvider == model.Provider && u.SocialId == model.UserId && u.Email.StartsWith("temp_"));
            if (user != null)
            {
                var emailTaken = await _context.Users.AnyAsync(u => u.Email == model.Email);
                if (emailTaken)
                {
                    return BadRequest(new { message = "Email already registered." });
                }

                user.Email = model.Email;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Email updated successfully." });
            }
            return BadRequest(new { message = "User not found or email already set." });
        }

        [HttpPost("forgotpassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordModel model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Email not found." });
            }

            var token = Guid.NewGuid().ToString();
            var resetToken = new PasswordResetTokens
            {
                UserId = user.UserId,
                Token = token,
                ExpiryDate = DateTime.UtcNow.AddHours(1),
                IsUsed = false
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            // Ở đây nên gửi email với link chứa token, ví dụ: https://yourdomain.com/resetpassword?token={token}
            // Để đơn giản, trả về token để sử dụng thủ công
            return Ok(new { message = "Password reset token generated.", token });
        }

        [HttpPost("resetpassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel model)
        {
            var resetToken = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.Token == model.Token && !t.IsUsed && t.ExpiryDate > DateTime.UtcNow);

            if (resetToken == null)
            {
                return BadRequest(new { message = "Invalid or expired token." });
            }

            var user = await _context.Users.FindAsync(resetToken.UserId);
            if (user == null)
            {
                return BadRequest(new { message = "User not found." });
            }

            if (model.NewPassword != model.ConfirmNewPassword)
            {
                return BadRequest(new { message = "Passwords do not match." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
            resetToken.IsUsed = true;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset successful." });
        }
        [HttpGet]
[Authorize] // Yêu cầu token hợp lệ
public async Task<IActionResult> GetUser()
{
    try
    {
        // Lấy UserId từ token JWT
        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            _logger.LogWarning("No user ID found in token.");
            return Unauthorized(new { message = "Invalid token." });
        }

        if (!int.TryParse(userIdClaim, out int userId))
        {
            _logger.LogWarning("Invalid user ID in token: {UserId}", userIdClaim);
            return Unauthorized(new { message = "Invalid user ID in token." });
        }

        // Lấy thông tin người dùng từ database
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
        {
            _logger.LogWarning("User not found for ID: {UserId}", userId);
            return NotFound(new { message = "User not found." });
        }

        // Trả về thông tin người dùng
        var userData = new
        {
            name = user.FullName,
            email = user.Email,
            phone = user.Phone,
            birthdate = user.Birthday?.ToString("dd/MM/yyyy")
        };

        _logger.LogInformation("User data retrieved successfully for ID: {UserId}", userId);
        return Ok(userData);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving user data for token.");
        return StatusCode(500, new { message = "An error occurred while retrieving user data.", details = ex.Message });
    }
}

        private string GenerateJwtToken(Users user)
        {
            var jwtKey = _configuration["Jwt:SecretKey"]; // Sửa từ "Jwt:Key" thành "Jwt:SecretKey" để khớp với appsettings.json
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("JWT Key is not configured in appsettings.json.");
            }

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Role, user.Role ?? "Customer")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(30),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}