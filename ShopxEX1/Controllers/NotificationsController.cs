using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using ShopxEX1.Services.Interfaces;
using System.Security.Claims;

namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly AppDbContext _context;
        public NotificationsController(INotificationService notificationService,AppDbContext context)
        {
            _notificationService = notificationService;
            _context = context;
        }

        // ============================================
        // ADMIN ENDPOINTS
        // ============================================

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminNotifications(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? type = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null)
        {
            try
            {
                var result = await _notificationService.GetAdminNotificationsAsync(
                    pageNumber, pageSize, search, type, dateFrom, dateTo);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetNotificationById(int id)
        {
            try
            {
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                if (notification == null)
                    return NotFound(new { message = "Notification not found" });

                return Ok(notification);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.CreateNotificationAsync(dto, userId);
                return CreatedAtAction(nameof(GetNotificationById), new { id = result.NotificationID }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateNotification(int id, [FromBody] UpdateNotificationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _notificationService.UpdateNotificationAsync(id, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                var result = await _notificationService.DeleteNotificationAsync(id);
                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("admin/{id}/send")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendNotification(int id)
        {
            try
            {
                var result = await _notificationService.SendNotificationAsync(id);
                if (!result)
                    return BadRequest(new { message = "Cannot send notification" });

                return Ok(new { message = "Notification sent successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ============================================
        // USER ENDPOINTS
        // ============================================

        [HttpGet("user")]
        public async Task<IActionResult> GetUserNotifications(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] bool unreadOnly = false)
{
    try
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        Console.WriteLine($"🔍 [USER-NOTI] Getting notifications for user {userId}, Page: {pageNumber}, UnreadOnly: {unreadOnly}");
        
        // ✅ BUILD QUERY
        var query = _context.UserNotifications
            .Include(un => un.Notification)
            .Where(un => un.UserID == userId && !un.IsDeleted);
        
        // Filter unread only
        if (unreadOnly)
        {
            query = query.Where(un => !un.IsRead);
        }
        
        // ✅ GET TOTAL COUNT
        var totalCount = await query.CountAsync();
        
        // ✅ APPLY PAGINATION
        var userNotifications = await query
            .OrderByDescending(un => un.ReceivedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        
        // ✅ MAP TO DTO - MATCH VỚI FRONTEND EXPECT
        var notifications = userNotifications.Select(un => new
        {
            userNotificationID = un.UserNotificationID,
            notificationID = un.NotificationID,
            title = un.Notification.Title,
            content = un.Notification.Content,
            type = un.Notification.Type,
            icon = un.Notification.Icon,
            actionText = un.Notification.ActionText,
            actionUrl = un.Notification.ActionUrl,
            isRead = un.IsRead,
            receivedAt = un.ReceivedAt,
            readAt = un.ReadAt,
            createdAt = un.Notification.CreatedAt
        }).ToList();
        
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        
        Console.WriteLine($"✅ [USER-NOTI] Returning {notifications.Count} notifications, Total: {totalCount}");
        
        // ✅ RESPONSE FORMAT MATCH VỚI FRONTEND
        return Ok(new {
            notifications = notifications,
            currentPage = pageNumber,
            pageSize = pageSize,
            totalCount = totalCount,
            totalPages = totalPages,
            hasNextPage = pageNumber < totalPages,
            hasPreviousPage = pageNumber > 1
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [USER-NOTI ERROR] {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}
        [HttpPost("user/{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.MarkAsReadAsync(id, userId);

                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification marked as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("user/{id}")]
        public async Task<IActionResult> DeleteUserNotification(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.DeleteUserNotificationAsync(id, userId);

                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("user/unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var userType = User.FindFirst(ClaimTypes.Role)?.Value ?? "Customer";

                var count = await _notificationService.GetUnreadCountAsync(userId, userType);
                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // Thêm endpoint này vào NotificationsController
        [HttpGet("admin/recipient-count")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRecipientCount([FromQuery] string audience)
        {
            try
            {
                if (string.IsNullOrEmpty(audience))
                    return BadRequest(new { message = "Audience parameter is required" });

                var count = await _notificationService.GetRecipientCountAsync(audience);
                return Ok(new { count = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("admin/{id}/stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetNotificationStats(int id)
        {
            try
            {
                var stats = await _notificationService.GetNotificationStatsAsync(id);
                if (stats == null)
                    return NotFound(new { message = "Notification not found" });

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ============================================
        // SELLER ENDPOINTS 
        // ============================================

        [HttpGet("seller")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotifications(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? type = null)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                Console.WriteLine($"🔍 [CONTROLLER] Getting seller notifications - Seller: {sellerId}, Page: {pageNumber}, Size: {pageSize}, Search: '{search}', Type: '{type}'");

                var result = await _notificationService.GetSellerNotificationsAsync(
                    sellerId, pageNumber, pageSize, search, type);

                // ✅ SỬA LỖI: Thêm () để gọi method hoặc sử dụng Count()
                Console.WriteLine($"✅ [CONTROLLER] Returning {result.Items.Count()} notifications, Total: {result.TotalCount}, Pages: {result.TotalPages}");

                // ✅ ENHANCED RESPONSE với đầy đủ pagination info
                return Ok(new
                {
                    notifications = result.Items,
                    currentPage = result.PageNumber,     // ✅ Sử dụng PageNumber từ PagedResult của bạn
                    pageSize = result.PageSize,
                    totalCount = result.TotalCount,
                    totalPages = result.TotalPages,
                    hasNextPage = result.HasNextPage,
                    hasPreviousPage = result.HasPreviousPage,
                    // Additional metadata
                    searchTerm = search,
                    filterType = type,
                    sellerId = sellerId
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [CONTROLLER ERROR] {ex.Message}");
                return StatusCode(500, new
                {
                    message = "Internal server error",
                    error = ex.Message
                });
            }
        }
        [HttpPost("seller")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> CreateSellerNotification([FromBody] CreateSellerNotificationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.CreateSellerNotificationAsync(dto, sellerId);

                return CreatedAtAction(nameof(GetNotificationById), new { id = result.NotificationID }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("seller/{id}/send")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> SendSellerNotification(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.SendSellerNotificationAsync(id, sellerId);

                if (!result)
                    return BadRequest(new { message = "Cannot send notification or notification not found" });

                return Ok(new { message = "Notification sent successfully to customers" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("seller/customers")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerCustomers()
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var customers = await _notificationService.GetSellerCustomersAsync(sellerId);

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("seller/notification-templates")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationTemplates()
        {
            try
            {
                var templates = await _notificationService.GetSellerNotificationTemplatesAsync();
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpDelete("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> DeleteSellerNotification(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.DeleteSellerNotificationAsync(id, sellerId);

                if (!result)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> UpdateSellerNotification(int id, [FromBody] CreateSellerNotificationDto dto)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.UpdateSellerNotificationAsync(id, dto, sellerId);

                if (result == null)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("seller/{id}/stats")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationStats(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var stats = await _notificationService.GetSellerNotificationStatsAsync(id, sellerId);

                if (stats == null)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationById(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                // Lấy notification và check ownership
                var notification = await _notificationService.GetNotificationByIdAsync(id);

                if (notification == null)
                    return NotFound(new { message = "Notification not found" });

                // Check if seller owns this notification
                if (notification.CreatedBy != sellerId)
                    return NotFound(new { message = "Access denied. You can only access your own notifications." });

                return Ok(notification);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }


        [HttpGet("seller/{id}/recipients")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationRecipients(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                Console.WriteLine($"🔍 [CONTROLLER] Getting recipients for notification {id}, seller {sellerId}");

                // ✅ USE SELLER-SPECIFIC METHOD WITH OWNERSHIP CHECK
                var recipients = await _notificationService.GetSellerNotificationRecipientsAsync(id, sellerId);

                if (!recipients.Any())
                {
                    return NotFound(new
                    {
                        message = "Notification not found or no recipients",
                        notificationId = id,
                        sellerId = sellerId
                    });
                }

                // ✅ GET NOTIFICATION TITLE
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                string notificationTitle = notification?.Title ?? "Thông báo không xác định";

                Console.WriteLine($"✅ [CONTROLLER] Returning {recipients.Count} recipients for notification '{notificationTitle}'");

                return Ok(new
                {
                    notificationTitle = notificationTitle,
                    recipients = recipients,
                    totalRecipients = recipients.Count,
                    totalRead = recipients.Count(r => r.IsRead),
                    totalUnread = recipients.Count(r => !r.IsRead),
                    readRate = recipients.Any() ? Math.Round((double)recipients.Count(r => r.IsRead) / recipients.Count * 100, 2) : 0
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [CONTROLLER ERROR] {ex.Message}");
                return StatusCode(500, new
                {
                    message = "Internal server error",
                    error = ex.Message
                });
            }
        }

[HttpPost("user/{userNotificationId}/resend")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> ResendNotificationToUser(int userNotificationId)
{
    try
    {
        var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        Console.WriteLine($"🔄 [RESEND] Resending notification {userNotificationId} by seller {sellerId}");
        
        // ✅ CHECK OWNERSHIP
        var userNotification = await _context.UserNotifications
            .Include(un => un.Notification)
            .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && 
                                      un.Notification.CreatedBy == sellerId);
        
        if (userNotification == null)
        {
            return NotFound(new { message = "User notification not found or not owned by you" });
        }
        
        // ✅ CREATE NEW NOTIFICATION RECORD (trùng lặp thông báo)
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
        
        Console.WriteLine($"✅ [RESEND] Successfully resent notification to user {userNotification.UserID}");
        
        return Ok(new { 
            message = "Đã gửi lại thông báo thành công",
            userNotificationId = newUserNotification.UserNotificationID,
            sentAt = newUserNotification.ReceivedAt
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [RESEND ERROR] {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}

    }
}