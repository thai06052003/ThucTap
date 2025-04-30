using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Services
{
    // Interface cho các dịch vụ quản lý thông tin người dùng (Profile)
    public interface IUserService
    {
         // Lấy thông tin profile của người dùng đang đăng nhập.
         Task<UserDto?> GetUserProfileAsync(int userId);
        // Người dùng tự cập nhật thông tin profile của mình.
        Task<bool> UpdateUserProfileAsync(int userId, UserProfileUpdateDto userProfileUpdateDto);
    }
}
