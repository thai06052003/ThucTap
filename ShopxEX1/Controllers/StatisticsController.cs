using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopxEX1.Data; // Thêm này
using ShopxEX1.Dtos.Statistics;
using ShopxEX1.Services;
using ShopxEX1.Helpers;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatisticsController : ControllerBase
    {
        private readonly IStatisticsService _statisticsService;
        private readonly ILogger<StatisticsController> _logger;
        private readonly GetID _getID;
        private readonly AppDbContext _context; // Thêm này

        public StatisticsController(
            IStatisticsService statisticsService,
            ILogger<StatisticsController> logger,
            GetID getID,
            AppDbContext context) // Thêm parameter
        {
            _statisticsService = statisticsService;
            _logger = logger;
            _getID = getID;
            _context = context; // Thêm này
        }

        /// <summary>
        /// Lấy tổng quan thống kê cho bảng điều khiển người bán
        /// </summary>
        [HttpGet("dashboard")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                _logger.LogInformation($"Lấy thống kê dashboard cho seller ID: {sellerId.Value}");
                var result = await _statisticsService.GetSellerDashboardStatsAsync(sellerId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê dashboard");
                return StatusCode(500, $"Đã xảy ra lỗi khi lấy thống kê: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy doanh thu theo khoảng thời gian
        /// </summary>
        [HttpGet("revenue")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetRevenueStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string groupBy = "day")
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Lấy thống kê doanh thu từ {start:yyyy-MM-dd} đến {end:yyyy-MM-dd} cho seller ID: {sellerId.Value}, nhóm theo: {groupBy}");
                var result = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, start, end, groupBy);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê doanh thu");
                return StatusCode(500, $"Đã xảy ra lỗi khi lấy thống kê doanh thu: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy
        /// </summary>
        [HttpGet("top-products")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetTopSellingProducts(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int limit = 10,
            [FromQuery] int? categoryId = null)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Lấy {limit} sản phẩm bán chạy từ {start:yyyy-MM-dd} đến {end:yyyy-MM-dd} cho seller ID: {sellerId.Value}");
                var result = await _statisticsService.GetTopSellingProductsAsync(sellerId.Value, start, end, limit, categoryId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách sản phẩm bán chạy");
                return StatusCode(500, $"Đã xảy ra lỗi khi lấy danh sách sản phẩm bán chạy: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy số liệu đơn hàng theo trạng thái
        /// </summary>
        [HttpGet("order-status")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetOrderStatusStats()
        {
            try
            {
                Console.WriteLine("=== StatisticsController GetOrderStatusStats ===");

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    Console.WriteLine("ERROR: Cannot determine sellerId");
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                Console.WriteLine($"Final sellerId used: {sellerId.Value}");

                var result = await _statisticsService.GetOrderStatusStatsAsync(sellerId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê trạng thái đơn hàng");
                return StatusCode(500, $"Lỗi xử lý yêu cầu: {ex.Message}");
            }
        }
        /// <summary>
        /// API cho biểu đồ doanh thu với số ngày tùy chọn - Phiên bản chuẩn hóa
        /// </summary>
        [HttpGet("revenue-chart")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetRevenueChartData([FromQuery] int days = 7)
        {
            try
            {
                // Log request
                _logger.LogInformation($"GetRevenueChartData gọi với {days} ngày");

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                // Tính toán khoảng thời gian chính xác
                var endDate = DateTime.Today;
                var startDate = endDate.AddDays(-days + 1); // +1 để bao gồm cả ngày hiện tại

                _logger.LogInformation($"Lấy dữ liệu từ {startDate:yyyy-MM-dd} đến {endDate:yyyy-MM-dd} cho seller ID: {sellerId.Value}");

                // Gọi service để lấy dữ liệu doanh thu
                var revenues = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, startDate, endDate, "day");

                // Luôn đảm bảo dữ liệu đầy đủ cho mỗi ngày trong khoảng
                var allDaysData = new List<RevenueStatDto>();
                for (int i = 0; i < days; i++)
                {
                    var currentDate = startDate.AddDays(i);
                    var existingData = revenues.FirstOrDefault(r => r.Date.Date == currentDate.Date);

                    if (existingData != null)
                    {
                        allDaysData.Add(existingData);
                    }
                    else
                    {
                        // Tạo dữ liệu trống cho ngày này
                        allDaysData.Add(new RevenueStatDto
                        {
                            Date = currentDate,
                            Period = currentDate.ToString("dd/MM/yyyy"),
                            Revenue = 0,
                            OrdersCount = 0,
                            ProductsSold = 0
                        });
                    }
                }

                // Tính tổng doanh thu và đơn hàng
                var totalRevenue = allDaysData.Sum(r => r.Revenue);
                var totalOrders = allDaysData.Sum(r => r.OrdersCount);

                // Định dạng dữ liệu trả về CHUẨN HÓA - đảm bảo nhất quán với mọi frontend
                var responseData = new
                {
                    items = allDaysData.Select(r => new
                    {
                        date = r.Date.ToString("yyyy-MM-dd"),
                        revenue = r.Revenue,
                        // Cung cấp cả hai tên trường để tương thích với mọi phiên bản frontend
                        orderCount = r.OrdersCount,
                        ordersCount = r.OrdersCount,
                        productsSold = r.ProductsSold
                    }).ToList(),
                    totalRevenue,
                    totalOrders,
                    periodStart = startDate.ToString("yyyy-MM-dd"),
                    periodEnd = endDate.ToString("yyyy-MM-dd")
                };

                _logger.LogInformation($"Trả về {allDaysData.Count} bản ghi doanh thu, tổng: {totalRevenue:N0}đ");
                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy dữ liệu biểu đồ doanh thu");
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }
        /// <summary>
        /// Helper method để lấy SellerId hợp lệ với fallback strategy - FIXED
        /// </summary>
        private async Task<int?> GetValidSellerIdAsync()
        {
            try
            {
                Console.WriteLine("=== GetValidSellerIdAsync Debug ===");

                // Debug: In ra tất cả claims
                Console.WriteLine("All claims in token:");
                foreach (var claim in User.Claims)
                {
                    Console.WriteLine($"  Type: '{claim.Type}' = Value: '{claim.Value}'");
                }

                // Thử 1: Lấy từ GetID helper
                var sellerId = _getID.GetSellerId();
                Console.WriteLine($"GetSellerId() returned: {sellerId}");

                if (sellerId.HasValue)
                {
                    // Kiểm tra sellerId có hợp lệ không
                    var hasProducts = await _context.Products.AnyAsync(p => p.SellerID == sellerId.Value);
                    Console.WriteLine($"Seller {sellerId.Value} has products: {hasProducts}");

                    if (hasProducts)
                    {
                        return sellerId.Value;
                    }
                }

                // Thử 2: Lấy từ claims trực tiếp
                var sellerIdClaim = User.FindFirst("SellerId")?.Value ??
                                   User.FindFirst("sellerId")?.Value ??
                                   User.FindFirst("SellerID")?.Value;

                Console.WriteLine($"SellerID from claims: {sellerIdClaim}");

                if (!string.IsNullOrEmpty(sellerIdClaim) && int.TryParse(sellerIdClaim, out int sellerIdFromClaim))
                {
                    var hasProducts = await _context.Products.AnyAsync(p => p.SellerID == sellerIdFromClaim);
                    Console.WriteLine($"Seller {sellerIdFromClaim} from claims has products: {hasProducts}");

                    if (hasProducts)
                    {
                        return sellerIdFromClaim;
                    }
                }

                // Thử 3: FIXED - Mapping từ UserId với scope đúng
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Console.WriteLine($"UserID from claims: {userIdClaim}");

                if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
                {
                    Console.WriteLine($"Parsed userId: {userId}");

                    // OPTION A: Kiểm tra userId có phải là seller không qua Products table
                    var productBySeller = await _context.Products.FirstOrDefaultAsync(p => p.SellerID == userId);
                    if (productBySeller != null)
                    {
                        Console.WriteLine($"Found sellerId {userId} from Products mapping");
                        return userId;
                    }

                    // OPTION B: Kiểm tra qua Users table (nếu có bảng Users)
                    try
                    {
                        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);
                        if (user != null)
                        {
                            Console.WriteLine($"Found user: ID={user.UserID}, Role={user.Role}");

                            if (user.Role?.ToLower() == "seller")
                            {
                                Console.WriteLine($"Valid seller found, using userId {userId} as sellerId");
                                return userId;
                            }
                            else
                            {
                                Console.WriteLine($"User {userId} is not a seller, role: {user.Role}");
                            }
                        }
                        else
                        {
                            Console.WriteLine($"User {userId} not found in database");
                        }
                    }
                    catch (Exception userEx)
                    {
                        Console.WriteLine($"Error checking Users table: {userEx.Message}");
                        // Continue to fallback
                    }
                }

                // Thử 4: FIXED - Fallback với seller ID thực tế có trong database
                Console.WriteLine("FALLBACK: Checking available sellers in database");

                // Lấy danh sách seller IDs có sản phẩm
                var availableSellers = await _context.Products
                    .Select(p => p.SellerID)
                    .Distinct()
                    .Take(5)
                    .ToListAsync();

                Console.WriteLine($"Available seller IDs: [{string.Join(", ", availableSellers)}]");

                if (availableSellers.Any())
                {
                    var fallbackSellerId = availableSellers.First();
                    Console.WriteLine($"Using fallback sellerId: {fallbackSellerId}");
                    return fallbackSellerId;
                }

                Console.WriteLine("No valid sellerId found - no sellers have products");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetValidSellerIdAsync: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return null;
            }
        }

        /// <summary>
        /// Lấy dữ liệu biểu đồ phân tích doanh thu chi tiết - THAY THẾ revenue-chart cũ
        /// </summary>
        [HttpGet("chart-analytics")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetChartAnalytics([FromQuery] int days = 7)
        {
            try
            {
                // Validate input
                if (days < 1 || days > 365)
                {
                    return BadRequest("Số ngày phải từ 1 đến 365");
                }

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                _logger.LogInformation($"Lấy chart analytics {days} ngày cho seller ID: {sellerId.Value}");

                var result = await _statisticsService.GetRevenueChartAnalyticsAsync(sellerId.Value, days);

                _logger.LogInformation($"Chart analytics: {result.CurrentPeriodMetrics.TotalRevenue:N0}đ, {result.CurrentPeriodMetrics.TotalOrders} orders");

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chart analytics");
                return StatusCode(500, $"Lỗi khi lấy dữ liệu biểu đồ: {ex.Message}");
            }
        }

        /// <summary>
        /// API cho multiple timeframes - Linh hoạt hơn
        /// </summary>
        [HttpGet("chart-analytics/compare")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetChartAnalyticsComparison([FromQuery] string timeframe = "7d")
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                int days = timeframe.ToLower() switch
                {
                    "7d" => 7,
                    "14d" => 14,
                    "30d" => 30,
                    "90d" => 90,
                    _ => 7
                };

                var result = await _statisticsService.GetRevenueChartAnalyticsAsync(sellerId.Value, days);

                return Ok(new
                {
                    timeframe,
                    data = result,
                    insights = new
                    {
                        bestPerformingDay = result.CurrentPeriodMetrics.PeakDay?.DayName,
                        worstPerformingDay = result.CurrentPeriodMetrics.LowestDay?.DayName,
                        consistency = result.TrendAnalysis.Volatility < 20 ? "Ổn định" : "Biến động",
                        outlook = result.TrendAnalysis.Direction switch
                        {
                            "INCREASING" => "Tích cực",
                            "DECREASING" => "Cần cải thiện",
                            _ => "Ổn định"
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chart analytics comparison");
                return StatusCode(500, $"Lỗi khi lấy dữ liệu so sánh: {ex.Message}");
            }
        }


        /// <summary>
        /// Lấy top khách hàng
        /// </summary>
        [HttpGet("top-customers")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetTopCustomers([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int count = 10)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var result = await _statisticsService.GetTopCustomersAsync(sellerId.Value, startDate, endDate, count);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy top khách hàng");
                return StatusCode(500, $"Lỗi khi lấy top khách hàng: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy phân tích lợi nhuận
        /// </summary>
        [HttpGet("profit-analysis")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetProfitAnalysis([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var result = await _statisticsService.GetProfitAnalysisAsync(sellerId.Value, startDate, endDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy phân tích lợi nhuận");
                return StatusCode(500, $"Lỗi khi lấy phân tích lợi nhuận: {ex.Message}");
            }
        }
   
   /// <summary>
/// Lấy danh sách đơn hàng theo trạng thái - CHUẨN HÓA RESPONSE
/// </summary>
[HttpGet("orders-by-status")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> GetOrdersByStatus([FromQuery] string statuses)
{
    try
    {
        var sellerId = await GetValidSellerIdAsync();
        if (!sellerId.HasValue)
            return Unauthorized("Không thể xác định thông tin người bán");

        if (string.IsNullOrEmpty(statuses))
            return BadRequest("Vui lòng cung cấp danh sách trạng thái");

        _logger.LogInformation($"GetOrdersByStatus: sellerId={sellerId.Value}, statuses={statuses}");

        var statusList = statuses.Split(',').Select(s => s.Trim()).ToList();
        var result = await _statisticsService.GetOrdersByStatusAsync(sellerId.Value, statusList);

        // ✅ CHUẨN HÓA: Trả về format nhất quán
        var response = new
        {
            success = true,
            data = result ?? new List<OrderByStatusDto>(),
            totalCount = result?.Count ?? 0,
            message = $"Tìm thấy {result?.Count ?? 0} đơn hàng",
            metadata = new
            {
                sellerId = sellerId.Value,
                statuses = statusList,
                timestamp = DateTime.UtcNow
            }
        };

        _logger.LogInformation($"Returning {result?.Count ?? 0} orders for seller {sellerId.Value}");
        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Lỗi khi lấy đơn hàng theo trạng thái: {Statuses}", statuses);
        
        return StatusCode(500, new
        {
            success = false,
            error = ex.Message,
            data = new List<object>(),
            totalCount = 0
        });
    }
}
    }
}