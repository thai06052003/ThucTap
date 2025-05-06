namespace ShopxEX1.Services
{
    // Gửi email
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string htmlMessage);
    }
}
