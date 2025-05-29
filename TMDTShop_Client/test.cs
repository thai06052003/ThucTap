// Services/Implementations/OrderService.cs
public async Task<List<OrderDto>> CreateOrderFromCartAsync(int userId, OrderCreateDto createDto)
{
    _logger.LogInformation("UserID {UserId}: Bắt đầu tạo đơn hàng. CartItemIDs: {SelectedCount}, DiscountCode: '{DiscountCode}'",
        userId, createDto.SelectedCartItemIds?.Count ?? 0, createDto.DiscountCode);

    // ... (phần kiểm tra user và lấy selectedCartItemsFromDb giữ nguyên) ...
    // Đoạn lấy selectedCartItemsFromDb bằng Dapper đã có

    var itemsGroupedBySeller = selectedCartItemsFromDb
        .Where(ci => ci.Product != null && ci.Product.Seller != null)
        .GroupBy(ci => ci.Product!.SellerID)
        .ToList();

    if (!itemsGroupedBySeller.Any()) { /* ... */ }

    var createdOrdersDtoList = new List<OrderDto>();
    List<Order> tempNewOrders = new List<Order>(); // Lưu các Order mới để map sau transaction

    await using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Discount? globalAppliedDiscountEntity = null; // Entity để cập nhật RemainingBudget
        decimal actualDiscountAmountForEntireOrder = 0m; // Tổng số tiền giảm cho tất cả các đơn con

        if (!string.IsNullOrWhiteSpace(createDto.DiscountCode))
        {
            // **Lấy Discount Entity để có thể cập nhật (không dùng AsNoTracking())**
            globalAppliedDiscountEntity = await _context.Discounts
                .FirstOrDefaultAsync(d => d.DiscountCode.ToUpper() == createDto.DiscountCode.ToUpper());

            if (globalAppliedDiscountEntity == null)
            {
                throw new InvalidOperationException($"Mã giảm giá '{createDto.DiscountCode}' không tồn tại.");
            }
            var now = DateTime.UtcNow;
            if (!globalAppliedDiscountEntity.IsActive || now < globalAppliedDiscountEntity.StartDate || now > globalAppliedDiscountEntity.EndDate)
            {
                throw new InvalidOperationException($"Mã giảm giá '{createDto.DiscountCode}' không hợp lệ hoặc đã hết hạn.");
            }
            if (globalAppliedDiscountEntity.RemainingBudget <= 0)
            {
                throw new InvalidOperationException($"Mã giảm giá '{createDto.DiscountCode}' đã hết ngân sách.");
            }
        }

        // Tính tổng giá trị của tất cả các sản phẩm được chọn từ tất cả các shop (TRƯỚC KHI ÁP DỤNG MÃ GIẢM GIÁ CHUNG)
        // để tính toán số tiền giảm giá tối đa cho toàn bộ các đơn hàng con.
        decimal grandTotalAmountForAllSelectedItems = 0m;
        foreach (var sellerGroup in itemsGroupedBySeller)
        {
            foreach (var cartItemDapper in sellerGroup)
            {
                // Dùng giá từ Product đã join trong Dapper query là chính xác nhất tại thời điểm này
                grandTotalAmountForAllSelectedItems += (cartItemDapper.Product?.Product_Price ?? 0) * cartItemDapper.Quantity;
            }
        }


        if (globalAppliedDiscountEntity != null)
        {
            decimal potentialDiscountAmount = (grandTotalAmountForAllSelectedItems * globalAppliedDiscountEntity.DiscountPercent) / 100;
            actualDiscountAmountForEntireOrder = Math.Min(potentialDiscountAmount, globalAppliedDiscountEntity.MaxDiscountPercent > 0 ? globalAppliedDiscountEntity.MaxDiscountPercent : potentialDiscountAmount ); // Nếu MaxDiscountPercent <= 0 thì không giới hạn

            if (globalAppliedDiscountEntity.RemainingBudget < actualDiscountAmountForEntireOrder)
            {
                throw new InvalidOperationException($"Ngân sách còn lại của mã giảm giá '{createDto.DiscountCode}' không đủ cho đơn hàng này. Cần {actualDiscountAmountForEntireOrder:N0}đ, còn lại {globalAppliedDiscountEntity.RemainingBudget:N0}đ.");
            }
            // Sẽ trừ RemainingBudget sau khi tất cả các đơn hàng con đã được xác nhận
        }


        foreach (var sellerGroup in itemsGroupedBySeller)
        {
            var sellerIdOfGroup = sellerGroup.Key;
            var cartItemsForThisSeller = sellerGroup.ToList();
            decimal subTotalAmountForSellerOrder = 0;
            var orderDetailsForThisSellerOrder = new List<OrderDetail>();

            foreach (var cartItemDapper in cartItemsForThisSeller)
            {
                var productEntity = await _context.Products.FindAsync(cartItemDapper.ProductID);
                if (productEntity == null) { throw new KeyNotFoundException($"Sản phẩm ID {cartItemDapper.ProductID} không tìm thấy."); }
                if (productEntity.StockQuantity < cartItemDapper.Quantity)
                {
                    throw new InvalidOperationException($"Sản phẩm '{productEntity.ProductName}' của shop '{cartItemDapper.Product?.Seller?.ShopName ?? "Không rõ"}' không đủ hàng.");
                }

                var orderDetail = new OrderDetail
                {
                    ProductID = productEntity.ProductID,
                    Quantity = cartItemDapper.Quantity,
                    UnitPrice = productEntity.Price
                };
                orderDetailsForThisSellerOrder.Add(orderDetail);
                subTotalAmountForSellerOrder += orderDetail.Quantity * orderDetail.UnitPrice;

                productEntity.StockQuantity -= cartItemDapper.Quantity;
                _context.Products.Update(productEntity);
            }

            decimal discountAmountForThisSellerOrder = 0m;
            if (globalAppliedDiscountEntity != null && grandTotalAmountForAllSelectedItems > 0)
            {
                // Phân bổ số tiền giảm giá cho đơn hàng con này dựa trên tỷ lệ giá trị của nó so với tổng giá trị
                decimal proportion = subTotalAmountForSellerOrder / grandTotalAmountForAllSelectedItems;
                discountAmountForThisSellerOrder = Math.Round(actualDiscountAmountForEntireOrder * proportion, 0); // Làm tròn đến đồng
            }
            
            decimal finalPaymentForSellerOrder = subTotalAmountForSellerOrder - discountAmountForThisSellerOrder;
            if (finalPaymentForSellerOrder < 0) finalPaymentForSellerOrder = 0; // Đảm bảo không âm


            var newOrder = new Order
            {
                UserID = userId,
                OrderDate = DateTime.UtcNow,
                TotalAmount = subTotalAmountForSellerOrder, // Tổng tiền gốc của các sản phẩm trong đơn này
                TotalPayment = finalPaymentForSellerOrder,   // Số tiền thực tế khách trả sau khi trừ phần giảm giá đã phân bổ
                Status = "Chờ xác nhận",
                ShippingAddress = createDto.ShippingAddress,
                DiscountCode = globalAppliedDiscountEntity?.DiscountCode,
                DiscountID = globalAppliedDiscountEntity?.DiscountID,
                OrderDetails = orderDetailsForThisSellerOrder
            };
            _context.Orders.Add(newOrder);
            tempNewOrders.Add(newOrder);
        }

        // Sau khi tất cả các đơn hàng con đã được chuẩn bị và không có lỗi
        if (globalAppliedDiscountEntity != null && actualDiscountAmountForEntireOrder > 0)
        {
            globalAppliedDiscountEntity.RemainingBudget -= (int)Math.Ceiling(actualDiscountAmountForEntireOrder); // Làm tròn lên và trừ đi
            if (globalAppliedDiscountEntity.RemainingBudget < 0) globalAppliedDiscountEntity.RemainingBudget = 0; // Đảm bảo không âm
            _context.Discounts.Update(globalAppliedDiscountEntity);
            _logger.LogInformation("UserID {UserId}: Cập nhật RemainingBudget cho DiscountID {DiscountId} thành {RemainingBudget} sau khi áp dụng {ActualDiscount}đ.",
                userId, globalAppliedDiscountEntity.DiscountID, globalAppliedDiscountEntity.RemainingBudget, actualDiscountAmountForEntireOrder);
        }

        await _context.SaveChangesAsync(); // Lưu tất cả thay đổi (Orders, OrderDetails, Products stock, Discounts RemainingBudget)

        // Load navigation properties và map
        foreach (var orderEntity in tempNewOrders)
        {
           // ... (phần load navigation properties giữ nguyên) ...
             await _context.Entry(orderEntity).Reference(o => o.User).LoadAsync();
            await _context.Entry(orderEntity).Collection(o => o.OrderDetails).LoadAsync();
            foreach (var detail in orderEntity.OrderDetails)
            {
                await _context.Entry(detail).Reference(d => d.Product).LoadAsync();
                if (detail.Product != null)
                {
                    await _context.Entry(detail.Product).Reference(p => p.Seller).LoadAsync();
                    await _context.Entry(detail.Product).Reference(p => p.Category).LoadAsync(); // Thêm load Category
                }
            }
            if (orderEntity.DiscountID.HasValue)
            {
                await _context.Entry(orderEntity).Reference(o => o.Discount).LoadAsync();
            }
            createdOrdersDtoList.Add(_mapper.Map<OrderDto>(orderEntity));
        }


        var cartItemIdsToRemove = selectedCartItemsFromDb.Select(ci => ci.CartItemID).ToList();
        if (cartItemIdsToRemove.Any())
        {
            // Xóa CartItems bằng Dapper hoặc EF Core sau khi commit transaction thành công
            // (Nếu dùng EF Core, phải làm trong transaction)
             var itemsToRemove = await _context.CartItems.Where(ci => cartItemIdsToRemove.Contains(ci.CartItemID)).ToListAsync();
            if(itemsToRemove.Any()) {
                _context.CartItems.RemoveRange(itemsToRemove);
                await _context.SaveChangesAsync(); // Lưu thay đổi xóa cart items
                 _logger.LogInformation("UserID {UserId}: Đã xóa {Count} CartItemIDs sau khi tạo đơn hàng.", userId, cartItemIdsToRemove.Count);
            }
        }

        await transaction.CommitAsync();
        _logger.LogInformation("UserID {UserId}: Tạo thành công {OrderCount} đơn hàng từ giỏ hàng.", userId, createdOrdersDtoList.Count);
        return createdOrdersDtoList;
    }
    catch (DbUpdateConcurrencyException ex) // Xử lý lỗi tương tranh cụ thể
    {
        await transaction.RollbackAsync();
        _logger.LogError(ex, "UserID {UserId}: Lỗi tương tranh khi tạo đơn hàng. Có thể stock hoặc budget của discount đã thay đổi.", userId);
        // Tìm entity gây lỗi (có thể phức tạp)
        var entry = ex.Entries.FirstOrDefault();
        if (entry != null && entry.Entity is Product product)
        {
            throw new InvalidOperationException($"Không thể hoàn tất đơn hàng. Số lượng tồn kho của sản phẩm '{product.ProductName}' đã thay đổi. Vui lòng thử lại.");
        }
        if (entry != null && entry.Entity is Discount discount)
        {
             throw new InvalidOperationException($"Không thể hoàn tất đơn hàng. Ngân sách của mã giảm giá '{discount.DiscountCode}' đã thay đổi. Vui lòng thử lại.");
        }
        throw new InvalidOperationException("Không thể hoàn tất đơn hàng do dữ liệu đã thay đổi. Vui lòng thử lại.");
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        _logger.LogError(ex, "UserID {UserId}: Lỗi nghiêm trọng khi tạo đơn hàng.", userId);
        throw; // Ném lại để controller xử lý
    }
}