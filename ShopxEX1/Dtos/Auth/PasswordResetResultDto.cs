namespace ShopxEX1.Dtos.Auth
{
    // Output: Kết quả yêu cầu/thực hiện reset (thông báo đơn giản)
    public class PasswordResetResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
