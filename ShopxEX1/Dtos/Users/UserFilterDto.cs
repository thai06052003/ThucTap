namespace ShopxEX1.Dtos.Users
{
    // Tham số để lọc danh sách người dùng (Admin view)
    public class UserFilterDto
    {
        public bool? IsActive { get; set; } // Lọc theo trạng thái hoạt động
        public string? SearchTerm { get; set; } // Tìm kiếm theo Email, FullName, Phone?
        // Có thể thêm các bộ lọc khác như ngày tạo,...
    }
}
