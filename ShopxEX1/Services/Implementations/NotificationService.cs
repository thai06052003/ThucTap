using AutoMapper;
using Microsoft.Data.SqlClient;
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
                pageNumber,
                pageSize,
                totalCount
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

        #region Seller Operations 

        public async Task<PagedResult<NotificationDto>> GetSellerNotificationsAsync(
            int sellerId, int pageNumber, int pageSize, string? search, string? type)
        {
            var query = _context.Notifications
                .Where(n => n.CreatedBy == sellerId); // Chỉ lấy notifications do seller này tạo

            // Apply filters
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
            }

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(n => n.Type == type);
            }

            var totalCount = await query.CountAsync();

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

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

            return new PagedResult<NotificationDto>(
                dtos,
                pageNumber,
                pageSize,
                totalCount
            );
        }

        public async Task<NotificationDto> CreateSellerNotificationAsync(CreateSellerNotificationDto dto, int sellerId)
        {
            var notification = new Notification
            {
                Title = dto.Title,
                Content = dto.Content,
                Type = dto.Type,
                Icon = dto.Icon ?? "fa-store",
                ActionText = dto.ActionText,
                ActionUrl = dto.ActionUrl,
                TargetAudience = $"seller_{sellerId}_{dto.TargetCustomers}", // Custom format for seller notifications
                Status = "draft",
                ScheduledAt = dto.ScheduledAt,
                CreatedBy = sellerId,
                CreatedAt = DateTime.UtcNow,
                TotalSent = 0,
                TotalRead = 0
            };

            // Store specific customer IDs in a separate table or JSON field if needed
            if (dto.SpecificCustomerIds?.Any() == true)
            {
                // You might want to create a TargetCustomers table or store as JSON
                notification.TargetAudience = $"seller_{sellerId}_specific";
                // Store specific IDs - could extend Notification model or create separate table
            }

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<bool> SendSellerNotificationAsync(int notificationId, int sellerId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                Console.WriteLine($"📨 [DEBUG] Starting SendSellerNotificationAsync for notification {notificationId}, seller {sellerId}");

                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationID == notificationId &&
                                             n.CreatedBy == sellerId &&
                                             n.Status == "draft");

                if (notification == null)
                {
                    Console.WriteLine($"❌ [ERROR] Notification {notificationId} not found or not owned by seller {sellerId}");
                    return false;
                }

                Console.WriteLine($"✅ [INFO] Found notification: {notification.Title}, Target: {notification.TargetAudience}");

                // ✅ GET TARGET CUSTOMERS with enhanced debugging
                var targetCustomerIds = await GetSellerTargetCustomers(sellerId, notification.TargetAudience);

                Console.WriteLine($"📊 [RESULT] Found {targetCustomerIds.Count} target customers for notification {notificationId}");

                // ✅ ENHANCED FALLBACK STRATEGY
                if (!targetCustomerIds.Any())
                {
                    Console.WriteLine($"⚠️ [WARNING] No specific target customers found for seller {sellerId}");

                    // FALLBACK 1: Try getting ALL customers who bought from this seller (any time)
                    var fallbackSql = @"
                SELECT DISTINCT o.UserID 
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
            ";

                    targetCustomerIds = await _context.Database
                        .SqlQueryRaw<int>(fallbackSql, new SqlParameter("@sellerId", sellerId))
                        .ToListAsync();

                    Console.WriteLine($"🔄 [FALLBACK1] Found {targetCustomerIds.Count} customers with relaxed criteria");

                    // FALLBACK 2: If still no customers, use all active customers (for demo/testing)
                    if (!targetCustomerIds.Any())
                    {
                        Console.WriteLine($"🔄 [FALLBACK2] No customers found, using all active customers for demo");

                        targetCustomerIds = await _context.Users
                            .Where(u => u.Role == "Customer" && u.IsActive == true)
                            .Select(u => u.UserID)
                            .Take(50) // Limit for performance
                            .ToListAsync();

                        Console.WriteLine($"🔄 [FALLBACK2] Using {targetCustomerIds.Count} active customers");
                    }

                    // FALLBACK 3: If STILL no customers, allow 0 recipients (for new sellers)
                    if (!targetCustomerIds.Any())
                    {
                        Console.WriteLine($"📝 [FALLBACK3] No customers available, sending with 0 recipients (new seller)");

                        // Update notification status anyway
                        notification.Status = "sent";
                        notification.SentAt = DateTime.UtcNow;
                        notification.TotalSent = 0;

                        _context.Notifications.Update(notification);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        Console.WriteLine($"✅ [SUCCESS] Notification {notificationId} marked as sent with 0 recipients");
                        return true; // ✅ Return success even with 0 recipients
                    }
                }

                // ✅ NORMAL FLOW: Create UserNotifications for found customers
                Console.WriteLine($"📤 [PROCESS] Creating UserNotifications for {targetCustomerIds.Count} customers");

                var userNotifications = targetCustomerIds.Select(customerId => new UserNotification
                {
                    NotificationID = notificationId,
                    UserID = customerId,
                    UserType = "Customer",
                    ReceivedAt = DateTime.UtcNow,
                    IsRead = false,
                    IsDeleted = false
                }).ToList();

                _context.UserNotifications.AddRange(userNotifications);

                // Update notification status
                notification.Status = "sent";
                notification.SentAt = DateTime.UtcNow;
                notification.TotalSent = targetCustomerIds.Count;

                _context.Notifications.Update(notification);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                Console.WriteLine($"✅ [SUCCESS] Notification {notificationId} sent successfully to {targetCustomerIds.Count} customers");
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"❌ [ERROR] Exception in SendSellerNotificationAsync: {ex.Message}");
                Console.WriteLine($"📍 [STACK] {ex.StackTrace}");
                throw new Exception($"Failed to send notification: {ex.Message}", ex);
            }
        }
        // ✅ GIẢI PHÁP THAY THẾ: Raw SQL
        public async Task<List<CustomerInfoDto>> GetSellerCustomersAsync(int sellerId)
        {
            try
            {
                Console.WriteLine($"🔍 [SQL] Getting customers for sellerId: {sellerId}");

                var sql = @"
            SELECT 
                u.UserID,
                ISNULL(u.FullName, N'Không xác định') as UserName,
                ISNULL(u.Email, N'Không xác định') as Email,
                COUNT(DISTINCT o.OrderID) as TotalOrders,
                ISNULL(SUM(o.TotalPayment), 0) as TotalSpent,
                MAX(o.OrderDate) as LastOrderDate,
                CASE 
                    WHEN COUNT(DISTINCT o.OrderID) >= 5 THEN N'VIP'
                    WHEN COUNT(DISTINCT o.OrderID) >= 3 THEN N'Frequent'
                    ELSE N'Regular'
                END as CustomerType
            FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID  
            INNER JOIN Users u ON o.UserID = u.UserID
            WHERE p.SellerID = @sellerId 
              AND u.Role = N'Customer'
            GROUP BY u.UserID, u.FullName, u.Email
            ORDER BY TotalSpent DESC
        ";

                var customers = await _context.Database
                    .SqlQueryRaw<CustomerInfoDto>(sql, new Microsoft.Data.SqlClient.SqlParameter("@sellerId", sellerId))
                    .ToListAsync();

                Console.WriteLine($"✅ [SQL] Found {customers.Count} customers for seller {sellerId}");
                return customers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [SQL ERROR] {ex.Message}");
                return new List<CustomerInfoDto>();
            }
        }

        public async Task<List<NotificationTemplateDto>> GetSellerNotificationTemplatesAsync()
        {
            // Predefined templates for sellers
            var templates = new List<NotificationTemplateDto>
    {
        new()
        {
            Type = "promotion",
            Name = "Khuyến mãi sản phẩm",
            TitleTemplate = "🎉 Khuyến mãi đặc biệt từ {ShopName}!",
            ContentTemplate = "Chúng tôi có chương trình khuyến mãi hấp dẫn cho các sản phẩm của shop. Giảm giá lên đến {DiscountPercent}% cho đơn hàng từ {MinAmount}đ. Thời gian có hạn!",
            Icon = "fa-percentage",
            Category = "Marketing"
        },
        new()
        {
            Type = "new_product",
            Name = "Sản phẩm mới",
            TitleTemplate = "🆕 Sản phẩm mới từ {ShopName}",
            ContentTemplate = "Chúng tôi vừa ra mắt sản phẩm mới: {ProductName}. Đặt hàng ngay để nhận ưu đãi đặc biệt cho khách hàng thân thiết!",
            Icon = "fa-star",
            Category = "Product"
        },
        new()
        {
            Type = "restock",
            Name = "Hàng có sẵn trở lại",
            TitleTemplate = "📦 {ProductName} đã có hàng trở lại!",
            ContentTemplate = "Sản phẩm {ProductName} mà bạn quan tâm đã có hàng trở lại. Đặt hàng ngay để không bỏ lỡ cơ hội!",
            Icon = "fa-box",
            Category = "Inventory"
        },
        new()
        {
            Type = "thank_you",
            Name = "Cảm ơn khách hàng",
            TitleTemplate = "💝 Cảm ơn bạn đã tin tưởng {ShopName}",
            ContentTemplate = "Cảm ơn bạn đã mua sắm tại shop chúng tôi. Sự hài lòng của bạn là động lực để chúng tôi cải thiện dịch vụ ngày càng tốt hơn.",
            Icon = "fa-heart",
            Category = "Customer Care"
        },
        new()
        {
            Type = "seasonal",
            Name = "Khuyến mãi theo mùa",
            TitleTemplate = "🌟 Ưu đãi {Season} từ {ShopName}",
            ContentTemplate = "Nhân dịp {Season}, shop chúng tôi dành tặng bạn những ưu đãi đặc biệt. Mua ngay để nhận quà tặng hấp dẫn!",
            Icon = "fa-gift",
            Category = "Seasonal"
        }
    };

            return await Task.FromResult(templates);
        }

        private async Task<List<int>> GetSellerTargetCustomers(int sellerId, string targetAudience)
        {
            try
            {
                Console.WriteLine($"🎯 [DEBUG] Getting target customers for seller {sellerId}, audience: {targetAudience}");

                var parts = targetAudience.Split('_');
                if (parts.Length < 3)
                {
                    Console.WriteLine($"❌ [ERROR] Invalid target audience format: {targetAudience}");
                    return new List<int>();
                }

                var targetType = parts[2]; // all, recent, frequent, vip, specific
                Console.WriteLine($"🎯 [DEBUG] Target type: {targetType}");

                string sql;
                var parameters = new List<SqlParameter> { new SqlParameter("@sellerId", sellerId) };

                // ✅ ENHANCED RAW SQL cho từng target type
                sql = targetType switch
                {
                    "all" => @"
                SELECT DISTINCT o.UserID 
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
                  AND u.IsActive = 1
            ",

                    "recent" => @"
                SELECT DISTINCT o.UserID 
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
                  AND u.IsActive = 1
                  AND o.OrderDate >= DATEADD(day, -30, GETUTCDATE())
            ",

                    "frequent" => @"
                SELECT o.UserID
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
                  AND u.IsActive = 1
                GROUP BY o.UserID
                HAVING COUNT(DISTINCT o.OrderID) >= 3
            ",

                    "vip" => @"
                SELECT o.UserID
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
                  AND u.IsActive = 1
                GROUP BY o.UserID
                HAVING SUM(ISNULL(o.TotalPayment, 0)) >= 1000000
            ",

                    _ => @"
                SELECT DISTINCT o.UserID 
                FROM OrderDetails od
                INNER JOIN Products p ON od.ProductID = p.ProductID
                INNER JOIN Orders o ON od.OrderID = o.OrderID
                INNER JOIN Users u ON o.UserID = u.UserID
                WHERE p.SellerID = @sellerId 
                  AND u.Role = 'Customer'
                  AND u.IsActive = 1
            " // Default to "all"
                };

                Console.WriteLine($"📋 [SQL] Executing query: {sql}");

                var customerIds = await _context.Database
                    .SqlQueryRaw<int>(sql, parameters.ToArray())
                    .ToListAsync();

                Console.WriteLine($"✅ [SUCCESS] Found {customerIds.Count} target customers for seller {sellerId}, type '{targetType}'");

                // ✅ DEBUG: Log first few customer IDs
                if (customerIds.Any())
                {
                    Console.WriteLine($"👥 [SAMPLE] First customers: {string.Join(", ", customerIds.Take(5))}");
                }
                else
                {
                    Console.WriteLine($"⚠️ [WARNING] No customers found. Checking seller data...");

                    // ✅ FALLBACK CHECK: Does seller have any products?
                    var productCount = await _context.Database
                        .SqlQueryRaw<int>("SELECT COUNT(*) FROM Products WHERE SellerID = @sellerId",
                            new SqlParameter("@sellerId", sellerId))
                        .FirstOrDefaultAsync();

                    Console.WriteLine($"📦 [DEBUG] Seller has {productCount} products");

                    // ✅ FALLBACK CHECK: Are there any orders?
                    var orderCount = await _context.Database
                        .SqlQueryRaw<int>(@"
                    SELECT COUNT(DISTINCT o.OrderID) 
                    FROM OrderDetails od
                    INNER JOIN Products p ON od.ProductID = p.ProductID
                    INNER JOIN Orders o ON od.OrderID = o.OrderID
                    WHERE p.SellerID = @sellerId
                ", new SqlParameter("@sellerId", sellerId))
                        .FirstOrDefaultAsync();

                    Console.WriteLine($"📋 [DEBUG] Seller has {orderCount} orders");
                }

                return customerIds;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [ERROR] Exception in GetSellerTargetCustomers: {ex.Message}");
                Console.WriteLine($"📍 [STACK] {ex.StackTrace}");
                return new List<int>();
            }
        }
        public async Task<bool> DeleteSellerNotificationAsync(int notificationId, int sellerId)
        {
            // ⭐ TƯƠNG TỰ DeleteNotificationAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return false;

            // Check if notification has been sent (giống admin)
            if (notification.Status == "sent")
            {
                throw new InvalidOperationException("Cannot delete sent notification");
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<NotificationDto?> UpdateSellerNotificationAsync(int notificationId, CreateSellerNotificationDto dto, int sellerId)
        {
            // ⭐ TƯƠNG TỰ UpdateNotificationAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return null;

            if (notification.Status == "sent")
                throw new InvalidOperationException("Cannot update sent notification");

            // Map từ CreateSellerNotificationDto (khác với admin dùng UpdateNotificationDto)
            notification.Title = dto.Title;
            notification.Content = dto.Content;
            notification.Type = dto.Type;
            notification.Icon = dto.Icon ?? "fa-store";
            notification.ActionText = dto.ActionText;
            notification.ActionUrl = dto.ActionUrl;
            notification.TargetAudience = $"seller_{sellerId}_{dto.TargetCustomers}";
            notification.ScheduledAt = dto.ScheduledAt;

            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<object> GetSellerNotificationStatsAsync(int notificationId, int sellerId)
        {
            // ⭐ TƯƠNG TỰ GetNotificationStatsAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return null;

            // SỬ DỤNG LẠI LOGIC CỦA GetNotificationStatsAsync
            return await GetNotificationStatsAsync(notificationId);
        }

        public async Task<List<NotificationRecipientDto>> GetSellerNotificationRecipientsAsync(int notificationId, int sellerId)
        {
            try
            {
                Console.WriteLine($"🔍 [RECIPIENTS] Getting recipients for notification {notificationId}, seller {sellerId}");

                // ✅ CHECK OWNERSHIP FIRST
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

                if (notification == null)
                {
                    Console.WriteLine($"❌ [RECIPIENTS] Notification {notificationId} not found or not owned by seller {sellerId}");
                    return new List<NotificationRecipientDto>();
                }

                // ✅ GET RECIPIENTS WITH ENHANCED INFO
                var recipients = await _context.UserNotifications
                    .Include(un => un.User)
                    .Where(un => un.NotificationID == notificationId && !un.IsDeleted)
                    .Select(un => new
                    {
                        un.UserNotificationID,
                        un.UserID,
                        CustomerName = un.User.FullName ?? "Khách hàng",
                        Email = un.User.Email,
                        Phone = un.User.Phone,
                        Avatar = un.User.Avatar,
                        un.IsRead,
                        SentAt = un.ReceivedAt,
                        ReadAt = un.ReadAt,
                        un.IsDeleted,
                        un.DeletedAt,
                        IsActive = un.User.IsActive,
                        JoinedDate = un.User.CreatedAt
                    })
                    .OrderBy(un => un.CustomerName)
                    .ToListAsync();

                Console.WriteLine($"✅ [RECIPIENTS] Found {recipients.Count} recipients for notification {notificationId}");

                // ✅ ENHANCE WITH CUSTOMER STATS
                var result = new List<NotificationRecipientDto>();

                foreach (var recipient in recipients)
                {
                    // Get customer purchase stats
                    var customerStats = await GetCustomerStatsForSeller(recipient.UserID, sellerId);

                    result.Add(new NotificationRecipientDto
                    {
                        UserNotificationID = recipient.UserNotificationID,
                        UserID = recipient.UserID,
                        CustomerName = recipient.CustomerName,
                        Email = recipient.Email,
                        Phone = recipient.Phone,
                        Avatar = recipient.Avatar,
                        IsRead = recipient.IsRead,
                        SentAt = recipient.SentAt,
                        ReadAt = recipient.ReadAt,
                        IsDeleted = recipient.IsDeleted,
                        DeletedAt = recipient.DeletedAt,
                        IsActive = recipient.IsActive,
                        JoinedDate = recipient.JoinedDate,

                        // Enhanced stats
                        TotalOrders = customerStats.TotalOrders,
                        TotalSpent = customerStats.TotalSpent,
                        CustomerType = customerStats.CustomerType,
                        LastOrderDate = customerStats.LastOrderDate
                    });
                }

                Console.WriteLine($"✅ [RECIPIENTS] Enhanced {result.Count} recipients with customer stats");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [RECIPIENTS ERROR] {ex.Message}");
                return new List<NotificationRecipientDto>();
            }
        }
private async Task<(int TotalOrders, decimal TotalSpent, string CustomerType, DateTime? LastOrderDate)> 
    GetCustomerStatsForSeller(int customerId, int sellerId)
{
    try
    {
        var sql = @"
            SELECT 
                COUNT(DISTINCT o.OrderID) as TotalOrders,
                ISNULL(SUM(o.TotalPayment), 0) as TotalSpent,
                MAX(o.OrderDate) as LastOrderDate
            FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            WHERE p.SellerID = @sellerId 
              AND o.UserID = @customerId
        ";

        var result = await _context.Database
            .SqlQueryRaw<CustomerStatsResult>(sql, 
                new SqlParameter("@sellerId", sellerId),
                new SqlParameter("@customerId", customerId))
            .FirstOrDefaultAsync();

        if (result == null)
        {
            return (0, 0, "Regular", null);
        }

        // Determine customer type
        string customerType = result.TotalOrders switch
        {
            >= 5 when result.TotalSpent >= 1000000 => "VIP",
            >= 3 => "Frequent",
            _ => "Regular"
        };

        return (result.TotalOrders, result.TotalSpent, customerType, result.LastOrderDate);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [CUSTOMER STATS ERROR] {ex.Message}");
        return (0, 0, "Regular", null);
    }
}
public async Task<ResendNotificationResult> ResendNotificationToUserAsync(int userNotificationId, int sellerId)
{
    try
    {
        Console.WriteLine($"🔄 [SERVICE] Resending notification {userNotificationId} by seller {sellerId}");
        
        // ✅ CHECK OWNERSHIP
        var userNotification = await _context.UserNotifications
            .Include(un => un.Notification)
            .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && 
                                      un.Notification.CreatedBy == sellerId);
        
        if (userNotification == null)
        {
            return new ResendNotificationResult
            {
                Success = false,
                Message = "User notification not found or not owned by you"
            };
        }
        
        // ✅ CREATE NEW NOTIFICATION RECORD
        var newUserNotification = new UserNotification
        {
            NotificationID = userNotification.NotificationID,
            UserID = userNotification.UserID,
            UserType = userNotification.UserType,
            ReceivedAt = DateTime.UtcNow,
            IsRead = false,
            IsDeleted = false
        };
        
        _context.UserNotifications.Add(newUserNotification);
        await _context.SaveChangesAsync();
        
        Console.WriteLine($"✅ [SERVICE] Successfully resent notification to user {userNotification.UserID}");
        
        return new ResendNotificationResult
        {
            Success = true,
            Message = "Đã gửi lại thông báo thành công",
            NewUserNotificationId = newUserNotification.UserNotificationID,
            SentAt = newUserNotification.ReceivedAt
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [SERVICE ERROR] {ex.Message}");
        throw new Exception($"Failed to resend notification: {ex.Message}", ex);
    }
}
        #endregion
    }
}