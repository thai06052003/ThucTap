using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Sellers
{
    // Input: Seller gửi dữ liệu Seller lên để cập nhật thông tin cửa hàng
    public class SellerUpdateDto
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? ShopName { get; set; }
        public string? StoreDescription { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        public string? BusinessLicense { get; set; }

        // Các trường như UserID, ApprovalStatus, ApprovedAt, IsActive, CreatedAt
        // KHÔNG được phép cập nhật thông qua DTO này.
    }
}
