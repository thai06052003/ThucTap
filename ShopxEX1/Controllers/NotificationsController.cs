using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;
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

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
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
                var userType = User.FindFirst(ClaimTypes.Role)?.Value ?? "Customer";

                var result = await _notificationService.GetUserNotificationsAsync(
                    userId, userType, pageNumber, pageSize, unreadOnly);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
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

    }
}