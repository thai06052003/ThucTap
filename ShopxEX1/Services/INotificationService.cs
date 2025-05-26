using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;  // Thêm using này
using ShopxEX1.Models;

namespace ShopxEX1.Services.Interfaces
{
    public interface INotificationService
    {
        // Admin operations
        Task<PagedResult<NotificationDto>> GetAdminNotificationsAsync(
            int pageNumber, int pageSize, string? search, string? type,
            DateTime? dateFrom, DateTime? dateTo);
        Task<NotificationDto?> GetNotificationByIdAsync(int id);
        Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto, int createdBy);
        Task<NotificationDto> UpdateNotificationAsync(int id, UpdateNotificationDto dto);
        Task<bool> DeleteNotificationAsync(int id);
        Task<bool> SendNotificationAsync(int notificationId);

        // User operations
        Task<PagedResult<UserNotificationDto>> GetUserNotificationsAsync(
            int userId, string userType, int pageNumber, int pageSize, bool unreadOnly);
        Task<bool> MarkAsReadAsync(int userNotificationId, int userId);
        Task<bool> DeleteUserNotificationAsync(int userNotificationId, int userId);
        Task<int> GetUnreadCountAsync(int userId, string userType);
        Task<int> GetRecipientCountAsync(string targetAudience);
        Task<object> GetNotificationStatsAsync(int notificationId);

    }
}