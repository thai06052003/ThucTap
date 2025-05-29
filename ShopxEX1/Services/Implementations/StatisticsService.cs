using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Statistics;
using ShopxEX1.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace ShopxEX1.Services
{
    /// <summary>
    /// Triển khai dịch vụ thống kê và phân tích dữ liệu cho người bán
    /// </summary>
    public class StatisticsService : IStatisticsService
    {
        private readonly AppDbContext _context;

        public StatisticsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SellerDashboardDto> GetSellerDashboardStatsAsync(int sellerId)
{
    try
    {
        Console.WriteLine($"=== GetSellerDashboardStatsAsync FIXED EF TRANSLATION for sellerId: {sellerId} ===");
        
        // ✅ Date calculations
        var today = DateTime.Today;
        var firstDayOfMonth = new DateTime(today.Year, today.Month, 1);
        var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);
        var firstDayOfLastMonth = firstDayOfMonth.AddMonths(-1);
        var lastDayOfLastMonth = firstDayOfMonth.AddDays(-1);
        var firstDayOfWeek = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);

        // ✅ Product counts
        var productStats = await _context.Products
            .Where(p => p.SellerID == sellerId)
            .GroupBy(p => 1)
            .Select(g => new { 
                Total = g.Count(),
                Available = g.Count(p => p.StockQuantity > 0)
            })
            .FirstOrDefaultAsync();

        var totalProductCount = productStats?.Total ?? 0;
        var availableProductCount = productStats?.Available ?? 0;

        // ✅ FIXED: Load orders without complex LINQ expressions
        var orders = await _context.Orders
            .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
            .Include(o => o.User)
            .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
            .AsNoTracking()
            .ToListAsync();

        Console.WriteLine($"Found {orders.Count} total orders for seller {sellerId}");

        // ✅ FIXED: Order status counts - Client-side evaluation
        var orderStatusCounts = new
        {
            Pending = orders.Count(o => o.Status.Equals("Chờ xác nhận", StringComparison.OrdinalIgnoreCase)),
            Processing = orders.Count(o => o.Status.Equals("Đang xử lý", StringComparison.OrdinalIgnoreCase)),
            Shipping = orders.Count(o => o.Status.Equals("Đang giao", StringComparison.OrdinalIgnoreCase)),
            Delivered = orders.Count(o => o.Status.Equals("Đã giao", StringComparison.OrdinalIgnoreCase)),
            Completed = orders.Count(o => o.Status.Equals("Hoàn thành", StringComparison.OrdinalIgnoreCase)),
            RefundRequested = orders.Count(o => o.Status.Equals("Yêu cầu trả hàng/ hoàn tiền", StringComparison.OrdinalIgnoreCase)),
            Cancelled = orders.Count(o => o.Status.Equals("Đã hủy", StringComparison.OrdinalIgnoreCase)),
            Refunded = orders.Count(o => o.Status.Equals("Đã hoàn tiền", StringComparison.OrdinalIgnoreCase))
        };

        Console.WriteLine($"Order Status Breakdown: P:{orderStatusCounts.Pending}, Pr:{orderStatusCounts.Processing}, S:{orderStatusCounts.Shipping}, D:{orderStatusCounts.Delivered}, C:{orderStatusCounts.Completed}, RR:{orderStatusCounts.RefundRequested}, Can:{orderStatusCounts.Cancelled}, Ref:{orderStatusCounts.Refunded}");

        // ✅ FIXED: Revenue calculation - CHỈ từ đơn hàng "Hoàn thành" (Client-side)
        var completedOrderDetails = orders
            .Where(o => o.Status.Equals("Hoàn thành", StringComparison.OrdinalIgnoreCase)) // ✅ Client-side filtering
            .SelectMany(o => o.OrderDetails)
            .Where(od => od.Product.SellerID == sellerId)
            .ToList();

        Console.WriteLine($"Revenue calculation based on {completedOrderDetails.Count} order details from COMPLETED orders only");

        // ✅ Revenue calculations - CHỈ từ đơn hàng "Hoàn thành"
        var totalRevenue = completedOrderDetails.Sum(od => od.UnitPrice * od.Quantity);
        
        var revenueToday = completedOrderDetails
            .Where(od => od.Order.OrderDate.Date == today)
            .Sum(od => od.UnitPrice * od.Quantity);
            
        var revenueThisWeek = completedOrderDetails
            .Where(od => od.Order.OrderDate.Date >= firstDayOfWeek && od.Order.OrderDate.Date <= today)
            .Sum(od => od.UnitPrice * od.Quantity);
            
        var revenueThisMonth = completedOrderDetails
            .Where(od => od.Order.OrderDate.Date >= firstDayOfMonth && od.Order.OrderDate.Date <= today)
            .Sum(od => od.UnitPrice * od.Quantity);
            
        var revenueLastMonth = completedOrderDetails
            .Where(od => od.Order.OrderDate.Date >= firstDayOfLastMonth && od.Order.OrderDate.Date <= lastDayOfLastMonth)
            .Sum(od => od.UnitPrice * od.Quantity);

        // ✅ Growth calculation
        var revenueTrendPercentage = revenueLastMonth > 0 
            ? Math.Round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, 2)
            : (revenueThisMonth > 0 ? 100 : 0);

        Console.WriteLine($"COMPLETED Orders Revenue: Total={totalRevenue:C}, Today={revenueToday:C}, Week={revenueThisWeek:C}, Month={revenueThisMonth:C}, LastMonth={revenueLastMonth:C}, Growth={revenueTrendPercentage}%");

        // ✅ Potential revenue (đơn hàng đã giao nhưng chưa hoàn thành)
        var potentialRevenueOrderDetails = orders
            .Where(o => o.Status.Equals("Đã giao", StringComparison.OrdinalIgnoreCase))
            .SelectMany(o => o.OrderDetails)
            .Where(od => od.Product.SellerID == sellerId)
            .ToList();

        var potentialRevenue = potentialRevenueOrderDetails.Sum(od => od.UnitPrice * od.Quantity);

        Console.WriteLine($"Potential Revenue (Delivered but not Completed): {potentialRevenue:C}");

        return new SellerDashboardDto
        {
            TotalRevenue = totalRevenue,
            TotalOrderCount = orders.Count,
            TotalProductCount = totalProductCount,
            AvailableProductCount = availableProductCount,
            PendingOrdersCount = orderStatusCounts.Pending,
            ProcessingOrdersCount = orderStatusCounts.Processing,
            CompletedOrdersCount = orderStatusCounts.Completed, // CHỈ "Hoàn thành"
            CancelledOrdersCount = orderStatusCounts.Cancelled + orderStatusCounts.Refunded + orderStatusCounts.RefundRequested,
            RevenueToday = revenueToday,
            RevenueThisWeek = revenueThisWeek,
            RevenueThisMonth = revenueThisMonth,
            RevenueLastMonth = revenueLastMonth,
            RevenueTrendPercentage = revenueTrendPercentage,
            // ✅ NEW: Additional metrics
            DeliveredOrdersCount = orderStatusCounts.Delivered, // Đã giao nhưng chưa hoàn thành
            PotentialRevenue = potentialRevenue, // Doanh thu tiềm năng từ đơn đã giao
            RefundRequestedCount = orderStatusCounts.RefundRequested
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR in GetSellerDashboardStatsAsync: {ex.Message}");
        throw new ApplicationException($"Failed to get dashboard stats for seller {sellerId}: {ex.Message}", ex);
    }
}
        
        /// <summary>
        /// Lấy doanh thu theo khoảng thời gian
        /// </summary>
        public async Task<List<RevenueStatDto>> GetRevenueStatsAsync(int sellerId, DateTime startDate, DateTime endDate, string groupBy = "day")
        {
            try
            {
                Console.WriteLine($"=== GetRevenueStatsAsync FIXED for sellerId: {sellerId}, {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd} ===");

                // Đảm bảo endDate luôn có giá trị đến cuối ngày
                endDate = endDate.AddHours(23).AddMinutes(59).AddSeconds(59);

                // ✅ FIXED: Replace OrderStatuses.IsRevenueCountable() với direct string comparison
                var orderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                           od.Order.OrderDate >= startDate &&
                           od.Order.OrderDate <= endDate &&
                           od.Order.Status == "Hoàn thành") // ✅ Direct comparison thay vì method call
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orderDetails.Count} order details from COMPLETED orders only");

                // Rest of grouping logic remains the same...
                var result = new List<RevenueStatDto>();

                switch (groupBy.ToLower())
                {
                    case "week":
                        // Nhóm theo tuần
                        var weeklyStats = orderDetails
                            .GroupBy(od =>
                            {
                                var date = od.Order.OrderDate.Date;
                                // Lấy ngày đầu tuần (thứ Hai)
                                int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                                return date.AddDays(-diff);
                            })
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = $"Tuần {CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(g.Key, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday)}",
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = weeklyStats;
                        break;

                    case "month":
                        // Nhóm theo tháng
                        var monthlyStats = orderDetails
                            .GroupBy(od => new DateTime(od.Order.OrderDate.Year, od.Order.OrderDate.Month, 1))
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = g.Key.ToString("MM/yyyy"),
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = monthlyStats;
                        break;

                    case "year":
                        // Nhóm theo năm
                        var yearlyStats = orderDetails
                            .GroupBy(od => new DateTime(od.Order.OrderDate.Year, 1, 1))
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = g.Key.ToString("yyyy"),
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = yearlyStats;
                        break;

                    default: // "day"
                             // Nhóm theo ngày
                        var dailyStats = orderDetails
                            .GroupBy(od => od.Order.OrderDate.Date)
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = g.Key.ToString("dd/MM/yyyy"),
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = dailyStats;
                        break;
                }

                Console.WriteLine($"✅ Returning {result.Count} revenue statistics records");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRevenueStatsAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get revenue stats for seller {sellerId}: {ex.Message}", ex);
            }
        }
        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy
        /// </summary>
        public async Task<List<TopSellingProductDto>> GetTopSellingProductsAsync(
    int sellerId,
    DateTime startDate,
    DateTime endDate,
    int count = 10,
    int? categoryId = null)
{
    try
    {
        endDate = endDate.AddHours(23).AddMinutes(59).AddSeconds(59);

        // ✅ FIXED: Replace complex LINQ with direct status comparison
        var query = _context.OrderDetails
            .Include(od => od.Order)
            .Include(od => od.Product)
            .Where(od => od.Product.SellerID == sellerId &&
                   od.Order.OrderDate >= startDate &&
                   od.Order.OrderDate <= endDate &&
                   od.Order.Status != "Đã hủy" &&
                   od.Order.Status != "Đã hoàn tiền");

        if (categoryId.HasValue)
        {
            query = query.Where(od => od.Product.CategoryID == categoryId.Value);
        }

        var orderDetailsList = await query.ToListAsync();

        var topProducts = orderDetailsList
            .GroupBy(od => new
            {
                od.ProductID,
                Name = od.Product.ProductName,
                ImageUrl = od.Product.ImageURL,
                CurrentPrice = od.Product.Price,
                Stock = od.Product.StockQuantity
            })
            .Select(g => new TopSellingProductDto
            {
                ProductID = g.Key.ProductID,
                ProductName = g.Key.Name,
                ImageURL = g.Key.ImageUrl,
                QuantitySold = g.Sum(od => od.Quantity),
                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                UnitPrice = g.Key.CurrentPrice,
                RemainingStock = g.Key.Stock
            })
            .OrderByDescending(p => p.QuantitySold)
            .Take(count)
            .ToList();

        Console.WriteLine($"✅ Top selling products: {topProducts.Count} items");
        return topProducts;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR in GetTopSellingProductsAsync: {ex.Message}");
        throw;
    }
}



        /// <summary>
        /// Lấy số liệu đơn hàng theo trạng thái - FIXED: Mapping đúng trạng thái database
        /// </summary>
        public async Task<OrderStatusStatsDto> GetOrderStatusStatsAsync(int sellerId)
        {
            try
            {
                Console.WriteLine($"=== GetOrderStatusStatsAsync FIXED for sellerId: {sellerId} ===");

                var orders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orders.Count} unique orders for seller {sellerId}");

                // ✅ FIXED: Mapping chính xác
                var result = new OrderStatusStatsDto
                {
                    Pending = orders.Count(o => o.Status.Equals(OrderStatuses.PENDING, StringComparison.OrdinalIgnoreCase)),
                    Processing = orders.Count(o => o.Status.Equals(OrderStatuses.PROCESSING, StringComparison.OrdinalIgnoreCase)),
                    Shipping = orders.Count(o => o.Status.Equals(OrderStatuses.SHIPPING, StringComparison.OrdinalIgnoreCase)),
                    Delivered = orders.Count(o => o.Status.Equals(OrderStatuses.DELIVERED, StringComparison.OrdinalIgnoreCase)),
                    RefundRequested = orders.Count(o => o.Status.Equals(OrderStatuses.REFUND_REQUESTED, StringComparison.OrdinalIgnoreCase)),
                    Cancelled = orders.Count(o => o.Status.Equals(OrderStatuses.CANCELLED, StringComparison.OrdinalIgnoreCase)),
                    Refunded = orders.Count(o => o.Status.Equals(OrderStatuses.REFUNDED, StringComparison.OrdinalIgnoreCase)),
                    Completed = orders.Count(o => o.Status.Equals(OrderStatuses.COMPLETED, StringComparison.OrdinalIgnoreCase))
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetOrderStatusStatsAsync: {ex.Message}");
                return new OrderStatusStatsDto();
            }
        }

/// <summary>
/// Lấy dữ liệu biểu đồ doanh thu với multiple metrics - THAY THẾ GetLast7DaysStatsAsync
/// </summary>
        public async Task<ChartAnalyticsDto> GetRevenueChartAnalyticsAsync(int sellerId, int days = 7)
{
    try
    {
        Console.WriteLine($"=== GetRevenueChartAnalyticsAsync for sellerId: {sellerId}, days: {days} ===");

            // Tính toán khoảng thời gian
                var endDate = DateTime.Today;
                var startDate = endDate.AddDays(-days + 1);

                Console.WriteLine($"Date range: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");

                // Lấy dữ liệu orders với cùng logic như các method khác
                var orderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                           od.Order.OrderDate.Date >= startDate &&
                           od.Order.OrderDate.Date <= endDate &&
                           od.Order.Status != "Đã hủy" &&
                           od.Order.Status != "Đã hoàn tiền")
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orderDetails.Count} valid order details");

                // Tạo dữ liệu đầy đủ cho mỗi ngày (bao gồm cả ngày không có dữ liệu)
                var dailyData = new List<DailyChartDataDto>();
                var previousPeriodData = new List<DailyChartDataDto>();

                // Dữ liệu kỳ hiện tại
                for (int i = 0; i < days; i++)
                {
                    var currentDate = startDate.AddDays(i);
                    var dayData = orderDetails.Where(od => od.Order.OrderDate.Date == currentDate).ToList();

                    dailyData.Add(new DailyChartDataDto
                    {
                        Date = currentDate,
                        DayLabel = currentDate.ToString("dd/MM"),
                        DayName = GetVietnameseDayName(currentDate.DayOfWeek),
                        Revenue = dayData.Sum(od => od.UnitPrice * od.Quantity),
                        OrdersCount = dayData.Select(od => od.OrderID).Distinct().Count(),
                        ProductsSold = dayData.Sum(od => od.Quantity),
                        UniqueCustomers = dayData.Select(od => od.Order.UserID).Distinct().Count(),
                        AverageOrderValue = dayData.Any() ?
                            dayData.GroupBy(od => od.OrderID).Average(g => g.Sum(od => od.UnitPrice * od.Quantity)) : 0
                    });
                }

                // Dữ liệu kỳ trước để so sánh (cùng số ngày, nhưng trước đó)
                var prevStartDate = startDate.AddDays(-days);
                var prevEndDate = startDate.AddDays(-1);

                var prevOrderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                           od.Order.OrderDate.Date >= prevStartDate &&
                           od.Order.OrderDate.Date <= prevEndDate &&
                           od.Order.Status != "Đã hủy" &&
                           od.Order.Status != "Đã hoàn tiền")
                    .AsNoTracking()
                    .ToListAsync();

                for (int i = 0; i < days; i++)
                {
                    var currentDate = prevStartDate.AddDays(i);
                    var dayData = prevOrderDetails.Where(od => od.Order.OrderDate.Date == currentDate).ToList();

                    previousPeriodData.Add(new DailyChartDataDto
                    {
                        Date = currentDate,
                        DayLabel = currentDate.ToString("dd/MM"),
                        DayName = GetVietnameseDayName(currentDate.DayOfWeek),
                        Revenue = dayData.Sum(od => od.UnitPrice * od.Quantity),
                        OrdersCount = dayData.Select(od => od.OrderID).Distinct().Count(),
                        ProductsSold = dayData.Sum(od => od.Quantity),
                        UniqueCustomers = dayData.Select(od => od.Order.UserID).Distinct().Count(),
                        AverageOrderValue = dayData.Any() ?
                            dayData.GroupBy(od => od.OrderID).Average(g => g.Sum(od => od.UnitPrice * od.Quantity)) : 0
                    });
                }

                // Tính toán các metrics tổng hợp
                var currentMetrics = CalculatePeriodMetrics(dailyData, "Kỳ hiện tại");
                var previousMetrics = CalculatePeriodMetrics(previousPeriodData, "Kỳ trước");

                // Tính toán growth rates
                var growthMetrics = CalculateGrowthMetrics(currentMetrics, previousMetrics);

                // Phân tích trend
                var trendAnalysis = AnalyzeTrend(dailyData);

                return new ChartAnalyticsDto
                {
                    Period = $"{days} ngày gần đây",
                    StartDate = startDate,
                    EndDate = endDate,
                    DailyData = dailyData,
                    CurrentPeriodMetrics = currentMetrics,
                    PreviousPeriodMetrics = previousMetrics,
                    GrowthMetrics = growthMetrics,
                    TrendAnalysis = trendAnalysis,
                    Summary = GenerateSummary(currentMetrics, growthMetrics, trendAnalysis, days)
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRevenueChartAnalyticsAsync: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Tính toán metrics cho một kỳ
        /// </summary>
        private PeriodMetricsDto CalculatePeriodMetrics(List<DailyChartDataDto> data, string periodName)
        {
            var daysWithData = data.Where(d => d.Revenue > 0).ToList();

            return new PeriodMetricsDto
            {
                PeriodName = periodName,
                TotalRevenue = data.Sum(d => d.Revenue),
                TotalOrders = data.Sum(d => d.OrdersCount),
                TotalProductsSold = data.Sum(d => d.ProductsSold),
                TotalUniqueCustomers = data.Where(d => d.UniqueCustomers > 0).Sum(d => d.UniqueCustomers),
                AverageOrderValue = daysWithData.Any() ? daysWithData.Average(d => d.AverageOrderValue) : 0,
                AverageDailyRevenue = data.Count > 0 ? data.Average(d => d.Revenue) : 0,
                DaysWithSales = daysWithData.Count,
                TotalDays = data.Count,
                PeakDay = data.OrderByDescending(d => d.Revenue).FirstOrDefault(),
                LowestDay = data.OrderBy(d => d.Revenue).FirstOrDefault()
            };
        }

        /// <summary>
        /// Tính toán growth rates so với kỳ trước
        /// </summary>
        private GrowthMetricsDto CalculateGrowthMetrics(PeriodMetricsDto current, PeriodMetricsDto previous)
        {
            return new GrowthMetricsDto
            {
                RevenueGrowth = CalculatePercentageGrowth(current.TotalRevenue, previous.TotalRevenue),
                OrdersGrowth = CalculatePercentageGrowth(current.TotalOrders, previous.TotalOrders),
                ProductsGrowth = CalculatePercentageGrowth(current.TotalProductsSold, previous.TotalProductsSold),
                CustomersGrowth = CalculatePercentageGrowth(current.TotalUniqueCustomers, previous.TotalUniqueCustomers),
                AOVGrowth = CalculatePercentageGrowth(current.AverageOrderValue, previous.AverageOrderValue),
                DailyRevenueGrowth = CalculatePercentageGrowth(current.AverageDailyRevenue, previous.AverageDailyRevenue)
            };
        }

        /// <summary>
        /// Phân tích trend của dữ liệu
        /// </summary>
        private TrendAnalysisDto AnalyzeTrend(List<DailyChartDataDto> data)
        {
            if (data.Count < 3) return new TrendAnalysisDto { Direction = "STABLE", Strength = 0 };

            var revenues = data.Select(d => (double)d.Revenue).ToList();
            var trend = CalculateLinearTrend(revenues);

            var recentDays = data.TakeLast(3).ToList();
            var isAccelerating = recentDays.Count >= 3 &&
                                recentDays[2].Revenue > recentDays[1].Revenue &&
                                recentDays[1].Revenue > recentDays[0].Revenue;

            return new TrendAnalysisDto
            {
                Direction = trend > 0.1 ? "INCREASING" : trend < -0.1 ? "DECREASING" : "STABLE",
                Strength = Math.Abs(trend),
                IsAccelerating = isAccelerating,
                Volatility = CalculateVolatility(revenues),
                Recommendation = GenerateTrendRecommendation(trend, isAccelerating)
            };
        }

        /// <summary>
        /// Helper methods
        /// </summary>
        private decimal CalculatePercentageGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return Math.Round(((current - previous) / previous) * 100, 2);
        }

        private double CalculateLinearTrend(List<double> values)
        {
            if (values.Count < 2) return 0;

            var n = values.Count;
            var sumX = n * (n - 1) / 2;
            var sumY = values.Sum();
            var sumXY = values.Select((y, x) => x * y).Sum();
            var sumX2 = Enumerable.Range(0, n).Sum(x => x * x);

            return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }

        private double CalculateVolatility(List<double> values)
        {
            if (values.Count < 2) return 0;

            var mean = values.Average();
            var variance = values.Sum(v => Math.Pow(v - mean, 2)) / values.Count;
            return Math.Sqrt(variance) / mean * 100; // CV%
        }

        private string GetVietnameseDayName(DayOfWeek dayOfWeek)
        {
            return dayOfWeek switch
            {
                DayOfWeek.Monday => "Thứ 2",
                DayOfWeek.Tuesday => "Thứ 3",
                DayOfWeek.Wednesday => "Thứ 4",
                DayOfWeek.Thursday => "Thứ 5",
                DayOfWeek.Friday => "Thứ 6",
                DayOfWeek.Saturday => "Thứ 7",
                DayOfWeek.Sunday => "Chủ nhật",
                _ => dayOfWeek.ToString()
            };
        }

        private string GenerateTrendRecommendation(double trend, bool isAccelerating)
        {
            if (trend > 0.2)
            {
                return isAccelerating ? "Xu hướng tăng mạnh và đang tăng tốc! Hãy tăng cường marketing."
                                      : "Xu hướng tích cực, duy trì chiến lược hiện tại.";
            }
            if (trend < -0.2)
            {
                return "Xu hướng giảm, cần xem xét lại chiến lược bán hàng và marketing.";
            }
            return "Doanh thu ổn định, có thể cân nhắc các chiến lược mới để tăng trưởng.";
        }

        private string GenerateSummary(PeriodMetricsDto current, GrowthMetricsDto growth, TrendAnalysisDto trend, int days)
        {
            var summary = $"Trong {days} ngày gần đây: ";
            summary += $"Doanh thu {current.TotalRevenue:N0}đ ({(growth.RevenueGrowth >= 0 ? "+" : "")}{growth.RevenueGrowth}%), ";
            summary += $"{current.TotalOrders} đơn hàng ({(growth.OrdersGrowth >= 0 ? "+" : "")}{growth.OrdersGrowth}%). ";
            summary += $"Xu hướng: {trend.Direction.ToLower()}.";

            return summary;
        }

        /// <summary>
        /// Lấy danh sách top khách hàng của seller
        /// </summary>
        public async Task<List<TopCustomerDto>> GetTopCustomersAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null, int count = 10)
        {
            try
            {
                var end = endDate ?? DateTime.Today;
                var start = startDate ?? end.AddDays(-90); // Default 3 months
                end = end.AddHours(23).AddMinutes(59).AddSeconds(59);

                Console.WriteLine($"=== GetTopCustomersAsync for sellerId: {sellerId}, {start:yyyy-MM-dd} to {end:yyyy-MM-dd} ===");

                // Lấy orders của seller trong kỳ
                var orders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId) &&
                           o.OrderDate >= start && o.OrderDate <= end &&
                           o.Status != "Đã hủy" && o.Status != "Đã hoàn tiền")
                    .Include(o => o.User)
                    .Include(o => o.OrderDetails)
                        .ThenInclude(od => od.Product)
                    .AsNoTracking()
                    .ToListAsync();

                // Group by customer và tính toán metrics
                var topCustomers = orders
                    .GroupBy(o => new { o.UserID, o.User.FullName, o.User.Email })
                    .Select(g => new TopCustomerDto
                    {
                        CustomerID = g.Key.UserID,
                        CustomerName = g.Key.FullName ?? "Khách hàng",
                        Email = g.Key.Email ?? "",
                        TotalOrders = g.Count(),
                        TotalSpent = g.Sum(o => o.OrderDetails
                            .Where(od => od.Product.SellerID == sellerId)
                            .Sum(od => od.UnitPrice * od.Quantity)),
                        AverageOrderValue = g.Average(o => o.OrderDetails
                            .Where(od => od.Product.SellerID == sellerId)
                            .Sum(od => od.UnitPrice * od.Quantity)),
                        FirstOrderDate = g.Min(o => o.OrderDate),
                        LastOrderDate = g.Max(o => o.OrderDate),
                        CustomerLifetimeValue = 0, // Simplified - just use TotalSpent
                        IsVIP = false // Simplified - can add logic later
                    })
                    .OrderByDescending(c => c.TotalSpent)
                    .Take(count)
                    .ToList();

                // Mark VIP customers (top 20% by spending)
                if (topCustomers.Any())
                {
                    var vipThreshold = topCustomers.Take(Math.Max(1, topCustomers.Count / 5)).Min(c => c.TotalSpent);
                    topCustomers.ForEach(c => c.IsVIP = c.TotalSpent >= vipThreshold);

                    // Set CLV = TotalSpent for simplicity
                    topCustomers.ForEach(c => c.CustomerLifetimeValue = c.TotalSpent);
                }

                Console.WriteLine($"Found {topCustomers.Count} top customers");
                return topCustomers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetTopCustomersAsync: {ex.Message}");
                throw;
            }
        }


        /// <summary>
        /// Lấy thống kê lợi nhuận thực tế đơn giản
        /// </summary>
       public async Task<ProfitAnalysisDto> GetProfitAnalysisAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null)
{
    try
    {
        var end = endDate ?? DateTime.Today;
        var start = startDate ?? new DateTime(end.Year, end.Month, 1); // Default: tháng hiện tại
        end = end.AddHours(23).AddMinutes(59).AddSeconds(59);

        Console.WriteLine($"=== FIXED Profit Analysis for sellerId: {sellerId}, {start:yyyy-MM-dd} to {end:yyyy-MM-dd} ===");

        // ✅ FIXED: Load all order details first, then filter client-side
        var completedOrderDetails = await _context.OrderDetails
            .Include(od => od.Order)
            .Include(od => od.Product)
            .Where(od => od.Product.SellerID == sellerId &&
                   od.Order.OrderDate >= start &&
                   od.Order.OrderDate <= end &&
                   od.Order.Status == "Hoàn thành") // ✅ Direct string comparison
            .AsNoTracking()
            .ToListAsync();

        if (!completedOrderDetails.Any())
        {
            return new ProfitAnalysisDto
            {
                AnalysisPeriod = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}",
                Notes = "Không có đơn hàng hoàn thành nào trong kỳ này để phân tích lợi nhuận."
            };
        }

        // Rest of the method remains the same...
        var totalRevenue = completedOrderDetails.Sum(od => od.UnitPrice * od.Quantity);
        var totalOrders = completedOrderDetails.Select(od => od.OrderID).Distinct().Count();
        var totalQuantitySold = completedOrderDetails.Sum(od => od.Quantity);

        Console.WriteLine($"Base metrics: Revenue={totalRevenue:C}, Orders={totalOrders}, Quantity={totalQuantitySold}");

        // Continue with existing profit analysis logic...
        decimal totalCOGS = 0;
        var productProfitDetails = new List<ProductProfitDto>();

        var productGroups = completedOrderDetails
            .GroupBy(od => new { od.ProductID, od.Product.ProductName, od.Product.CategoryID })
            .ToList();

        foreach (var productGroup in productGroups)
        {
            var productRevenue = productGroup.Sum(od => od.UnitPrice * od.Quantity);
            var productQuantity = productGroup.Sum(od => od.Quantity);
            var avgSellingPrice = productRevenue / productQuantity;

            decimal estimatedCOGSPercentage = EstimateCOGSPercentage(productGroup.Key.CategoryID, avgSellingPrice);
            decimal productCOGS = productRevenue * (estimatedCOGSPercentage / 100);
            
            totalCOGS += productCOGS;

            productProfitDetails.Add(new ProductProfitDto
            {
                ProductID = productGroup.Key.ProductID,
                ProductName = productGroup.Key.ProductName,
                Revenue = productRevenue,
                EstimatedCOGS = productCOGS,
                GrossProfit = productRevenue - productCOGS,
                QuantitySold = productQuantity,
                ProfitMargin = productRevenue > 0 ? ((productRevenue - productCOGS) / productRevenue) * 100 : 0
            });
        }

        decimal estimatedOperatingExpenses = CalculateOperatingExpenses(totalRevenue, totalOrders, sellerId);

        var grossProfit = totalRevenue - totalCOGS;
        var grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        var netProfit = grossProfit - estimatedOperatingExpenses;
        var netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        var avgOrderProfit = totalOrders > 0 ? netProfit / totalOrders : 0;

        var topProfitableProducts = productProfitDetails
            .OrderByDescending(p => p.GrossProfit)
            .Take(10)
            .ToList();

        Console.WriteLine($"Profit Analysis: Gross={grossProfit:C} ({grossProfitMargin:F1}%), Net={netProfit:C} ({netProfitMargin:F1}%)");

        return new ProfitAnalysisDto
        {
            AnalysisPeriod = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}",
            TotalRevenue = totalRevenue,
            EstimatedCOGS = totalCOGS,
            GrossProfit = grossProfit,
            GrossProfitMargin = grossProfitMargin,
            EstimatedOperatingExpenses = estimatedOperatingExpenses,
            NetProfit = netProfit,
            NetProfitMargin = netProfitMargin,
            TotalOrders = totalOrders,
            TotalQuantitySold = totalQuantitySold,
            AverageOrderProfit = avgOrderProfit,
            TopProfitableProducts = topProfitableProducts,
            Notes = GenerateProfitAnalysisNotes(grossProfitMargin, netProfitMargin, totalRevenue)
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR in GetProfitAnalysisAsync: {ex.Message}");
        return new ProfitAnalysisDto
        {
            AnalysisPeriod = $"{startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}",
            Notes = $"Lỗi phân tích lợi nhuận: {ex.Message}"
        };
    }
}
// ✅ HELPER: Ước tính COGS percentage dựa trên category và price range
private decimal EstimateCOGSPercentage(int categoryId, decimal avgPrice)
{
    // ✅ REALISTIC: Industry-based COGS estimates
    var categoryCogsEstimates = new Dictionary<int, decimal>
    {
        // Electronics: 65-75%
        { 1, 70 }, // Điện tử
        { 2, 68 }, // Máy tính
        
        // Fashion: 40-60%
        { 3, 50 }, // Thời trang nam
        { 4, 52 }, // Thời trang nữ
        { 5, 45 }, // Phụ kiện
        
        // Home & Garden: 50-65%
        { 6, 55 }, // Nội thất
        { 7, 60 }, // Đồ gia dụng
        
        // Books & Media: 60-70%
        { 8, 65 }, // Sách
        { 9, 62 }, // Media
        
        // Sports: 45-55%
        { 10, 50 }, // Thể thao
        
        // Beauty & Health: 30-50%
        { 11, 40 }, // Mỹ phẩm
        { 12, 45 }, // Sức khỏe
    };

    var baseCOGS = categoryCogsEstimates.GetValueOrDefault(categoryId, 55); // Default 55%

    // ✅ Adjust based on price range (higher price = potentially lower COGS%)
    if (avgPrice > 1000000) // > 1M VND - luxury/premium
        baseCOGS -= 5;
    else if (avgPrice < 100000) // < 100K VND - budget
        baseCOGS += 5;

    return Math.Min(Math.Max(baseCOGS, 25), 80); // Clamp between 25-80%
}

// ✅ HELPER: Tính toán operating expenses
private decimal CalculateOperatingExpenses(decimal revenue, int orderCount, int sellerId)
{
    // ✅ REALISTIC: Operating expense components
    
    // 1. Platform fees (2-5% of revenue)
    decimal platformFees = revenue * 0.03m; // 3% platform fee
    
    // 2. Payment processing (2-3% of revenue)
    decimal paymentFees = revenue * 0.025m; // 2.5% payment processing
    
    // 3. Shipping costs (estimated per order)
    decimal avgShippingCost = 30000m; // 30K VND per order average
    decimal totalShippingCosts = orderCount * avgShippingCost;
    
    // 4. Marketing expenses (5-10% of revenue for active sellers)
    decimal marketingExpenses = revenue * 0.07m; // 7% marketing
    
    // 5. Packaging & handling (1-2% of revenue)
    decimal packagingCosts = revenue * 0.015m; // 1.5% packaging
    
    // 6. Customer service & returns (1-3% of revenue)
    decimal customerServiceCosts = revenue * 0.02m; // 2% customer service
    
    var totalOpex = platformFees + paymentFees + totalShippingCosts + 
                   marketingExpenses + packagingCosts + customerServiceCosts;

    Console.WriteLine($"Operating Expenses Breakdown: Platform={platformFees:C}, Payment={paymentFees:C}, Shipping={totalShippingCosts:C}, Marketing={marketingExpenses:C}, Packaging={packagingCosts:C}, Service={customerServiceCosts:C}");

    return totalOpex;
}

// ✅ HELPER: Generate analysis notes
private string GenerateProfitAnalysisNotes(decimal grossMargin, decimal netMargin, decimal revenue)
{
    var notes = new List<string>();
    
    // Revenue assessment
    if (revenue < 1000000) // < 1M
        notes.Add("💡 Doanh thu còn thấp - cần tăng cường marketing và mở rộng sản phẩm");
    else if (revenue > 10000000) // > 10M
        notes.Add("✅ Doanh thu tốt - duy trì và tối ưu hóa hiệu quả");
    
    // Gross margin assessment
    if (grossMargin < 20)
        notes.Add("⚠️ Biên lợi nhuận gộp thấp - cần xem xét lại giá bán hoặc chi phí nhập hàng");
    else if (grossMargin > 40)
        notes.Add("✅ Biên lợi nhuận gộp tốt - có thể cân nhắc giảm giá để tăng volume");
    
    // Net margin assessment  
    if (netMargin < 5)
        notes.Add("🔴 Lợi nhuận ròng thấp - cần tối ưu chi phí vận hành");
    else if (netMargin > 15)
        notes.Add("🎯 Lợi nhuận ròng xuất sắc - có thể đầu tư mở rộng");
    
    // General recommendations
    notes.Add("📊 Số liệu dựa trên ước tính thị trường - để có phân tích chính xác hơn, hãy cập nhật chi phí thực tế của sản phẩm");
    
    return string.Join(" | ", notes);
}

        /// <summary>
        /// Lấy danh sách đơn hàng theo trạng thái - RAW SQL BACKUP
        /// </summary>
        public async Task<List<OrderByStatusDto>> GetOrdersByStatusAsync(int sellerId, List<string> statuses)
        {
            try
            {
                Console.WriteLine($"=== GetOrdersByStatusAsync RAW SQL BACKUP for sellerId: {sellerId}, statuses: {string.Join(", ", statuses)} ===");

                // FIX 1: Kiểm tra connection string
                var connectionString = _context.Database.GetConnectionString();
                if (string.IsNullOrEmpty(connectionString))
                {
                    throw new InvalidOperationException("Connection string is null or empty");
                }

                Console.WriteLine($"Using connection string: {connectionString.Substring(0, Math.Min(50, connectionString.Length))}...");

                // FIX 2: Đơn giản hóa detection user table
                string userTableName = null;
                string userIdField = null;

                try
                {
                    // Test với Entity Framework model mapping
                    var testUser = await _context.Users.FirstOrDefaultAsync();
                    userTableName = "Users";
                    userIdField = "UserID";  // Theo model User.cs
                    Console.WriteLine("Using Users table with UserID field");
                }
                catch
                {
                    try
                    {
                        // Fallback: Test AspNetUsers
                        await _context.Database.ExecuteSqlRawAsync("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AspNetUsers'");
                        userTableName = "AspNetUsers";
                        userIdField = "Id";
                        Console.WriteLine("Using AspNetUsers table with Id field");
                    }
                    catch
                    {
                        Console.WriteLine("No user table found, proceeding without user info");
                    }
                }

                // FIX 3: Build SQL query đơn giản hơn
                var statusPlaceholders = string.Join(",", statuses.Select((_, i) => $"@status{i}"));

                string sql;
                if (userTableName != null)
                {
                    sql = $@"
                SELECT DISTINCT
                    o.OrderID,
                    o.Status,
                    o.OrderDate,
                    ISNULL(o.ShippingAddress, '') as ShippingAddress,
                    ISNULL(u.FullName, 'Khách hàng') as CustomerName,
                    ISNULL(u.Email, '') as CustomerEmail,
                    ISNULL(u.Phone, '') as CustomerPhone,
                    COALESCE((
                        SELECT SUM(od2.UnitPrice * od2.Quantity)
                        FROM OrderDetails od2
                        INNER JOIN Products p2 ON od2.ProductID = p2.ProductID
                        WHERE od2.OrderID = o.OrderID AND p2.SellerID = @sellerId
                    ), 0) as TotalAmount,
                    COALESCE((
                        SELECT SUM(od3.Quantity)
                        FROM OrderDetails od3
                        INNER JOIN Products p3 ON od3.ProductID = p3.ProductID
                        WHERE od3.OrderID = o.OrderID AND p3.SellerID = @sellerId
                    ), 0) as TotalItems,
                    CASE WHEN CAST(o.OrderDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as CreatedToday
                FROM Orders o
                INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
                INNER JOIN Products p ON od.ProductID = p.ProductID
                LEFT JOIN {userTableName} u ON o.UserID = u.{userIdField}
                WHERE p.SellerID = @sellerId 
                AND o.Status IN ({statusPlaceholders})
                ORDER BY o.OrderDate DESC
            ";
                }
                else
                {
                    sql = $@"
                SELECT DISTINCT
                    o.OrderID,
                    o.Status,
                    o.OrderDate,
                    ISNULL(o.ShippingAddress, '') as ShippingAddress,
                    'Khách hàng' as CustomerName,
                    '' as CustomerEmail,
                    '' as CustomerPhone,
                    COALESCE((
                        SELECT SUM(od2.UnitPrice * od2.Quantity)
                        FROM OrderDetails od2
                        INNER JOIN Products p2 ON od2.ProductID = p2.ProductID
                        WHERE od2.OrderID = o.OrderID AND p2.SellerID = @sellerId
                    ), 0) as TotalAmount,
                    COALESCE((
                        SELECT SUM(od3.Quantity)
                        FROM OrderDetails od3
                        INNER JOIN Products p3 ON od3.ProductID = p3.ProductID
                        WHERE od3.OrderID = o.OrderID AND p3.SellerID = @sellerId
                    ), 0) as TotalItems,
                    CASE WHEN CAST(o.OrderDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as CreatedToday
                FROM Orders o
                INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
                INNER JOIN Products p ON od.ProductID = p.ProductID
                WHERE p.SellerID = @sellerId 
                AND o.Status IN ({statusPlaceholders})
                ORDER BY o.OrderDate DESC
            ";
                }

                Console.WriteLine($"Generated SQL: {sql.Substring(0, Math.Min(200, sql.Length))}...");

                var result = new List<OrderByStatusDto>();

                await using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();
                Console.WriteLine("Database connection opened successfully");

                await using var command = new SqlCommand(sql, connection);

                // Add parameters
                command.Parameters.Add(new SqlParameter("@sellerId", sellerId));
                Console.WriteLine($"Added parameter @sellerId = {sellerId}");

                for (int i = 0; i < statuses.Count; i++)
                {
                    command.Parameters.Add(new SqlParameter($"@status{i}", statuses[i]));
                    Console.WriteLine($"Added parameter @status{i} = {statuses[i]}");
                }

                await using var reader = await command.ExecuteReaderAsync();
                int rowCount = 0;

                while (await reader.ReadAsync())
                {
                    rowCount++;
                    var orderDto = new OrderByStatusDto
                    {
                        OrderID = reader.GetInt32("OrderID"),
                        Status = reader.GetString("Status"),
                        OrderDate = reader.GetDateTime("OrderDate"),
                        TotalAmount = reader.GetDecimal("TotalAmount"),
                        TotalItems = reader.GetInt32("TotalItems"),
                        ShippingAddress = reader.GetString("ShippingAddress"),
                        CustomerName = reader.GetString("CustomerName"),
                        CustomerEmail = reader.GetString("CustomerEmail"),
                        CustomerPhone = reader.GetString("CustomerPhone"),
                        CreatedToday = reader.GetInt32("CreatedToday") == 1
                    };

                    result.Add(orderDto);
                    Console.WriteLine($"Row {rowCount}: Order {orderDto.OrderID}, Amount: {orderDto.TotalAmount:C}");
                }

                Console.WriteLine($"Raw SQL returned {result.Count} orders");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetOrdersByStatusAsync RAW SQL: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                throw;
            }
        }

    }
}