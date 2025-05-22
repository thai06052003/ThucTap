using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Models;
using ShopxEX1.Dtos.Sellers;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Data;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ShopxEX1.Services;
using ShopxEX1.Services.Implementations;

namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SellerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SellerController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("convert-to-seller")]
        public async Task<IActionResult> ConvertToSeller([FromBody] ConvertToSellerDto convertDto)
        {
            var userId = convertDto.UserId;

            // Kiểm tra xem người dùng đã từng là Seller chưa
            var existingSeller = await _context.Sellers.FirstOrDefaultAsync(s => s.UserID == userId);

            if (existingSeller != null)
            {
                // Nếu đã tồn tại bản ghi Seller
                if (existingSeller.IsActive)
                {
                    // Nếu Seller đang active
                    return BadRequest(new { message = "Người dùng đã là Seller." });
                }
                else
                {
                    // Nếu Seller không active, kích hoạt lại
                    existingSeller.IsActive = true;
                    existingSeller.ShopName = !string.IsNullOrEmpty(convertDto.ShopName)
                        ? convertDto.ShopName
                        : existingSeller.ShopName;

                    // Cập nhật role trong bảng Users
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null)
                    {
                        user.Role = "Seller";
                        _context.Entry(user).Property(u => u.Role).IsModified = true;
                    }

                    await _context.SaveChangesAsync();
                    return Ok(new
                    {
                        message = "Kích hoạt lại tài khoản Seller thành công.",
                        SellerId = existingSeller.SellerID
                    });
                }
            }

            // Tạo mới Seller nếu chưa từng tồn tại
            var seller = new Seller
            {
                UserID = userId,
                ShopName = convertDto.ShopName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Sellers.Add(seller);

            // Cập nhật role trong bảng Users
            var newUser = await _context.Users.FindAsync(userId);
            if (newUser != null)
            {
                newUser.Role = "Seller";
                _context.Entry(newUser).Property(u => u.Role).IsModified = true;
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Chuyển đổi thành Seller thành công.", SellerId = seller.SellerID });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi chuyển đổi thành Seller: " + ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSeller(int id, [FromBody] SellerUpdateDto sellerDto)
        {
            var seller = await _context.Sellers.FindAsync(id);
            if (seller == null)
            {
                return NotFound(new { message = "Không tìm thấy người bán." });
            }

            if (!string.IsNullOrEmpty(sellerDto.ShopName))
                seller.ShopName = sellerDto.ShopName;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật thông tin người bán thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi cập nhật thông tin người bán: " + ex.Message });
            }
        }

        [HttpPut("toggle-maintenance")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> ToggleMaintenanceMode()
        {
            try
            {
                // Lấy UserID từ token
                int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

                // Lấy thông tin seller
                var seller = await _context.Sellers
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (seller == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy thông tin shop"
                    });
                }

                // Chuyển đổi trạng thái shop: active <-> maintenance
                seller.IsActive = !seller.IsActive; // Đảo ngược trạng thái

                await _context.SaveChangesAsync();

                // Tạo lại token với thông tin mới
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserID == userId);

                // Tạo token mới với GenerateJwtToken đã có
                var authService = HttpContext.RequestServices.GetRequiredService<IAuthService>();
                var tokenResult = authService.GenerateJwtToken(user);

                string statusName = seller.IsActive ? "Hoạt động" : "Bảo trì";

                return Ok(new
                {
                    success = true,
                    message = $"Đã chuyển trạng thái shop sang {statusName}",
                    isActive = seller.IsActive,
                    statusName = statusName,
                    token = tokenResult.Token,
                    expiration = tokenResult.Expiration
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống khi chuyển đổi trạng thái shop"
                });
            }
        }

        [HttpGet("status")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetShopStatus()
        {
            try
            {
                // Lấy UserID từ token
                int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

                // Lấy thông tin seller
                var seller = await _context.Sellers
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (seller == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy thông tin shop"
                    });
                }

                string statusName = seller.IsActive ? "Hoạt động" : "Bảo trì";

                return Ok(new
                {
                    success = true,
                    isActive = seller.IsActive,
                    statusName = statusName
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống khi lấy trạng thái shop"
                });
            }
        }
        public class ConvertToSellerDto

        {
            public int UserId { get; set; }
            public string ShopName { get; set; } = string.Empty;
        }



    }
}
