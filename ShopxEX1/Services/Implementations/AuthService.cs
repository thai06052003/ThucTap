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
using System.Text.Json.Serialization;

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
                                    .Include(u => u.SellerProfile) // Nếu cần SellerProfile
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
            return new AuthResultDto
            {
                Success = true,
                Token = accessTokenResult.Token,
                Expiration = accessTokenResult.Expiration,
                User = userDto,
                Message = "Đăng nhập thành công."
            };


            return result;
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
        //updateProfileAsync
        

        // --- RequestPasswordResetAsync và ResetPasswordAsync không thay đổi nhiều ---
        // Chúng vẫn dùng bảng PasswordResetToken riêng, không liên quan refresh token
        

        // --- Hàm Tạo Token JWT (Giữ nguyên) ---
        private (string Token, DateTime Expiration) GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var jwtKey = jwtSettings["SecretKey"];
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
        
        var user = await _context.Users
            .Include(u => u.SellerProfile)
            .AsTracking()
            .FirstOrDefaultAsync(u => u.UserID == userId);

        if (user == null)
        {
            Console.WriteLine($"Không tìm thấy user với ID {userId}");
            return new AuthResultDto { Success = false, Message = "Không tìm thấy người dùng" };
        }

        // Configure JsonSerializerOptions to handle circular references
        var jsonOptions = new JsonSerializerOptions
        {
            ReferenceHandler = ReferenceHandler.Preserve,
            WriteIndented = true // Optional, for readable output
        };

        Console.WriteLine($"Thông tin user trước khi cập nhật: {JsonSerializer.Serialize(user, jsonOptions)}");

        // Kiểm tra email mới có bị trùng không
        if (!string.IsNullOrEmpty(updateDto.Email) && updateDto.Email != user.Email)
        {
            Console.WriteLine($"Kiểm tra email mới: {updateDto.Email}");
            if (!IsValidEmail(updateDto.Email))
            {
                return new AuthResultDto { Success = false, Message = "Định dạng email không hợp lệ" };
            }
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == updateDto.Email);
            if (existingUser != null)
            {
                Console.WriteLine($"Email {updateDto.Email} đã tồn tại");
                return new AuthResultDto { Success = false, Message = "Email đã tồn tại" };
            }
            user.Email = updateDto.Email;
        }

        // Cập nhật thông tin cá nhân
        Console.WriteLine($"Cập nhật thông tin: {JsonSerializer.Serialize(updateDto, jsonOptions)}");
        user.FullName = updateDto.FullName;
        if (!string.IsNullOrEmpty(updateDto.Phone)) user.Phone = updateDto.Phone;
        if (!string.IsNullOrEmpty(updateDto.Birthday)) 
        {
            if (DateTime.TryParse(updateDto.Birthday, out DateTime birthday))
            {
                if (birthday > DateTime.UtcNow)
                {
                    return new AuthResultDto { Success = false, Message = "Ngày sinh không được là ngày trong tương lai" };
                }
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
        if (!string.IsNullOrEmpty(updateDto.Avatar)) 
        {
            user.Avatar = updateDto.Avatar;
            Console.WriteLine($"Đã cập nhật avatar: {updateDto.Avatar}");
        }        // Xử lý vai trò
        if (!string.IsNullOrEmpty(updateDto.Role))
        {
            // Chuẩn hóa role: chuyển đổi thành chữ hoa đầu tiên
            updateDto.Role = char.ToUpper(updateDto.Role[0]) + updateDto.Role.Substring(1).ToLower();
            Console.WriteLine($"Role sau khi chuẩn hóa: {updateDto.Role}");
            
            string oldRole = user.Role;            if (updateDto.Role == "Seller")
            {                if (user.Role != "Seller")
                {
                    // Cập nhật role thành Seller
                    user.Role = "Seller";
                    _context.Entry(user).Property(u => u.Role).IsModified = true;
                    
                    // Đồng thời đánh dấu toàn bộ entity để đảm bảo các thay đổi được theo dõi
                    _context.Entry(user).State = EntityState.Modified;
                    
                    Console.WriteLine($"Đã cập nhật vai trò thành Seller cho user {userId}");
                    
                    // Kiểm tra xem đã từng có SellerProfile chưa (bất kể IsActive=0 hay 1)
                    var existingSellerProfile = await _context.Sellers
                        .FirstOrDefaultAsync(s => s.UserID == userId);
                    
                    if (existingSellerProfile != null)
                    {
                        // Đã từng có SellerProfile, kích hoạt lại
                        Console.WriteLine($"Kích hoạt lại SellerProfile với ID: {existingSellerProfile.SellerID}");
                        
                        // Cập nhật trong entity
                        existingSellerProfile.IsActive = true;
                        _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;
                        
                        if (!string.IsNullOrEmpty(updateDto.ShopName))
                        {
                            existingSellerProfile.ShopName = updateDto.ShopName;
                            _context.Entry(existingSellerProfile).Property(s => s.ShopName).IsModified = true;
                        }
                          // Cập nhật trực tiếp qua SQL để đảm bảo
                        string updateSellerSql = $"UPDATE Sellers SET IsActive = 1";
                        
                        if (!string.IsNullOrEmpty(updateDto.ShopName))
                        {
                            updateSellerSql += $", ShopName = '{updateDto.ShopName}'";
                        }
                        
                        updateSellerSql += $" WHERE UserID = {userId}";
                        
                        await _context.Database.ExecuteSqlRawAsync(updateSellerSql);
                        Console.WriteLine($"Đã cập nhật IsActive = 1 cho SellerProfile hiện có");
                    }
                    else if (user.SellerProfile == null)
                    {
                        // Tạo mới SellerProfile vì chưa từng có
                        Console.WriteLine($"Tạo mới SellerProfile cho user {userId}");
                        
                        // Sử dụng DbSet để tạo mới SellerProfile
                        var shopName = !string.IsNullOrEmpty(updateDto.ShopName) ? updateDto.ShopName : $"{user.FullName}'s Shop";
                          // Sử dụng câu lệnh SQL trực tiếp để tạo SellerProfile
                        string sql = $@"
                            INSERT INTO Sellers (UserID, ShopName, CreatedAt, IsActive) 
                            VALUES ({userId}, '{shopName}', '{DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")}', 1);
                            SELECT SCOPE_IDENTITY();";
                            
                        var sellerId = await _context.Database.ExecuteSqlRawAsync(sql);
                        Console.WriteLine($"Đã tạo mới SellerProfile với ID: {sellerId}, ShopName: {shopName}");
                        
                        // Refresh entity để lấy SellerProfile mới tạo
                        await _context.Entry(user).ReloadAsync();
                    }                    else if (!string.IsNullOrEmpty(updateDto.ShopName))
                    {
                        user.SellerProfile.ShopName = updateDto.ShopName;
                        Console.WriteLine($"Đã cập nhật ShopName: {updateDto.ShopName}");
                    }
                    else
                    {
                        // SellerProfile đã tồn tại, chỉ cập nhật IsActive = 1
                        user.SellerProfile.IsActive = true;
                        _context.Entry(user.SellerProfile).State = EntityState.Modified;
                          // Đảm bảo IsActive được cập nhật bằng SQL trực tiếp
                        string updateSellerSql = $"UPDATE Sellers SET IsActive = 1 WHERE UserID = {userId}";
                        await _context.Database.ExecuteSqlRawAsync(updateSellerSql);
                        Console.WriteLine($"Đã cập nhật IsActive = 1 cho SellerProfile hiện có");
                    }
                }                else if (!string.IsNullOrEmpty(updateDto.ShopName))
                {
                    // Chỉ cập nhật ShopName nếu người dùng đã là Seller và có SellerProfile
                    var existingSellerProfile = await _context.Sellers
                        .FirstOrDefaultAsync(s => s.UserID == userId);
                        
                    if (existingSellerProfile != null) 
                    {
                        // Cập nhật trong entity
                        existingSellerProfile.ShopName = updateDto.ShopName;
                        existingSellerProfile.IsActive = true; // Đảm bảo là active
                        
                        _context.Entry(existingSellerProfile).Property(s => s.ShopName).IsModified = true;
                        _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;
                          // Cập nhật SQL trực tiếp
                        string updateShopNameSql = $"UPDATE Sellers SET ShopName = '{updateDto.ShopName}', IsActive = 1 WHERE UserID = {userId}";
                        await _context.Database.ExecuteSqlRawAsync(updateShopNameSql);
                        
                        Console.WriteLine($"Đã cập nhật ShopName: {updateDto.ShopName} và IsActive = 1");
                    }
                }
            }            else if (updateDto.Role == "Customer")
            {
                // Cập nhật role thành Customer
                user.Role = "Customer";
                _context.Entry(user).Property(u => u.Role).IsModified = true;
                _context.Entry(user).State = EntityState.Modified;
                Console.WriteLine($"Đã cập nhật vai trò thành Customer cho user {userId}");
                
                // Xử lý SellerProfile khi user chuyển từ Seller về Customer
                // Truy vấn trực tiếp để lấy SellerProfile hiện tại (kể cả inactive)
                var existingSellerProfile = await _context.Sellers
                    .FirstOrDefaultAsync(s => s.UserID == userId);
                
                if (existingSellerProfile != null)
                {
                    // Có SellerProfile - cập nhật IsActive = 0 thay vì xóa
                    Console.WriteLine($"Tìm thấy SellerProfile với ID {existingSellerProfile.SellerID}, đặt IsActive = 0");
                      existingSellerProfile.IsActive = false;
                    _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;
                    
                    // Thực hiện cập nhật SQL trực tiếp để đảm bảo
                    string updateSellerSql = $"UPDATE Sellers SET IsActive = 0 WHERE UserID = {userId}";
                    await _context.Database.ExecuteSqlRawAsync(updateSellerSql);
                    Console.WriteLine($"Đã thực hiện SQL để cập nhật IsActive = 0 cho SellerProfile");
                    
                    // Cập nhật biến user.SellerProfile để phản ánh thay đổi nếu có
                    if (user.SellerProfile != null)
                    {
                        user.SellerProfile.IsActive = false;
                    }
                }
                
                // Đảm bảo cập nhật mà không bị ảnh hưởng bởi tracking của EF Core
                await _context.SaveChangesAsync();
                
                // Lưu role Customer trực tiếp qua SQL để đảm bảo
                string updateRoleSql = $"UPDATE Users SET Role = 'Customer' WHERE UserID = {userId}";
                await _context.Database.ExecuteSqlRawAsync(updateRoleSql);
                Console.WriteLine($"Đã cập nhật trực tiếp Role = Customer qua SQL");
            }
              // Thử cập nhật Role ngay lập tức bằng SQL nếu có thay đổi
            if (oldRole != user.Role)
            {
                // Đảm bảo sử dụng giá trị đã chuẩn hóa
                string updateRoleSql = $"UPDATE Users SET Role = '{user.Role}' WHERE UserID = {userId}";
                var roleUpdateResult = await _context.Database.ExecuteSqlRawAsync(updateRoleSql);
                Console.WriteLine($"Cập nhật trực tiếp Role qua SQL: {roleUpdateResult} bản ghi bị ảnh hưởng");
            }
        }

        Console.WriteLine($"Thông tin user sau khi cập nhật: {JsonSerializer.Serialize(user, jsonOptions)}");        try
        {
            // Trước khi lưu, kiểm tra lại trạng thái của entity
            Console.WriteLine($"Trước khi SaveChanges - Trạng thái entity: {_context.Entry(user).State}");
            Console.WriteLine($"IsModified cho Role: {_context.Entry(user).Property(u => u.Role).IsModified}");
            Console.WriteLine($"Giá trị Role hiện tại: {user.Role}");
            
            // Thêm khối try-catch cho việc update trực tiếp Role nếu SaveChanges không thành công
            var result = await _context.SaveChangesAsync();
            Console.WriteLine($"Lưu thay đổi thành công, số bản ghi bị ảnh hưởng: {result}");            // Kiểm tra xem Role đã được cập nhật chưa
            var updatedUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserID == userId);
            Console.WriteLine($"Sau khi SaveChanges - Giá trị Role trong database: {updatedUser?.Role}");
            
            if ((result <= 0 || (updatedUser != null && updatedUser.Role != updateDto.Role)) && !string.IsNullOrEmpty(updateDto.Role))
            {
                Console.WriteLine("Role chưa được cập nhật đúng, thử sử dụng SQL trực tiếp");
                // Sử dụng SQL trực tiếp nếu EntityFramework không thành công hoặc không cập nhật đúng Role
                // Đảm bảo sử dụng giá trị chuẩn hóa cho update SQL
                string updateRoleSql = $"UPDATE Users SET Role = '{updateDto.Role}' WHERE UserID = {userId}";
                result = await _context.Database.ExecuteSqlRawAsync(updateRoleSql);
                Console.WriteLine($"Kết quả SQL update trực tiếp: {result}");
                
                if (result <= 0)
                {
                    Console.WriteLine("Không có thay đổi nào được lưu vào database");
                    return new AuthResultDto { Success = false, Message = "Không thể lưu thay đổi vào database" };
                }
            }

            // Reload để lấy dữ liệu mới nhất từ DB
            await _context.Entry(user).ReloadAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Lỗi khi lưu thay đổi: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }        // Lấy dữ liệu mới nhất từ database sau khi đã lưu mọi thay đổi
        await _context.Entry(user).ReloadAsync();
        
        // Truy vấn lại từ database để chắc chắn có thông tin mới nhất
        user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserID == userId);
            
        // Truy vấn trực tiếp Role từ database để đảm bảo lấy đúng giá trị hiện tại
        var roleInDb = await _context.Users
            .AsNoTracking()
            .Where(u => u.UserID == userId)
            .Select(u => u.Role)
            .FirstOrDefaultAsync();
            
        Console.WriteLine($"Role trong database sau khi reload: {roleInDb}");
            
        // Truy vấn trực tiếp SellerProfile từ database với điều kiện IsActive
        var sellerProfile = await _context.Sellers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserID == userId);
            
        Console.WriteLine($"SellerProfile: {(sellerProfile != null ? $"ID={sellerProfile.SellerID}, IsActive={sellerProfile.IsActive}" : "không tồn tại")}");
        
        // Tạo DTO với thông tin chính xác từ database
        var userDto = _mapper.Map<UserDto>(user);
        
        // Đảm bảo gán đúng Role từ database
        userDto.Role = roleInDb;
        
        // Chỉ thêm thông tin Seller nếu role là Seller VÀ có SellerProfile active
        if (roleInDb == "Seller" && sellerProfile != null && sellerProfile.IsActive)
        {
            userDto.SellerID = sellerProfile.SellerID;
            userDto.ShopName = sellerProfile.ShopName;
            Console.WriteLine($"Role là Seller, có SellerProfile active với ID: {sellerProfile.SellerID}");
        }
        else
        {
            // Đảm bảo DTO không có thông tin seller
            userDto.SellerID = 0;
            userDto.ShopName = null;
            Console.WriteLine($"Role là {roleInDb} hoặc SellerProfile không active, không gán thông tin seller");
        }
        
        Console.WriteLine($"Đã map user sang DTO: {JsonSerializer.Serialize(userDto, jsonOptions)}");        // Tạo lại user object với dữ liệu mới nhất từ database
        var freshUser = await _context.Users
            .Include(u => u.SellerProfile)
            .AsNoTracking() 
            .FirstOrDefaultAsync(u => u.UserID == userId);
            
        // Tạo token mới với user có thông tin mới nhất
        var newAccessTokenResult = GenerateJwtToken(freshUser);
        
        // Log thông tin để debug
        Console.WriteLine($"Token mới được tạo với Role={freshUser.Role}");
        
        if (freshUser.Role == "Seller" && freshUser.SellerProfile != null && freshUser.SellerProfile.IsActive) {
            Console.WriteLine($"Token mới chứa claim SellerId={freshUser.SellerProfile.SellerID}");
        }

        return new AuthResultDto
        {
            Success = true,
            Message = "Cập nhật thông tin thành công",
            User = userDto,
            Token = newAccessTokenResult.Token,
            Expiration = newAccessTokenResult.Expiration
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Lỗi UpdateProfile: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return new AuthResultDto { Success = false, Message = "Lỗi hệ thống khi cập nhật thông tin" };
    }
}

// Hàm helper để kiểm tra định dạng email
private bool IsValidEmail(string email)
{
    try
    {
        var addr = new System.Net.Mail.MailAddress(email);
        return addr.Address == email;
    }
    catch
    {
        return false;
    }
}
    }
}
