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
            if (await _context.Sellers.AnyAsync(s => s.UserID == userId))
            {
                return BadRequest(new { message = "Người dùng đã là Seller." });
            }

            var seller = new Seller
            {
                UserID = userId,
                ShopName = convertDto.ShopName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Sellers.Add(seller);
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
    }

    public class ConvertToSellerDto
    {
        public int UserId { get; set; }
        public string ShopName { get; set; } = string.Empty;
    }
}