using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Products
{
    // Input: Lọc/Tìm kiếm sản phẩm
    public class ProductFilterDto
    {
        public string? SearchTerm { get; set; } // Tìm theo tên
        public int? CategoryId { get; set; }
        public int? SellerID { get; set; } // Cần ID để liên kết
        public int? SellerCategoryID { get; set; } // Cần ID để liên kết
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? SortBy { get; set; } // "PriceAsc", "PriceDesc", "NameAsc"
    }
}
