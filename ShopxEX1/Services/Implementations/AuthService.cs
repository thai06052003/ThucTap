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
using System.Text.Json;

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
            var user = await _context.Users
                                     .AsNoTracking() // Có thể dùng AsNoTracking vì chỉ đọc để tạo token
                                     .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            // Nên kiểm tra user != null trước khi truy cập user.IsActive
            if (user == null || !user.IsActive || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                // _logger?.LogWarning("Login failed for email {Email}: Invalid credentials or inactive account.", loginDto.Email);
                return new AuthResultDto { Success = false, Message = "Email hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa." };
            }

            // Tạo Access Token
            var accessTokenResult = GenerateJwtToken(user);

            // Không còn Refresh Token
            // Không cần SaveChanges ở đây nếu không cập nhật gì khác trên User

            // _logger?.LogInformation("User {UserId} logged in successfully.", user.UserID);
            return new AuthResultDto
            {
                Success = true,
                Token = accessTokenResult.Token,
                Expiration = accessTokenResult.Expiration,
                // RefreshToken = null, // Loại bỏ trường này khỏi DTO
                User = _mapper.Map<UserDto>(user),
                Message = "Đăng nhập thành công."
            };
        }

        public async Task<AuthResultDto> SocialLoginAsync(SocialLoginRequestDto socialLoginDto)
        {
            // Kiểm tra email trước
            var user = await _context.Users
                                     .Include(u => u.SellerProfile)
                                     .FirstOrDefaultAsync(u => u.Email == socialLoginDto.Email);

            bool isNewUser = false;

            if (user == null)
            {
                // Không tìm thấy user với email này -> tạo mới
                isNewUser = true;
                user = _mapper.Map<User>(socialLoginDto);
                user.PasswordHash = $"SOCIAL_LOGIN_{Guid.NewGuid()}"; // Placeholder
                user.IsActive = true;
                user.CreatedAt = DateTime.UtcNow;
                _context.Users.Add(user);
            }
            else
            {
                // Tìm thấy user với email này -> kiểm tra và cập nhật thông tin social
                if (string.IsNullOrEmpty(user.SocialProvider) || string.IsNullOrEmpty(user.SocialID))
                {
                    // User chưa có social account -> liên kết
                    user.SocialProvider = socialLoginDto.Provider;
                    user.SocialID = socialLoginDto.UserId;
                    _context.Users.Update(user);
                }
                else if (user.SocialProvider != socialLoginDto.Provider || user.SocialID != socialLoginDto.UserId)
                {
                    // User đã có social account khác -> báo lỗi
                    return new AuthResultDto 
                    { 
                        Success = false, 
                        Message = $"Email {socialLoginDto.Email} đã được liên kết với một tài khoản {user.SocialProvider} khác." 
                    };
                }
            }

            if (!user.IsActive)
            {
                return new AuthResultDto { Success = false, Message = "Tài khoản của bạn đang bị khóa." };
            }

            try
            {
                await _context.SaveChangesAsync();
                var accessTokenResult = GenerateJwtToken(user);

                return new AuthResultDto
                {
                    Success = true,
                    Token = accessTokenResult.Token,
                    Expiration = accessTokenResult.Expiration,
                    User = _mapper.Map<UserDto>(user),
                    Message = isNewUser ? "Đăng ký bằng mạng xã hội thành công." : "Đăng nhập bằng mạng xã hội thành công."
                };
            }
            catch (Exception ex)
            {
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
                return new AuthResultDto { Success = false, Message = $"Đã xảy ra lỗi trong quá trình đăng ký: {ex.Message}" };
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

            // Kiểm tra trạng thái active trước khi cho đổi pass
            if (!user.IsActive)
            {
                // _logger?.LogWarning("Change password attempt for inactive user {UserId}", userId);
                throw new InvalidOperationException("Tài khoản này hiện đang bị khóa.");
            }

            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash))
            {
                // _logger?.LogWarning("Change password failed for user {UserId}: Incorrect current password.", userId);
                throw new UnauthorizedAccessException("Mật khẩu hiện tại không chính xác.");
            }

            if (changePasswordDto.NewPassword != changePasswordDto.ConfirmNewPassword)
            {
                throw new ArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            _context.Users.Update(user);

            // Không cần thu hồi refresh token nữa

            try
            {
                var result = await _context.SaveChangesAsync() > 0;
                // if(result) _logger?.LogInformation("Password changed successfully for user {UserId}", userId);
                return result;
            }
            catch (Exception ex)
            {
                // _logger?.LogError(ex, "Error changing password for user {UserId}", userId);
                throw new Exception("Đã xảy ra lỗi khi cập nhật mật khẩu.", ex);
            }
        }

        // --- RequestPasswordResetAsync và ResetPasswordAsync không thay đổi nhiều ---
        // Chúng vẫn dùng bảng PasswordResetToken riêng, không liên quan refresh token


        // --- Hàm Tạo Token JWT (Giữ nguyên) ---
        private (string Token, DateTime Expiration) GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var jwtKey = jwtSettings["Key"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            // Tăng thời gian hết hạn của Access Token vì không có Refresh Token
            var expiryInMinutes = jwtSettings.GetValue<int>("ExpiryInMinutes", 1200); // Ví dụ: 60 phút

            if (string.IsNullOrEmpty(jwtKey)) throw new InvalidOperationException("JWT Key chưa được cấu hình.");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim> {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()), // Thường giống Sub
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                // Jti không còn cần thiết cho blacklist
                // new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (user.Role == "Seller" && user.SellerProfile != null)
            {
                claims.Add(new Claim("SellerId", user.SellerProfile.SellerID.ToString()));
            }

            var expires = DateTime.UtcNow.AddMinutes(expiryInMinutes); // Nên dùng UtcNow
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

        public async Task<AuthResultDto> UpdateProfileAsync(int userId, UpdateProfileDto updateDto)
        {
            try
            {
                Console.WriteLine($"Bắt đầu cập nhật thông tin cho user {userId}");
                
                // Sử dụng AsTracking để đảm bảo Entity Framework theo dõi thay đổi
                var user = await _context.Users
                    .AsTracking()
                    .FirstOrDefaultAsync(u => u.UserID == userId);

                if (user == null)
                {
                    Console.WriteLine($"Không tìm thấy user với ID {userId}");
                    return new AuthResultDto { Success = false, Message = "Không tìm thấy người dùng" };
                }

                Console.WriteLine($"Thông tin user trước khi cập nhật: {JsonSerializer.Serialize(user)}");

                // Kiểm tra email mới có bị trùng không
                if (!string.IsNullOrEmpty(updateDto.Email) && updateDto.Email != user.Email)
                {
                    Console.WriteLine($"Kiểm tra email mới: {updateDto.Email}");
                    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == updateDto.Email);
                    if (existingUser != null)
                    {
                        Console.WriteLine($"Email {updateDto.Email} đã tồn tại");
                        return new AuthResultDto { Success = false, Message = "Email already exists." };
                    }
                    user.Email = updateDto.Email;
                }

                // Cập nhật thông tin
                Console.WriteLine($"Cập nhật thông tin: {JsonSerializer.Serialize(updateDto)}");
                user.FullName = updateDto.FullName;
                if (!string.IsNullOrEmpty(updateDto.Phone)) user.Phone = updateDto.Phone;
                if (!string.IsNullOrEmpty(updateDto.Birthday)) 
                {
                    if (DateTime.TryParse(updateDto.Birthday, out DateTime birthday))
                    {
                        user.Birthday = birthday;
                        Console.WriteLine($"Đã cập nhật ngày sinh: {birthday}");
                    }
                    else
                    {
                        Console.WriteLine($"Không thể parse ngày sinh: {updateDto.Birthday}");
                        return new AuthResultDto { Success = false, Message = "Định dạng ngày sinh không hợp lệ" };
                    }
                }
                if (updateDto.Gender.HasValue) user.Gender = updateDto.Gender.Value;
                if (!string.IsNullOrEmpty(updateDto.Address)) user.Address = updateDto.Address;

                Console.WriteLine($"Thông tin user sau khi cập nhật: {JsonSerializer.Serialize(user)}");

                // Đánh dấu entity đã thay đổi
                _context.Entry(user).State = EntityState.Modified;

                try
                {
                    // Lưu thay đổi và kiểm tra kết quả
                    var result = await _context.SaveChangesAsync();
                    Console.WriteLine($"Lưu thay đổi thành công, số bản ghi bị ảnh hưởng: {result}");

                    if (result <= 0)
                    {
                        Console.WriteLine("Không có thay đổi nào được lưu vào database");
                        return new AuthResultDto { Success = false, Message = "Không thể lưu thay đổi vào database" };
                    }

                    // Refresh entity từ database để đảm bảo dữ liệu mới nhất
                    await _context.Entry(user).ReloadAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi lưu thay đổi: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    throw;
                }

                // Map user to UserDto
                var userDto = _mapper.Map<UserDto>(user);
                Console.WriteLine($"Đã map user sang DTO: {JsonSerializer.Serialize(userDto)}");

                return new AuthResultDto
                {
                    Success = true,
                    Message = "Cập nhật thông tin thành công",
                    User = userDto
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi UpdateProfile: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return new AuthResultDto { Success = false, Message = "Lỗi hệ thống khi cập nhật thông tin" };
            }
        }
    }
}
