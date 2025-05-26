using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using ShopxEX1.Services.Interfaces;

namespace ShopxEX1.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public NotificationService(
            AppDbContext context,
            IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        #region Admin Operations

        public async Task<PagedResult<NotificationDto>> GetAdminNotificationsAsync(
    int pageNumber, int pageSize, string? search, string? type,
    DateTime? dateFrom, DateTime? dateTo)
{
    Console.WriteLine($"🔍 [SERVICE] === START DEBUG ===");
    Console.WriteLine($"🔍 [SERVICE] Input Parameters:");
    Console.WriteLine($"  - pageNumber: {pageNumber}");
    Console.WriteLine($"  - pageSize: {pageSize}");
    Console.WriteLine($"  - search: {search ?? "null"}");
    Console.WriteLine($"  - type: {type ?? "null"}");

    var query = _context.Notifications.AsQueryable();

    // Apply filters (giữ nguyên logic)
    if (!string.IsNullOrEmpty(search))
    {
        query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
        Console.WriteLine($"🔍 [SERVICE] Applied search filter");
    }

    if (!string.IsNullOrEmpty(type))
    {
        query = query.Where(n => n.Type == type);
        Console.WriteLine($"🔍 [SERVICE] Applied type filter");
    }

    if (dateFrom.HasValue)
    {
        query = query.Where(n => n.CreatedAt >= dateFrom.Value);
        Console.WriteLine($"🔍 [SERVICE] Applied dateFrom filter");
    }

    if (dateTo.HasValue)
    {
        query = query.Where(n => n.CreatedAt <= dateTo.Value);
        Console.WriteLine($"🔍 [SERVICE] Applied dateTo filter");
    }

    var totalCount = await query.CountAsync();
    Console.WriteLine($"🔍 [SERVICE] Total count after filters: {totalCount}");

    var skipCount = (pageNumber - 1) * pageSize;
    Console.WriteLine($"🔍 [SERVICE] Pagination calculation:");
    Console.WriteLine($"  - Skip: ({pageNumber} - 1) * {pageSize} = {skipCount}");
    Console.WriteLine($"  - Take: {pageSize}");

    var notifications = await query
        .OrderByDescending(n => n.CreatedAt)
        .Skip(skipCount)
        .Take(pageSize)
        .ToListAsync();


    // Manual mapping
    var dtos = notifications.Select(n => new NotificationDto
    {
        NotificationID = n.NotificationID,
        Title = n.Title,
        Content = n.Content,
        Type = n.Type,
        Icon = n.Icon,
        ActionText = n.ActionText,
        ActionUrl = n.ActionUrl,
        TargetAudience = n.TargetAudience,
        Status = n.Status,
        ScheduledAt = n.ScheduledAt,
        SentAt = n.SentAt,
        CreatedAt = n.CreatedAt,
        CreatedBy = n.CreatedBy,
        TotalSent = n.TotalSent,
        TotalRead = n.TotalRead
    }).ToList();



    var result = new PagedResult<NotificationDto>(
        dtos,
        pageNumber,
        pageSize,
        totalCount
    );



    return result;
}
        public async Task<NotificationDto?> GetNotificationByIdAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            return notification != null ? _mapper.Map<NotificationDto>(notification) : null;
        }

        public async Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto, int createdBy)
        {
            var notification = _mapper.Map<Notification>(dto);
            notification.CreatedBy = createdBy;
            notification.CreatedAt = DateTime.UtcNow;
            notification.Status = "draft"; // Set default status

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<NotificationDto> UpdateNotificationAsync(int id, UpdateNotificationDto dto)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                throw new ArgumentException("Notification not found");

            if (notification.Status == "sent")
                throw new InvalidOperationException("Cannot update sent notification");

            // Map only the updatable fields
            notification.Title = dto.Title;
            notification.Content = dto.Content;
            notification.Type = dto.Type;
            notification.Icon = dto.Icon;
            notification.ActionText = dto.ActionText;
            notification.ActionUrl = dto.ActionUrl;
            notification.TargetAudience = dto.TargetAudience;
            notification.ScheduledAt = dto.ScheduledAt;

            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<bool> DeleteNotificationAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return false;

            // Check if notification has been sent
            if (notification.Status == "sent")
            {
                throw new InvalidOperationException("Cannot delete sent notification");
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendNotificationAsync(int notificationId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var notification = await _context.Notifications.FindAsync(notificationId);
                if (notification == null || notification.Status != "draft")
                    return false;

                // Check if scheduled notification is ready to send
                if (notification.ScheduledAt.HasValue && notification.ScheduledAt.Value > DateTime.UtcNow)
                {
                    throw new InvalidOperationException("Scheduled notification is not ready to send yet");
                }

                // Get target users based on audience
                List<int> userIds = await GetTargetUserIds(notification.TargetAudience);

                if (!userIds.Any())
                {
                    throw new InvalidOperationException("No target users found for this notification");
                }

                // Create UserNotifications for each target user
                var userNotifications = new List<UserNotification>();
                foreach (var userId in userIds)
                {
                    var userType = await GetUserTypeFromUserIdAsync(userId);
                    userNotifications.Add(new UserNotification
                    {
                        NotificationID = notificationId,
                        UserID = userId,
                        UserType = userType,
                        ReceivedAt = DateTime.UtcNow,
                        IsRead = false,
                        IsDeleted = false
                    });
                }

                _context.UserNotifications.AddRange(userNotifications);

                // Update notification status
                notification.Status = "sent";
                notification.SentAt = DateTime.UtcNow;
                notification.TotalSent = userIds.Count;

                _context.Notifications.Update(notification);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

public async Task<object> GetNotificationStatsAsync(int notificationId)
{
    var notification = await _context.Notifications.FindAsync(notificationId);
    if (notification == null)
        return null;

    // Lấy thống kê từ UserNotifications
    var userNotifications = await _context.UserNotifications
        .Where(un => un.NotificationID == notificationId && !un.IsDeleted)
        .ToListAsync();

    var totalSent = notification.TotalSent;
    var totalRead = notification.TotalRead;
    var totalDeleted = await _context.UserNotifications
        .CountAsync(un => un.NotificationID == notificationId && un.IsDeleted);

    // Tính tỷ lệ đọc
    var readRate = totalSent > 0 ? (double)totalRead / totalSent * 100 : 0;

    // Thống kê chi tiết theo đối tượng
    var customerStats = userNotifications.Where(un => un.UserType == "Customer");
    var sellerStats = userNotifications.Where(un => un.UserType == "Seller");

    return new
    {
        NotificationId = notificationId,
        Title = notification.Title,
        Content = notification.Content,
        Type = notification.Type,
        TargetAudience = notification.TargetAudience,
        Status = notification.Status,
        
        // Thống kê tổng quan
        TotalSent = totalSent,
        TotalRead = totalRead,
        TotalDeleted = totalDeleted,
        ReadRate = Math.Round(readRate, 2),
        
        // Thống kê theo đối tượng
        CustomerStats = new
        {
            Sent = customerStats.Count(),
            Read = customerStats.Count(un => un.IsRead),
            Deleted = customerStats.Count(un => un.IsDeleted),
            ReadRate = customerStats.Any() ? 
                Math.Round((double)customerStats.Count(un => un.IsRead) / customerStats.Count() * 100, 2) : 0
        },
        
        SellerStats = new
        {
            Sent = sellerStats.Count(),
            Read = sellerStats.Count(un => un.IsRead),
            Deleted = sellerStats.Count(un => un.IsDeleted),
            ReadRate = sellerStats.Any() ? 
                Math.Round((double)sellerStats.Count(un => un.IsRead) / sellerStats.Count() * 100, 2) : 0
        },
        
        // Thời gian
        CreatedAt = notification.CreatedAt,
        SentAt = notification.SentAt,
        
        // Action info (nếu có)
        ActionText = notification.ActionText,
        ActionUrl = notification.ActionUrl,
        
        // Top 5 người đọc sớm nhất
        TopReaders = userNotifications
            .Where(un => un.IsRead && un.ReadAt.HasValue)
            .OrderBy(un => un.ReadAt)
            .Take(5)
            .Select(un => new
            {
                UserId = un.UserID,
                UserType = un.UserType,
                ReadAt = un.ReadAt
            })
            .ToList(),
            
        // Phân phối thời gian đọc (theo giờ trong ngày)
        ReadDistribution = userNotifications
            .Where(un => un.IsRead && un.ReadAt.HasValue)
            .GroupBy(un => un.ReadAt.Value.Hour)
            .Select(g => new
            {
                Hour = g.Key,
                Count = g.Count()
            })
            .OrderBy(x => x.Hour)
            .ToList()
    };
}
        #endregion

        #region User Operations

        public async Task<PagedResult<UserNotificationDto>> GetUserNotificationsAsync(
            int userId, string userType, int pageNumber, int pageSize, bool unreadOnly)
        {
            var query = _context.UserNotifications
                .Include(un => un.Notification)
                .Where(un => un.UserID == userId && un.UserType == userType && !un.IsDeleted);

            if (unreadOnly)
            {
                query = query.Where(un => !un.IsRead);
            }

            var totalCount = await query.CountAsync();

            var notifications = await query
                .OrderByDescending(un => un.ReceivedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = notifications.Select(un => new UserNotificationDto
            {
                UserNotificationID = un.UserNotificationID,
                NotificationID = un.NotificationID,
                Title = un.Notification.Title,
                Content = un.Notification.Content,
                Type = un.Notification.Type,
                Icon = un.Notification.Icon,
                ActionText = un.Notification.ActionText,
                ActionUrl = un.Notification.ActionUrl,
                IsRead = un.IsRead,
                ReadAt = un.ReadAt,
                ReceivedAt = un.ReceivedAt
            }).ToList();

            return new PagedResult<UserNotificationDto>(
                dtos,
                totalCount,
                pageNumber,
                pageSize
            );
        }

        public async Task<bool> MarkAsReadAsync(int userNotificationId, int userId)
        {
            var userNotification = await _context.UserNotifications
                .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && un.UserID == userId);

            if (userNotification == null || userNotification.IsDeleted)
                return false;

            if (!userNotification.IsRead)
            {
                userNotification.IsRead = true;
                userNotification.ReadAt = DateTime.UtcNow;

                // Update total read count in notification
                var notification = await _context.Notifications.FindAsync(userNotification.NotificationID);
                if (notification != null)
                {
                    notification.TotalRead++;
                    _context.Notifications.Update(notification);
                }

                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<bool> DeleteUserNotificationAsync(int userNotificationId, int userId)
        {
            var userNotification = await _context.UserNotifications
                .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && un.UserID == userId);

            if (userNotification == null || userNotification.IsDeleted)
                return false;

            // Soft delete
            userNotification.IsDeleted = true;
            userNotification.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetUnreadCountAsync(int userId, string userType)
        {
            return await _context.UserNotifications
                .CountAsync(un => un.UserID == userId && un.UserType == userType && !un.IsRead && !un.IsDeleted);
        }

        #endregion

        #region Helper Methods

        private async Task<List<int>> GetTargetUserIds(string targetAudience)
        {
            return targetAudience.ToLower() switch
            {
                "customers" => await _context.Users
                    .Where(u => u.Role == "Customer")
                    .Select(u => u.UserID)
                    .ToListAsync(),
                "sellers" => await _context.Users
                    .Where(u => u.Role == "Seller")
                    .Select(u => u.UserID)
                    .ToListAsync(),
                "admins" => await _context.Users
                    .Where(u => u.Role == "Admin")
                    .Select(u => u.UserID)
                    .ToListAsync(),
                "both" => await _context.Users
                    .Where(u => u.Role == "Customer" || u.Role == "Seller")
                    .Select(u => u.UserID)
                    .ToListAsync(),
                "all" => await _context.Users
                    .Select(u => u.UserID)
                    .ToListAsync(),
                _ => new List<int>()
            };
        }

        private async Task<string> GetUserTypeFromUserIdAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.Role?.ToLower() switch
            {
                "seller" => "Seller",
                "admin" => "Admin",
                "customer" => "Customer",
                _ => "Customer"
            };
        }

        #endregion

        #region Background/Scheduled Methods (Optional)

        // Method to process scheduled notifications (can be called by background service)
        public async Task<int> ProcessScheduledNotificationsAsync()
        {
            var scheduledNotifications = await _context.Notifications
                .Where(n => n.Status == "draft" &&
                           n.ScheduledAt.HasValue &&
                           n.ScheduledAt.Value <= DateTime.UtcNow)
                .ToListAsync();

            int processedCount = 0;

            foreach (var notification in scheduledNotifications)
            {
                try
                {
                    var success = await SendNotificationAsync(notification.NotificationID);
                    if (success) processedCount++;
                }
                catch (Exception ex)
                {
                    // Log error but continue processing other notifications
                    // You might want to inject ILogger here
                    Console.WriteLine($"Error processing scheduled notification {notification.NotificationID}: {ex.Message}");
                }
            }

            return processedCount;
        }

        // Method to get notification statistics
public async Task<int> GetRecipientCountAsync(string targetAudience)
{
    return targetAudience.ToLower() switch
    {
        "customers" => await _context.Users
            .CountAsync(u => u.Role == "Customer"),
        "sellers" => await _context.Users
            .CountAsync(u => u.Role == "Seller"),
        "admins" => await _context.Users
            .CountAsync(u => u.Role == "Admin"),
        "both" => await _context.Users
            .CountAsync(u => u.Role == "Customer" || u.Role == "Seller"),
        "all" => await _context.Users.CountAsync(),
        _ => 0
    };
}

        #endregion
    }
}