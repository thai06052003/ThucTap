using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.Json;
using Microsoft.IdentityModel.Tokens;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ShopxEX1.Services.Implementations
{
    public class AuthService : IAuthService // Đảm bảo IAuthService cũng được cập nhật tương ứng
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        // private readonly ILogger<AuthService> _logger; // Nên thêm Logger

        public AuthService(AppDbContext context, IMapper mapper, IConfiguration configuration /*, ILogger<AuthService> logger */)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            // _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // Đăng nhập
        public async Task<AuthResultDto> LoginAsync(LoginDto loginDto)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
                if (user == null)
                {
                    return new AuthResultDto { Success = false, Message = "Email hoặc mật khẩu không đúng." };
                }

                if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                {
                    return new AuthResultDto { Success = false, Message = "Email hoặc mật khẩu không đúng." };
                }

                var tokenResult = GenerateJwtToken(user);
                return new AuthResultDto
                {
                    Success = true,
                    Message = "Đăng nhập thành công.",
                    Token = tokenResult.Token,
                    Expiration = tokenResult.Expiration,
                    User = new UserDto
                    {
                        UserID = user.UserID,
                        FullName = user.FullName,
                        Email = user.Email,
                        Phone = user.Phone,
                        Address = user.Address,
                        Role = user.Role,
                        CreatedAt = user.CreatedAt,
                        IsActive = user.IsActive
                    }
                };
            }
            catch (Exception ex)
            {
                // Log the exception if needed
                Console.WriteLine($"Lỗi khi đăng nhập: {ex.Message}, StackTrace: {ex.StackTrace}");
                Console.WriteLine($"Lỗi khi đăng nhập: {ex.Message}");
                return new AuthResultDto { Success = false, Message = "Lỗi hệ thống khi đăng nhập." };
            }
        }

        public async Task<AuthResultDto> SocialLoginAsync(SocialLoginRequestDto socialLoginDto)
        {
            var user = await _context.Users
                                     .Include(u => u.SellerProfile) // Vẫn cần nếu SellerId là claim
                                     .FirstOrDefaultAsync(u => u.SocialProvider == socialLoginDto.Provider &&
                                                            u.SocialID == socialLoginDto.UserId);
            bool isNewUser = false;

            if (user == null)
            {
                user = await _context.Users
                                     .Include(u => u.SellerProfile)
                                     .FirstOrDefaultAsync(u => u.Email == socialLoginDto.Email);

                if (user != null) // Tìm thấy bằng email, cần liên kết
                {
                    if (string.IsNullOrEmpty(user.SocialProvider) || string.IsNullOrEmpty(user.SocialID))
                    {
                        // _logger?.LogInformation("Linking social account {Provider}:{SocialUserId} to existing email {Email}", socialLoginDto.Provider, socialLoginDto.UserId, user.Email);
                        user.SocialProvider = socialLoginDto.Provider;
                        user.SocialID = socialLoginDto.UserId;
                        _context.Users.Update(user); // Đánh dấu để cập nhật
                    }
                    else if (user.SocialProvider != socialLoginDto.Provider || user.SocialID != socialLoginDto.UserId)
                    {
                        // _logger?.LogWarning("Social login conflict for email {Email}. Already linked to {ExistingProvider}.", user.Email, user.SocialProvider);
                        return new AuthResultDto { Success = false, Message = $"Email {socialLoginDto.Email} đã được liên kết với một tài khoản {user.SocialProvider} khác." };
                    }
                    // Nếu khớp hoàn toàn thì không cần làm gì
                }
                else // Không tìm thấy -> Tạo user mới
                {
                    isNewUser = true;
                    user = new User
                    {
                        Email = socialLoginDto.Email,
                        FullName = socialLoginDto.Email.Split('@')[0], // Tạm thời lấy phần trước @ làm tên
                        PasswordHash = $"SOCIAL_LOGIN_{Guid.NewGuid()}", // Placeholder
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        SocialProvider = socialLoginDto.Provider,
                        SocialID = socialLoginDto.UserId,
                        Role = "Customer"
                    };
                    _context.Users.Add(user);
                }
            }

            if (!user.IsActive)
            {
                // _logger?.LogWarning("Social login attempt for inactive user {UserId} ({Email})", user.UserID, user.Email);
                return new AuthResultDto { Success = false, Message = "Tài khoản của bạn đang bị khóa." };
            }

            // === Tạo Token và trả về ===
            try
            {
                // Lưu thay đổi (Cập nhật liên kết hoặc tạo user mới)
                // Cần SaveChanges *trước* khi tạo token nếu user là mới để có UserID
                await _context.SaveChangesAsync();

                var accessTokenResult = GenerateJwtToken(user); // Tạo token sau khi có UserID (nếu là user mới)

                // Không còn Refresh Token

                // _logger?.LogInformation("Social login successful for user {UserId} ({Email}). New user: {IsNewUser}", user.UserID, user.Email, isNewUser);
                return new AuthResultDto
                {
                    Success = true,
                    Token = accessTokenResult.Token,
                    Expiration = accessTokenResult.Expiration,
                    // RefreshToken = null, // Loại bỏ
                    User = _mapper.Map<UserDto>(user),
                    Message = isNewUser ? "Đăng ký bằng mạng xã hội thành công." : "Đăng nhập bằng mạng xã hội thành công."
                };
            }
            catch (Exception ex)
            {
                // _logger?.LogError(ex, "Error processing social login for email {Email}", socialLoginDto.Email);
                throw new Exception("Đã xảy ra lỗi trong quá trình đăng nhập bằng mạng xã hội.", ex);
            }
        }

        // Đăng kí - **SỬA ĐỔI:** Trả về token để tự động đăng nhập
        public async Task<AuthResultDto> RegisterAsync(RegisterDto registerDto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
            {
                // _logger?.LogWarning("Registration attempt with existing email: {Email}", registerDto.Email);
                return new AuthResultDto { Success = false, Message = $"Email '{registerDto.Email}' đã được sử dụng." };
            }
            if (registerDto.Password != registerDto.ConfirmPassword)
            {
                return new AuthResultDto { Success = false, Message = "Mật khẩu và xác nhận mật khẩu không khớp." };
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);
            var newUser = _mapper.Map<User>(registerDto);
            newUser.PasswordHash = passwordHash;
            newUser.Role = "Customer";
            newUser.IsActive = true;
            newUser.CreatedAt = DateTime.UtcNow; // Sử dụng UtcNow cho nhất quán

            _context.Users.Add(newUser);

            // Không cần transaction phức tạp nếu không tạo Cart ở đây
            try
            {
                await _context.SaveChangesAsync(); // Lưu User để có ID

                // TẠO TOKEN NGAY SAU KHI ĐĂNG KÝ
                var accessTokenResult = GenerateJwtToken(newUser);

                // _logger?.LogInformation("User registered successfully: {UserId} ({Email})", newUser.UserID, newUser.Email);
                return new AuthResultDto
                {
                    Success = true,
                    Token = accessTokenResult.Token, // Trả về token
                    Expiration = accessTokenResult.Expiration,
                    User = _mapper.Map<UserDto>(newUser),
                    Message = "Đăng ký thành công và đã đăng nhập."
                };
            }
            catch (Exception ex)
            {
                // _logger?.LogError(ex, "Error during user registration for email {Email}", registerDto.Email);
                return new AuthResultDto { Success = false, Message = "Đã xảy ra lỗi trong quá trình đăng ký." };
            }
        }

        // Đăng xuất - **SỬA ĐỔI:** Không còn gì để làm ở server
        public Task LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiry)
        {
            // Không còn blacklist hay refresh token để thu hồi.
            // Logout là việc của client (xóa token đã lưu).
            // _logger?.LogInformation("Logout requested for user {UserId}. No server-side action taken (stateless).", userId);
            return Task.CompletedTask; // Trả về một Task đã hoàn thành
        }

        // Đổi mật khẩu - **SỬA ĐỔI:** Bỏ thu hồi refresh token
        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException($"Không tìm thấy người dùng.");

            if (!user.IsActive)
            {
                throw new InvalidOperationException("Tài khoản này hiện đang bị khóa.");
            }

            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Mật khẩu hiện tại không chính xác.");
            }

            if (changePasswordDto.NewPassword != changePasswordDto.ConfirmNewPassword)
            {
                throw new ArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            _context.Users.Update(user);

            try
            {
                return await _context.SaveChangesAsync() > 0;
            }
            catch
            {
                throw new Exception("Đã xảy ra lỗi khi cập nhật mật khẩu.");
            }
        }

        // --- RequestPasswordResetAsync và ResetPasswordAsync không thay đổi nhiều ---
        // Chúng vẫn dùng bảng PasswordResetToken riêng, không liên quan refresh token


        // --- Hàm Tạo Token JWT (Giữ nguyên) ---
        private (string Token, DateTime Expiration) GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:SecretKey"];
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var expiryInMinutes = _configuration.GetValue<int>("Jwt:ExpiryInMinutes", 60);

            if (string.IsNullOrEmpty(jwtKey)) throw new InvalidOperationException("JWT Key chưa được cấu hình.");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim> {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Exp, DateTimeOffset.UtcNow.AddMinutes(expiryInMinutes).ToUnixTimeSeconds().ToString())
            };

            if (user.Role == "Seller" && user.SellerProfile != null)
            {
                claims.Add(new Claim("SellerId", user.SellerProfile.SellerID.ToString()));
            }

            var expires = DateTime.UtcNow.AddMinutes(expiryInMinutes);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = credentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);
            return (tokenString, expires);
        }

        public Task<PasswordResetResultDto> RequestPasswordResetAsync(RequestPasswordResetDto resetRequestDto)
        {
            throw new NotImplementedException();
        }

        public Task<PasswordResetResultDto> ResetPasswordAsync(PasswordResetDto resetDto)
        {
            throw new NotImplementedException();
        }

        public Task<RefreshTokenResultDto> RefreshTokenAsync(RefreshTokenRequestDto refreshTokenDto)
        {
            throw new NotImplementedException();
        }

        public Task<bool> CheckRefreshTokenValidityAsync(int userId)
        {
            throw new NotImplementedException();
        }
    }
}
