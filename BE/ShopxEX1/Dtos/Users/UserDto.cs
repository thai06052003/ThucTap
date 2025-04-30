namespace ShopxEX1.Dtos.Users
{
    // Output: Hiển thị thông tin user (sau login, xem profile)
    public class UserDto
    {
        public int UserID { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
        public DateTime? CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime? Birthday { get; set; } // Thêm
        public bool? Gender { get; set; } // Thêm
    }
}
