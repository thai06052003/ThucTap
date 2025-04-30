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

        [HttpPost("{id}")]
        public async Task<IActionResult> UpdateSeller(int id, [FromBody] SellerUpdateDto sellerDto)
        {
            // Get seller from context
            var seller = await _context.Sellers.FindAsync(id);
            if (seller == null)
            {
                return NotFound(new { message = "Không tìm thấy người bán." });
            }

            // Update only allowed properties
            if (!string.IsNullOrEmpty(sellerDto.Name))
                seller.Name = sellerDto.Name;
            if (!string.IsNullOrEmpty(sellerDto.Email))
                seller.Email = sellerDto.Email;
            if (!string.IsNullOrEmpty(sellerDto.Phone))
                seller.Phone = sellerDto.Phone;
            if (!string.IsNullOrEmpty(sellerDto.Address))
                seller.Address = sellerDto.Address;
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
} 