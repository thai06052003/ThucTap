﻿using AutoMapper;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Orders;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Data;
using System.Data.Common;

namespace ShopxEX1.Services.Implementations
{
    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<OrderService> _logger;
        private readonly ICartService _cartService; // Inject CartService để xóa giỏ hàng
        private readonly string _connectionString;

        // Định nghĩa các trạng thái đơn hàng hợp lệ
        private static readonly List<string> ValidOrderStatuses = new List<string>
        {
            "Chờ xác nhận", "Đang xử lý", "Đang giao", "Đã giao", "Đã hủy", "Đã hoàn tiền", "Yêu cầu trả hàng/ hoàn tiền"
        };
        private static readonly Dictionary<string, int> OrderStatusPriority = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            { "Chờ xác nhận", 1 },
            { "Đang xử lý", 2 },
            { "Đang giao", 3 },
            { "Đã giao", 4 },
            { "Yêu cầu trả hàng/ hoàn tiền", 5 }, // Đưa Yêu cầu TH/HT lên trước Đã hủy và Đã hoàn tiền (theo logic mới)
            { "Đã hủy", 6 },
            { "Đã hoàn tiền", 7 }
            // Thêm các trạng thái khác nếu có và gán thứ tự ưu tiên
        };
        // Helper function để lấy thứ tự ưu tiên, trả về giá trị lớn nếu không tìm thấy để đẩy xuống cuối
        private static int GetStatusPriority(string status)
        {
            if (string.IsNullOrEmpty(status) || !OrderStatusPriority.TryGetValue(status, out int priority))
            {
                return int.MaxValue; // Nếu trạng thái không xác định, đẩy xuống cuối
            }
            return priority;
        }
        public OrderService(AppDbContext context, IMapper mapper, ILogger<OrderService> logger, ICartService cartService)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
            _cartService = cartService;
            _connectionString = _context.Database.GetConnectionString() ?? throw new InvalidOperationException("Database connection string is not configured.");
        }
        // Hàm helper để tạo kết nối DB
        private DbConnection CreateDbConnection() => new SqlConnection(_connectionString);

        public async Task<List<OrderDto>> CreateOrderFromCartAsync(int userId, OrderCreateDto createDto)
        {
            _logger.LogInformation("UserID {UserId}: Bắt đầu tạo đơn hàng Dapper. CartItemIDs: {SelectedCount}", userId, createDto.SelectedCartItemIds?.Count ?? 0);

            if (createDto.SelectedCartItemIds == null || !createDto.SelectedCartItemIds.Any())
            {
                _logger.LogWarning("UserID {UserId}: Không có sản phẩm nào được chọn.", userId);
                throw new InvalidOperationException("Vui lòng chọn ít nhất một sản phẩm để đặt hàng.");
            }

            // Kiểm tra User tồn tại vẫn có thể dùng EF Core context nếu tiện
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null)
            {
                _logger.LogWarning("UserID {UserId}: Người dùng không tồn tại.", userId);
                throw new KeyNotFoundException($"Người dùng với ID {userId} không tồn tại.");
            }

            List<CartItem> selectedCartItemsFromDb;

            // Sử dụng Dapper để lấy CartItems đã chọn cùng với Product và Seller
            // Dapper sẽ tự động xử lý mệnh đề IN với danh sách tham số
            var sqlQueryCartItems = @"
                                    SELECT
                                        -- CartItem columns - Dapper sẽ cố gắng map các cột này vào đối tượng CartItem gốc
                                        ci.CartItemID,
                                        ci.CartID,      -- Giữ nguyên tên để Dapper map vào cartItem.CartID
                                        ci.ProductID,   -- Giữ nguyên tên để Dapper map vào cartItem.ProductID
                                        ci.Quantity,
                                        ci.AddedAt,

                                        -- Cart columns (cho đối tượng Cart lồng nhau) - Bắt đầu split từ đây
                                        crt.CartID      AS Dapper_SplitOn_Cart_CartID, -- Khóa chính của Cart, dùng cho splitOn
                                        crt.UserID      AS Cart_UserID_For_CartObject, -- Bí danh để tránh nhầm với UserID của User
                                        crt.CreatedAt   AS Cart_CreatedAt_For_CartObject,

                                        -- Product columns (cho đối tượng Product lồng nhau) - Bắt đầu split từ đây
                                        p.ProductID     AS Dapper_SplitOn_Product_ProductID, -- Khóa chính của Product, dùng cho splitOn
                                        p.CategoryID,
                                        p.ProductName,
                                        p.Description   AS Product_Description,
                                        p.Price         AS Product_Price,
                                        p.StockQuantity AS Product_StockQuantity,
                                        p.CreatedAt     AS Product_CreatedAt,
                                        p.IsActive      AS Product_IsActive,
                                        p.ImageURL      AS Product_ImageURL,
                                        p.SellerCategoryID AS Product_SellerCategoryID,
                                        p.SellerID,
                                        p.UpdatedAt     AS Product_UpdatedAt,

                                        -- Seller columns (cho đối tượng Seller lồng trong Product) - Bắt đầu split từ đây
                                        s.SellerID      AS Dapper_SplitOn_Seller_SellerID, -- Khóa chính của Seller, dùng cho splitOn
                                        s.UserID        AS Seller_UserID_FK,
                                        s.ShopName,
                                        s.CreatedAt     AS Seller_CreatedAt,
                                        s.IsActive      AS Seller_IsActive,

                                        -- Category columns (cho đối tượng Category lồng trong Product) - Bắt đầu split từ đây
                                        c.CategoryID      AS Dapper_SplitOn_Category_CategoryID, -- Khóa chính của Category, dùng cho splitOn
                                        c.CategoryName
                                    FROM CartItems ci
                                    INNER JOIN Carts crt ON ci.CartID = crt.CartID
                                    INNER JOIN Products p ON ci.ProductID = p.ProductID
                                    INNER JOIN Sellers s ON p.SellerID = s.SellerID                                    
                                    INNER JOIN Categories c ON p.CategoryID = c.CategoryID
                                    WHERE crt.UserID = @UserIdParam
                                      AND ci.CartItemID IN @SelectedCartItemIdsParam";

            using (var connection = CreateDbConnection())
            {
                await connection.OpenAsync();
                var cartItemData = await connection.QueryAsync<CartItem, Cart, Product, Seller, Category, CartItem>(
                    sqlQueryCartItems,
                    map: (cartItem, cart, product, seller, category) =>
                    {
                        cartItem.Cart = cart;       // Dapper map vào đây
                        cartItem.Product = product;   // Dapper map vào đây
                        if (cartItem.Product != null)
                        {
                            cartItem.Product.Seller = seller; // Gán seller vào product
                            cartItem.Product.Category = category; // Gán seller vào product
                        }
                        return cartItem;
                    },
                    param: new { UserIdParam = userId, SelectedCartItemIdsParam = createDto.SelectedCartItemIds },
                    splitOn: "Dapper_SplitOn_Cart_CartID,Dapper_SplitOn_Product_ProductID,Dapper_SplitOn_Seller_SellerID,Dapper_SplitOn_Category_CategoryID"
                );
                selectedCartItemsFromDb = cartItemData.ToList();
            }

            // Xác thực lại số lượng item lấy được so với yêu cầu
            if (selectedCartItemsFromDb.Count != createDto.SelectedCartItemIds.Count)
            {
                var foundDbIds = selectedCartItemsFromDb.Select(ci => ci.CartItemID).ToList();
                var missingOrInvalidClientIds = createDto.SelectedCartItemIds.Except(foundDbIds).ToList();
                _logger.LogWarning("UserID {UserId}: Một số CartItemIDs không hợp lệ hoặc không thuộc về người dùng sau khi query Dapper: {MissingIds}", userId, string.Join(", ", missingOrInvalidClientIds));
                throw new InvalidOperationException($"Một hoặc nhiều sản phẩm bạn chọn không hợp lệ hoặc không tìm thấy trong giỏ hàng của bạn. Các ID bị ảnh hưởng: {string.Join(", ", missingOrInvalidClientIds)}");
            }
            if (!selectedCartItemsFromDb.Any())
            {
                throw new InvalidOperationException("Không có sản phẩm nào được chọn hợp lệ từ giỏ hàng.");
            }

            // Nhóm theo SellerID (logic này vẫn là C# LINQ to Objects)
            var itemsGroupedBySeller = selectedCartItemsFromDb
                .Where(ci => ci.Product != null && ci.Product.Seller != null)
                .GroupBy(ci => ci.Product!.SellerID)
                .ToList();

            if (!itemsGroupedBySeller.Any())
            {
                _logger.LogWarning("UserID {UserId}: Các sản phẩm đã chọn không có thông tin người bán hợp lệ.", userId);
                throw new InvalidOperationException("Các sản phẩm được chọn không có thông tin người bán hợp lệ.");
            }

            var createdOrdersDtoList = new List<OrderDto>();
            List<Order> tempNewOrders = new List<Order>();
            // Sử dụng transaction của EF Core cho các thao tác ghi
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                Discount? globalAppliedDiscount = null;
                if (!string.IsNullOrWhiteSpace(createDto.DiscountCode))
                {
                    // Lấy discount vẫn có thể dùng EF Core hoặc Dapper
                    globalAppliedDiscount = await _context.Discounts
                        .AsNoTracking()
                        .FirstOrDefaultAsync(d => d.DiscountCode.ToUpper() == createDto.DiscountCode.ToUpper() &&
                                             d.IsActive && d.StartDate <= DateTime.UtcNow && d.EndDate >= DateTime.UtcNow);
                    if (globalAppliedDiscount == null)
                    {
                        throw new InvalidOperationException($"Mã giảm giá '{createDto.DiscountCode}' không hợp lệ.");
                    }
                }

                foreach (var sellerGroup in itemsGroupedBySeller)
                {
                    var sellerIdOfGroup = sellerGroup.Key;
                    var cartItemsForThisSeller = sellerGroup.ToList();
                    decimal subTotalAmountForSellerOrder = 0;
                    var orderDetailsForThisSellerOrder = new List<OrderDetail>();

                    foreach (var cartItemDapper in cartItemsForThisSeller) // cartItemDapper là từ Dapper query
                    {
                        // CẦN LẤY LẠI PRODUCT ENTITY ĐỂ EF CORE THEO DÕI THAY ĐỔI STOCK
                        var productEntity = await _context.Products.FindAsync(cartItemDapper.ProductID);
                        if (productEntity == null)
                        {
                            throw new KeyNotFoundException($"Sản phẩm ID {cartItemDapper.ProductID} không tìm thấy trong DB khi tạo OrderDetail.");
                        }

                        if (productEntity.StockQuantity < cartItemDapper.Quantity)
                        {
                            throw new InvalidOperationException($"Sản phẩm '{productEntity.ProductName}' của shop '{cartItemDapper.Product?.Seller?.ShopName ?? "Không rõ"}' không đủ hàng ({productEntity.StockQuantity} còn lại, cần {cartItemDapper.Quantity}).");
                        }

                        var orderDetail = new OrderDetail
                        {
                            ProductID = productEntity.ProductID,
                            Quantity = cartItemDapper.Quantity,
                            UnitPrice = productEntity.Price // Giá tại thời điểm đặt hàng
                        };
                        orderDetailsForThisSellerOrder.Add(orderDetail);
                        subTotalAmountForSellerOrder += orderDetail.Quantity * orderDetail.UnitPrice;

                        productEntity.StockQuantity -= cartItemDapper.Quantity;
                        _context.Products.Update(productEntity); // EF Core theo dõi thay đổi này
                    }

                    decimal finalTotalAmountForSellerOrder = subTotalAmountForSellerOrder;


                    var newOrder = new Order
                    {
                        UserID = userId,
                        OrderDate = DateTime.UtcNow,
                        TotalAmount = finalTotalAmountForSellerOrder,
                        TotalPayment = (globalAppliedDiscount != null && globalAppliedDiscount.DiscountPercent != null) ? finalTotalAmountForSellerOrder / 100 * (100 - globalAppliedDiscount.DiscountPercent) : finalTotalAmountForSellerOrder,
                        Status = "Đang xử lý",
                        ShippingAddress = createDto.ShippingAddress,
                        DiscountCode = globalAppliedDiscount?.DiscountCode,
                        DiscountID = globalAppliedDiscount?.DiscountID,
                        OrderDetails = orderDetailsForThisSellerOrder
                    };
                    _context.Orders.Add(newOrder);
                    tempNewOrders.Add(newOrder);
                    // Lưu tất cả các Order mới, OrderDetail mới, và cập nhật Product stock bằng EF Core
                }
                await _context.SaveChangesAsync();


                foreach (var orderEntity in tempNewOrders) // Lặp qua danh sách tạm
                {
                    await _context.Entry(orderEntity).Reference(o => o.User).LoadAsync();
                    await _context.Entry(orderEntity).Collection(o => o.OrderDetails).LoadAsync();
                    foreach (var detail in orderEntity.OrderDetails)
                    {
                        await _context.Entry(detail).Reference(d => d.Product).LoadAsync();
                        if (detail.Product != null)
                        {
                            await _context.Entry(detail.Product).Reference(p => p.Seller).LoadAsync();
                        }
                    }
                    if (orderEntity.DiscountID.HasValue)
                    {
                        await _context.Entry(orderEntity).Reference(o => o.Discount).LoadAsync();
                    }

                    createdOrdersDtoList.Add(_mapper.Map<OrderDto>(orderEntity));
                }

                // Xóa các CartItem đã được đặt hàng (dùng EF Core)
                var cartItemIdsToRemove = selectedCartItemsFromDb.Select(ci => ci.CartItemID).ToList();
                if (cartItemIdsToRemove.Any())
                {
                    foreach (var cartItem in cartItemIdsToRemove)
                    {
                        var efCartItemsToRemove = await _context.CartItems.FirstOrDefaultAsync(ci => ci.CartItemID == cartItem);
                        _context.CartItems.RemoveRange(efCartItemsToRemove);
                        await _context.SaveChangesAsync();
                    }    
                    

                }

                await transaction.CommitAsync();
                return createdOrdersDtoList;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "UserID {UserId}: Lỗi nghiêm trọng khi tạo đơn hàng.", userId);
                throw;
            }
        }

        public async Task<PagedResult<OrderDto>> GetOrdersByUserIdAsync(int userId, OrderFilterDto filter, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                                .Where(o => o.UserID == userId)
                                // Include các navigation properties cần thiết cho OrderDto
                                .Include(o => o.User) // Cho CustomerInfo trong OrderDto
                                .Include(o => o.OrderDetails)
                                    .ThenInclude(od => od.Product) // Cho Items.ProductName, ProductImageURL
                                        .ThenInclude(p => p.Seller) // Cho Items.ShopName (nếu SellerID là trong Product
                                .Include(o => o.OrderDetails)
                                    .ThenInclude(od => od.Product) // Cho Items.ProductName, ProductImageURL
                                        .ThenInclude(p => p.Category) // Cho CategoryName
                                .Include(o => o.Discount) // Nếu OrderDto có thông tin Discount
                                .AsNoTracking();

            // Apply Filters (giữ nguyên logic filter của bạn hoặc điều chỉnh nếu cần)
            // Ví dụ: filter theo Status, DateRange
            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(o => o.Status.ToLower() == filter.Status.ToLower());
            }
            if (filter.StartDate.HasValue)
            {
                query = query.Where(o => o.OrderDate >= filter.StartDate.Value.Date);
            }
            if (filter.EndDate.HasValue)
            {
                query = query.Where(o => o.OrderDate < filter.EndDate.Value.Date.AddDays(1));
            }
            // Bỏ qua các filter phức tạp như SearchTerm, MinPrice, MaxPrice nếu không cần cho "my-orders"
            // hoặc giữ lại nếu bạn muốn Customer cũng có thể lọc sâu.

            // Apply Sorting (giữ nguyên logic sắp xếp của bạn hoặc điều chỉnh)
            // Khách hàng thường chỉ cần sắp xếp theo ngày đặt hàng.
            if (!string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLower())
                {
                    case "orderdate_asc":
                        query = query.OrderBy(o => o.OrderDate);
                        break;
                    default:
                        query = query.OrderByDescending(o => o.OrderDate);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(o => o.OrderDate); // Mặc định sắp xếp mới nhất lên đầu
            }

            var totalCount = await query.CountAsync();
            var items = await query.Skip((pageNumber - 1) * pageSize)
                                   .Take(pageSize)
                                   .ToListAsync();

            // Map sang OrderDto thay vì OrderSummaryDto
            var mappedItems = _mapper.Map<IEnumerable<OrderDto>>(items);
            return new PagedResult<OrderDto>(mappedItems, pageNumber, pageSize, totalCount);
        }

        public async Task<PagedResult<OrderSummaryDto>> GetAllOrdersAsync(OrderFilterDto filter, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                                .Include(o => o.User)
                                .Include(o => o.OrderDetails)
                                .AsNoTracking();

            // --- Apply Filters ---
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTermLower = filter.SearchTerm.ToLower();
                // Tìm theo tên khách hàng (User.FullName) hoặc mã đơn hàng (OrderID)
                // Giả định bạn muốn tìm cả theo số OrderID nếu người dùng nhập số
                if (int.TryParse(searchTermLower, out int searchOrderId))
                {
                    query = query.Where(o => o.OrderID == searchOrderId || (o.User != null && o.User.FullName != null && o.User.FullName.ToLower().Contains(searchTermLower)));
                }
                else
                {
                    query = query.Where(o => o.User != null && o.User.FullName != null && o.User.FullName.ToLower().Contains(searchTermLower));
                }
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(o => o.Status.ToLower() == filter.Status.ToLower());
            }

            if (filter.StartDate.HasValue)
            {
                query = query.Where(o => o.OrderDate >= filter.StartDate.Value.Date); // So sánh chỉ ngày
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(o => o.OrderDate < filter.EndDate.Value.Date.AddDays(1)); // Đến hết ngày EndDate
            }

            if (filter.MinPrice.HasValue)
            {
                // Lọc theo TotalAmount hoặc TotalPayment tùy theo logic của bạn.
                // Ở đây ví dụ dùng TotalAmount
                query = query.Where(o => o.TotalAmount >= filter.MinPrice.Value);
            }

            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(o => o.TotalAmount <= filter.MaxPrice.Value);
            }

            // --- Apply Sorting ---
            if (!string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLower())
                {
                    case "totalamount_asc":
                        query = query.OrderBy(o => o.TotalAmount);
                        break;
                    case "totalamount_desc":
                        query = query.OrderByDescending(o => o.TotalAmount);
                        break;
                    case "customername_asc":
                        query = query.OrderBy(o => o.User != null ? o.User.FullName : string.Empty);
                        break;
                    case "customername_desc":
                        query = query.OrderByDescending(o => o.User != null ? o.User.FullName : string.Empty);
                        break;
                    case "status_asc":
                        query = query.OrderBy(o =>
                            o.Status == "Chờ xác nhận" ? 1 :
                            o.Status == "Đang xử lý" ? 2 :
                            o.Status == "Đang giao" ? 3 :
                            o.Status == "Đã giao" ? 4 :
                            o.Status == "Yêu cầu trả hàng/ hoàn tiền" ? 5 : // Thứ tự mới
                            o.Status == "Đã hủy" ? 6 :
                            o.Status == "Đã hoàn tiền" ? 7 : 0
                        ).ThenByDescending(o => o.OrderDate); // Sắp xếp phụ theo ngày nếu trạng thái giống nhau
                        break;
                    case "status_desc":
                        query = query.OrderByDescending(o =>
                            o.Status == "Chờ xác nhận" ? 1 :
                            o.Status == "Đang xử lý" ? 2 :
                            o.Status == "Đang giao" ? 3 :
                            o.Status == "Đã giao" ? 4 :
                            o.Status == "Yêu cầu trả hàng/ hoàn tiền" ? 5 : // Thứ tự mới
                            o.Status == "Đã hủy" ? 6 :
                            o.Status == "Đã hoàn tiền" ? 7 : 0
                        ).ThenByDescending(o => o.OrderDate); // Sắp xếp phụ theo ngày nếu trạng thái giống nhau
                        break;
                    case "orderdate_asc":
                        query = query.OrderBy(o => o.OrderDate);
                        break;
                    // Mặc định (orderdate_desc) đã được xử lý sau nếu SortBy rỗng hoặc không khớp
                    default: // Mặc định hoặc nếu SortBy không hợp lệ
                        query = query.OrderByDescending(o => o.OrderDate);
                        break;
                }
            }
            else
            {
                // Mặc định sắp xếp theo ngày đặt hàng mới nhất nếu không có SortBy nào được chỉ định
                query = query.OrderByDescending(o => o.OrderDate);
                query = query.OrderBy(o =>
                            o.Status == "Chờ xác nhận" ? 1 :
                            o.Status == "Đang xử lý" ? 2 :
                            o.Status == "Đang giao" ? 3 :
                            o.Status == "Đã giao" ? 4 :
                            o.Status == "Yêu cầu trả hàng/ hoàn tiền" ? 5 : // Thứ tự mới
                            o.Status == "Đã hủy" ? 6 :
                            o.Status == "Đã hoàn tiền" ? 7 : 0
                        ).ThenByDescending(o => o.OrderDate); // Sắp xếp phụ theo ngày nếu trạng thái giống nhau
            }

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();
            var mappedItems = _mapper.Map<IEnumerable<OrderSummaryDto>>(items);
            return new PagedResult<OrderSummaryDto>(mappedItems, pageNumber, pageSize, totalCount);
        }

        public async Task<PagedResult<OrderSummaryDto>> GetOrdersBySellerIdAsync(int sellerId, OrderFilterDto filter, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                                .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
                                // Hoặc sử dụng join nếu bạn cần thêm thông tin từ OrderDetails/Products trong điều kiện lọc chính
                                // .Join(_context.OrderDetails, o => o.OrderID, od => od.OrderID, (o, od) => new { Order = o, OrderDetail = od })
                                // .Join(_context.Products, j => j.OrderDetail.ProductID, p => p.ProductID, (j, p) => new { Order = j.Order, Product = p })
                                // .Where(x => x.Product.SellerID == sellerId)
                                // .Select(x => x.Order) // Quay lại IQueryable<Order>
                                // .Distinct() // Quan trọng nếu một Order có nhiều item của cùng seller
                                .Include(o => o.User)
                                .Include(o => o.OrderDetails) // Cần để tính NumberOfItems
                                .AsNoTracking();

            query = ApplyOrderFilters(query, filter); // Áp dụng các filter khác sau khi đã lọc theo seller
            query = query.OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            var mappedItems = _mapper.Map<IEnumerable<OrderSummaryDto>>(items);
            return new PagedResult<OrderSummaryDto>(mappedItems, pageNumber, pageSize, totalCount);
        }

        private IQueryable<Order> ApplyOrderFilters(IQueryable<Order> query, OrderFilterDto filter)
        {
            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(o => o.Status.ToLower() == filter.Status.ToLower());
            }
            if (filter.StartDate.HasValue)
            {
                query = query.Where(o => o.OrderDate >= filter.StartDate.Value);
            }
            if (filter.EndDate.HasValue)
            {
                // Thêm 1 ngày và lấy nhỏ hơn để bao gồm cả ngày EndDate
                query = query.Where(o => o.OrderDate < filter.EndDate.Value.AddDays(1));
            }
            return query;
        }

        public async Task<OrderDto?> GetOrderDetailsByIdAsync(int orderId, int userId, string userRole)
        {
            var order = await _context.Orders
                                    .Include(o => o.User) // CustomerInfo
                                    .Include(o => o.OrderDetails)
                                        .ThenInclude(od => od.Product) // Product info for each item
                                            .ThenInclude(p => p.Seller)
                                    .Include(o => o.OrderDetails)
                                        .ThenInclude(od => od.Product) // Product info for each item
                                            .ThenInclude(p => p.Category)
                                    .Include(o => o.Discount) // Discount info
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(o => o.OrderID == orderId);

            if (order == null) return null;

            // Kiểm tra quyền truy cập
            bool canAccess = false;
            if (userRole == "Admin")
            {
                canAccess = true;
            }
            else if (userRole == "Customer" && order.UserID == userId)
            {
                canAccess = true;
            }
            else if (userRole == "Seller")
            {
                // Seller có thể xem nếu đơn hàng chứa sản phẩm của họ
                bool sellerProductInOrder = await _context.OrderDetails
                    .AnyAsync(od => od.OrderID == orderId && od.Product.SellerID == userId); // Giả định userId là SellerID khi role là Seller
                if (sellerProductInOrder) canAccess = true;
            }

            if (!canAccess)
            {
                _logger.LogWarning("Người dùng UserID {userId} với vai trò {UserRole} cố gắng truy cập đơn hàng OrderID {OrderId} không được phép.", userId, userRole, orderId);
                return null; // Hoặc throw UnauthorizedAccessException
            }

            return _mapper.Map<OrderDto>(order);
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatusUpdateDto statusUpdateDto, int userId, string userRole)
        {
            _logger.LogInformation("Bắt đầu cập nhật trạng thái cho OrderID {OrderId} bởi UserID {userId} ({UserRole}) thành {NewStatus}",
                orderId, userId, userRole, statusUpdateDto.NewStatus);

            if (!ValidOrderStatuses.Contains(statusUpdateDto.NewStatus, StringComparer.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại cho OrderID {OrderId}: Trạng thái mới '{NewStatus}' không hợp lệ.", orderId, statusUpdateDto.NewStatus);
                throw new InvalidOperationException($"Trạng thái '{statusUpdateDto.NewStatus}' không hợp lệ.");
            }

            var order = await _context.Orders
                                    .Include(o => o.OrderDetails)
                                        .ThenInclude(od => od.Product) // Cần để hoàn trả số lượng nếu hủy
                                    .FirstOrDefaultAsync(o => o.OrderID == orderId);

            if (order == null)
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại: Không tìm thấy OrderID {OrderId}", orderId);
                throw new KeyNotFoundException($"Đơn hàng với ID {orderId} không tồn tại.");
            }

            // Kiểm tra quyền (Admin hoặc Seller sở hữu sản phẩm trong đơn hàng)
            bool canUpdate = false;
            if (userRole == "Admin")
            {
                //if (statusUpdateDto.NewStatus.Equals("Đã hủy", StringComparison.OrdinalIgnoreCase))
                canUpdate = true;
            }
            else if (userRole == "Seller")
            {
                // Seller chỉ có thể cập nhật nếu đơn hàng chứa sản phẩm của họ
                // Và không phải là tất cả các trạng thái (ví dụ, không thể tự ý "Đã giao" nếu chưa giao)
                bool sellerProductInOrder = await _context.OrderDetails
                    .AnyAsync(od => od.OrderID == orderId && od.Product.SellerID == userId);
                if (sellerProductInOrder)
                {
                    // Seller có thể cập nhật thành Đang xử lý, Đang giao.
                    // Có thể cần logic phức tạp hơn ở đây để giới hạn các trạng thái Seller có thể set.
                    if (statusUpdateDto.NewStatus.Equals("Đang xử lý", StringComparison.OrdinalIgnoreCase) ||
                        statusUpdateDto.NewStatus.Equals("Đang giao", StringComparison.OrdinalIgnoreCase) ||
                        statusUpdateDto.NewStatus.Equals("Đã giao", StringComparison.OrdinalIgnoreCase) ||
                        statusUpdateDto.NewStatus.Equals("Đã hủy", StringComparison.OrdinalIgnoreCase) && order.Status == "Chờ xác nhận" // Seller có thể hủy đơn Chờ xác nhận
                        )
                    {
                        canUpdate = true;
                    }
                }
            }

            if (!canUpdate)
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại cho OrderID {OrderId}: UserID {userId} ({UserRole}) không có quyền.", orderId, userId, userRole);
                throw new UnauthorizedAccessException("Bạn không có quyền cập nhật trạng thái cho đơn hàng này.");
            }

            // Logic chuyển đổi trạng thái
            // Chỉ có thể chuyển đổi trạng thái đã giao -> Yêu cầu trả hàng/ hoàn tiền
            if (order.Status == "Đã giao" && !(statusUpdateDto.NewStatus == "Yêu cầu trả hàng/ hoàn tiền"))
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại cho OrderID {OrderId}: Không thể thay đổi trạng thái từ 'Đã giao' thành '{NewStatus}'.", orderId, statusUpdateDto.NewStatus);
                throw new InvalidOperationException($"Không thể thay đổi trạng thái từ '{order.Status}' thành '{statusUpdateDto.NewStatus}'.");
            }
            // Không thể chuyển đổi trạng thái đã hủy
            if (order.Status == "Đã hủy") // Không thể thay đổi khi đã hủy
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại cho OrderID {OrderId}: Đơn hàng đã bị hủy.", orderId);
                throw new InvalidOperationException("Đơn hàng đã bị hủy và không thể thay đổi trạng thái.");
            }
            // Chỉ có thể chuyển từ Yêu cầu trả hàng/ hoàn tiền -> Đã hoàn tiền 
            // Đơn hàng không được quá 3 ngày
            if (order.Status == "Yêu cầu trả hàng/ hoàn tiền" && (DateTime.UtcNow - order.OrderDate).TotalDays > 3)
            if (!(statusUpdateDto.NewStatus == "Đã hoàn tiền"))
            {
                _logger.LogWarning("Cập nhật trạng thái thất bại cho OrderID {OrderId}: Đơn hàng đang yêu cầu trả hàng/ hoàn tiền.", orderId);
                throw new InvalidOperationException("Đơn hàng đang yêu cầu trả hàng/ hoàn tiền.");
            }


            // Xử lý hoàn trả số lượng sản phẩm nếu đơn hàng bị hủy từ trạng thái chưa xử lý
            if ((statusUpdateDto.NewStatus.Equals("Đã hủy", StringComparison.OrdinalIgnoreCase) && (order.Status.Equals("Chờ xác nhận", StringComparison.OrdinalIgnoreCase) || order.Status.Equals("Đang xử lý", StringComparison.OrdinalIgnoreCase)))
                || (statusUpdateDto.NewStatus.Equals("Đã hoàn tiền", StringComparison.OrdinalIgnoreCase) && order.Status.Equals("Yêu cầu trả hàng/ hoàn tiền", StringComparison.OrdinalIgnoreCase))
                )
            {
                foreach (var detail in order.OrderDetails)
                {
                    if (detail.Product != null)
                    {
                        detail.Product.StockQuantity += detail.Quantity;
                        _context.Products.Update(detail.Product);
                        _logger.LogInformation("Hoàn trả {Quantity} cho sản phẩm ProductID {ProductId} từ đơn hàng hủy OrderID {OrderId}.", detail.Quantity, detail.ProductID, orderId);
                    }
                }
            }

            order.Status = statusUpdateDto.NewStatus;
            if (order.Status == "Đã giao") order.OrderDate = DateTime.UtcNow;

            _context.Orders.Update(order);
            int affectedRows = await _context.SaveChangesAsync();

            if (affectedRows > 0)
            {
                _logger.LogInformation("Cập nhật trạng thái thành công cho OrderID {OrderId} thành {NewStatus}.", orderId, statusUpdateDto.NewStatus);
                return true;
            }
            else
            {
                _logger.LogWarning("Cập nhật trạng thái cho OrderID {OrderId}: SaveChanges không ảnh hưởng đến dòng nào (có thể trạng thái không đổi).", orderId);
                return false; // Không có gì được cập nhật (có thể trạng thái đã là NewStatus)
            }
        }
    }
}
