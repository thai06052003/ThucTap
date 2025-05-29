using System;
using System.Collections.Generic;

namespace ShopxEX1.Dtos.Statistics
{
    /// <summary>
    /// DTO chứa dữ liệu tổng quan cho dashboard của người bán
    /// </summary>
    public class SellerDashboardDto
    {
        // Tổng doanh thu của shop
        public decimal TotalRevenue { get; set; }

        // Tổng số đơn hàng
        public int TotalOrderCount { get; set; }

        // Tổng số sản phẩm shop đang bán
        public int TotalProductCount { get; set; }

        // Số sản phẩm đang có sẵn để bán (còn hàng)
        public int AvailableProductCount { get; set; }

        // Số đơn hàng mới (chờ xác nhận)
        public int PendingOrdersCount { get; set; }

        // Số đơn hàng đang xử lý
        public int ProcessingOrdersCount { get; set; }

        // Số đơn hàng đã hoàn thành
        public int CompletedOrdersCount { get; set; }

        // Số đơn hàng đã hủy
        public int CancelledOrdersCount { get; set; }

        // Doanh thu hôm nay
        public decimal RevenueToday { get; set; }

        // Doanh thu tuần này
        public decimal RevenueThisWeek { get; set; }

        // Doanh thu tháng này
        public decimal RevenueThisMonth { get; set; }

        // Doanh thu tháng trước
        public decimal RevenueLastMonth { get; set; }

        // Phần trăm tăng trưởng doanh thu (so với tháng trước)
        public decimal RevenueTrendPercentage { get; set; }
    }

    /// <summary>
    /// DTO chứa dữ liệu doanh thu theo khoảng thời gian
    /// </summary>
    public class RevenueStatDto
    {
        // Kỳ thời gian định dạng hiển thị (ngày/tháng/năm)
        public string Period { get; set; }

        // Ngày thống kê
        public DateTime Date { get; set; }

        // Doanh thu trong kỳ
        public decimal Revenue { get; set; }

        // Số lượng đơn hàng trong kỳ
        public int OrdersCount { get; set; }

        // Số lượng sản phẩm đã bán trong kỳ
        public int ProductsSold { get; set; }
    }

    /// <summary>
    /// DTO chứa dữ liệu sản phẩm bán chạy
    /// </summary>
    public class TopSellingProductDto
    {
        // ID sản phẩm
        public int ProductID { get; set; }

        // Tên sản phẩm
        public string ProductName { get; set; }

        // URL hình ảnh sản phẩm
        public string ImageURL { get; set; }

        // Số lượng đã bán
        public int QuantitySold { get; set; }

        // Doanh thu từ sản phẩm
        public decimal Revenue { get; set; }

        // Giá bán hiện tại
        public decimal UnitPrice { get; set; }

        // Số lượng tồn kho
        public int RemainingStock { get; set; }
    }

    /// <summary>
    /// DTO chứa số liệu đơn hàng theo trạng thái
    /// </summary>
    public class OrderStatusStatsDto
    {
        public int Pending { get; set; }                // "Chờ xác nhận"
            public int Processing { get; set; }             // "Đang xử lý" 
            public int Shipping { get; set; }               // "Đang giao"
            public int Delivered { get; set; }              // "Đã giao"
            public int RefundRequested { get; set; }        // "Yêu cầu trả hàng/ hoàn tiền"
            public int Cancelled { get; set; }              // "Đã hủy"
            public int Refunded { get; set; }               // "Đã hoàn tiền"
            public int Completed { get; set; }              // "Hoàn thành" 
            
                // ✅ COMPUTED PROPERTIES
            public int Total => Pending + Processing + Shipping + Delivered + RefundRequested + Cancelled + Refunded + Completed;
            
            // ✅ PERCENTAGES
            public decimal PendingPercentage => Total > 0 ? (decimal)Pending / Total * 100 : 0;
            public decimal ProcessingPercentage => Total > 0 ? (decimal)Processing / Total * 100 : 0;
            public decimal ShippingPercentage => Total > 0 ? (decimal)Shipping / Total * 100 : 0;
            public decimal DeliveredPercentage => Total > 0 ? (decimal)Delivered / Total * 100 : 0;
            public decimal CompletedPercentage => Total > 0 ? (decimal)Completed / Total * 100 : 0;
            
            // ✅ BUSINESS METRICS
            public decimal CompletionRate => Total > 0 ? (decimal)(Delivered + Completed) / Total * 100 : 0;
            public decimal CancellationRate => Total > 0 ? (decimal)(Cancelled + Refunded) / Total * 100 : 0;
            public decimal RefundRate => Total > 0 ? (decimal)(RefundRequested + Refunded) / Total * 100 : 0;
            
            // ✅ ACTIVE ORDERS (cần xử lý)
            public int ActiveOrders => Pending + Processing + Shipping + RefundRequested;
            public int FinalizedOrders => Delivered + Completed + Cancelled + Refunded;
    }

    /// <summary>
    /// DTO chứa dữ liệu thống kê theo ngày
    /// </summary>
    public class DailyStatsDto
    {
        // Ngày thống kê
        public DateTime Date { get; set; }

        // Hiển thị tên thứ trong tuần
        public string DayOfWeek { get; set; }

        // Doanh thu trong ngày
        public decimal Revenue { get; set; }

        // Số đơn hàng trong ngày
        public int OrdersCount { get; set; }

        // Số sản phẩm bán được trong ngày
        public int ProductsSold { get; set; }
    }

    /// <summary>
    /// DTO cho dữ liệu phân tích biểu đồ hoàn chỉnh
    /// </summary>
    public class ChartAnalyticsDto
    {
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<DailyChartDataDto> DailyData { get; set; } = new();
        public PeriodMetricsDto CurrentPeriodMetrics { get; set; } = new();
        public PeriodMetricsDto PreviousPeriodMetrics { get; set; } = new();
        public GrowthMetricsDto GrowthMetrics { get; set; } = new();
        public TrendAnalysisDto TrendAnalysis { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho dữ liệu hàng ngày trong biểu đồ
    /// </summary>
    public class DailyChartDataDto
    {
        public DateTime Date { get; set; }
        public string DayLabel { get; set; } = string.Empty; // "25/05"
        public string DayName { get; set; } = string.Empty;  // "Thứ 6"
        public decimal Revenue { get; set; }
        public int OrdersCount { get; set; }
        public int ProductsSold { get; set; }
        public int UniqueCustomers { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    /// <summary>
    /// DTO cho metrics của một kỳ
    /// </summary>
    public class PeriodMetricsDto
    {
        public string PeriodName { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int TotalProductsSold { get; set; }
        public int TotalUniqueCustomers { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal AverageDailyRevenue { get; set; }
        public int DaysWithSales { get; set; }
        public int TotalDays { get; set; }
        public DailyChartDataDto? PeakDay { get; set; }
        public DailyChartDataDto? LowestDay { get; set; }
    }

    /// <summary>
    /// DTO cho metrics tăng trưởng
    /// </summary>
    public class GrowthMetricsDto
    {
        public decimal RevenueGrowth { get; set; }
        public decimal OrdersGrowth { get; set; }
        public decimal ProductsGrowth { get; set; }
        public decimal CustomersGrowth { get; set; }
        public decimal AOVGrowth { get; set; }
        public decimal DailyRevenueGrowth { get; set; }
    }

    /// <summary>
    /// DTO cho phân tích xu hướng
    /// </summary>
    public class TrendAnalysisDto
    {
        public string Direction { get; set; } = "STABLE"; // INCREASING, DECREASING, STABLE
        public double Strength { get; set; } // 0-1, mức độ mạnh của trend
        public bool IsAccelerating { get; set; }
        public double Volatility { get; set; } // % biến động
        public string Recommendation { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho phân tích lợi nhuận đơn giản
    /// </summary>
    public class ProfitAnalysisDto
    {
        public string AnalysisPeriod { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public decimal EstimatedCOGS { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal GrossProfitMargin { get; set; }
        public decimal EstimatedOperatingExpenses { get; set; }
        public decimal NetProfit { get; set; }
        public decimal NetProfitMargin { get; set; }
        public int TotalOrders { get; set; }
        public int TotalQuantitySold { get; set; }
        public decimal AverageOrderProfit { get; set; }
        public List<ProductProfitDto> TopProfitableProducts { get; set; } = new();
        public string Notes { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho lợi nhuận sản phẩm
    /// </summary>
    public class ProductProfitDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public decimal EstimatedCOGS { get; set; }
        public decimal GrossProfit { get; set; }
        public int QuantitySold { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    /// <summary>
    /// DTO cho thông tin khách hàng VIP
    /// </summary>
    public class TopCustomerDto
    {
        public int CustomerID { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal AverageOrderValue { get; set; }
        public DateTime FirstOrderDate { get; set; }
        public DateTime LastOrderDate { get; set; }
        public decimal CustomerLifetimeValue { get; set; }
        public bool IsVIP { get; set; }
    }

    // THÊM VÀO CUỐI FILE (sau ProductProfitDto)

    /// <summary>
    /// DTO cho đơn hàng theo trạng thái
    /// </summary>
    public class OrderByStatusDto
    {
        public int OrderID { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public int TotalItems { get; set; }
        public bool CreatedToday { get; set; }
    
}
}