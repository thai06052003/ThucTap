using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;

namespace ShopxEX1.Helpers
{
    public class UpdateExpiredDiscounts
    {
        private readonly AppDbContext _context;

        public UpdateExpiredDiscounts(AppDbContext context)
        {
            _context = context;
        }

        public async Task ExecuteAsync()
        {
            // Lấy danh sách mã giảm giá đã hết hạn nhưng vẫn còn `IsActive`
            var expiredDiscounts = await _context.Discounts
                .Where(d => d.EndDate < DateTime.Now && d.IsActive)
                .ToListAsync();

            if (expiredDiscounts.Any())
            {
                foreach (var discount in expiredDiscounts)
                {
                    discount.IsActive = false;
                }

                await _context.SaveChangesAsync(); // Lưu thay đổi vào database
                Console.WriteLine($"mã giảm giá đã được cập nhật.");
            }
            else
            {
                Console.WriteLine("Không có mã giảm giá nào cần cập nhật.");
            }
        }
    }
}
