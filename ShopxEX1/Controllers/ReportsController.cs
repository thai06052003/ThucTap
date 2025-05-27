using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Reporting;
using ShopxEX1.Helpers;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IReportingService _reportingService;
        private readonly ILogger<ReportsController> _logger;
        private readonly GetID _getId;

        public ReportsController(IReportingService reportingService, ILogger<ReportsController> logger, GetID getId)
        {
            _reportingService = reportingService;
            _logger = logger;
            _getId = getId;
        }

        // --- ADMIN REPORTS ---
        [HttpGet("admin/revenue/monthly-by-year/{year:int}")]
        //[Authorize(Roles = "Admin")]
        public async Task<ActionResult<Dictionary<int, List<decimal>>>> GetAdminMonthlyRevenue(int year)
        {
            if (year <= 1900 || year > DateTime.UtcNow.Year + 5) // Validation năm cơ bản
            {
                return BadRequest(new { message = "Năm không hợp lệ." });
            }
            try
            {
                var data = await _reportingService.GetAdminMonthlyRevenueByYearAsync(year);
                if (data == null || !data.Any())
                {
                    return Ok(new Dictionary<int, List<decimal>> { { year, new List<decimal>(new decimal[12]) } }); // Trả về mảng 0 nếu không có data
                }
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy báo cáo doanh thu hàng tháng của Admin cho năm {Year}.", year);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ." });
            }
        }

        [HttpGet("admin/revenue/overall")]
        //[Authorize(Roles = "Admin")]
        public async Task<ActionResult<AdminRevenueReportDto>> GetAdminOverallRevenueReport(
            [FromQuery] ReportInterval interval = ReportInterval.AllTime,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] int? quarter = null)
        {
            try
            {
                var report = await _reportingService.GetAdminOverallRevenueAsync(interval, year, month, quarter);
                return Ok(report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy báo cáo doanh thu tổng thể của Admin.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ." });
            }
        }
    }
}
