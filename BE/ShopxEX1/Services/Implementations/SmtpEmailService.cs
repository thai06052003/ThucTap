using System.Net.Mail;
using System.Net;

namespace ShopxEX1.Services.Implementations
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUser;
        private readonly string _smtpPass;
        private readonly string _senderEmail;
        private readonly string _senderName;
        private readonly bool _enableSsl;

        public SmtpEmailService(IConfiguration configuration)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));

            // Đọc cấu hình SMTP từ appsettings.json
            _smtpHost = _configuration["EmailSettings:SmtpHost"] ?? throw new ArgumentNullException("EmailSettings:SmtpHost not configured.");
            _smtpPort = _configuration.GetValue<int>("EmailSettings:SmtpPort");
            _smtpUser = _configuration["EmailSettings:SmtpUser"] ?? throw new ArgumentNullException("EmailSettings:SmtpUser not configured.");
            _smtpPass = _configuration["EmailSettings:SmtpPass"] ?? throw new ArgumentNullException("EmailSettings:SmtpPass not configured."); // Lưu mật khẩu an toàn hơn trong production (Secrets Manager, Key Vault)
            _senderEmail = _configuration["EmailSettings:SenderEmail"] ?? throw new ArgumentNullException("EmailSettings:SenderEmail not configured.");
            _senderName = _configuration["EmailSettings:SenderName"] ?? _senderEmail; // Tên hiển thị người gửi
            _enableSsl = _configuration.GetValue<bool>("EmailSettings:EnableSsl");

            if (_smtpPort == 0) throw new ArgumentNullException("EmailSettings:SmtpPort not configured or invalid.");

        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            try
            {
                using (var client = new SmtpClient(_smtpHost, _smtpPort))
                {
                    client.EnableSsl = _enableSsl; // Bật SSL/TLS nếu server yêu cầu (ví dụ: Gmail port 587)
                    client.Credentials = new NetworkCredential(_smtpUser, _smtpPass);
                    client.DeliveryMethod = SmtpDeliveryMethod.Network;
                    client.Timeout = 20000; // Tăng timeout nếu cần (milliseconds)

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(_senderEmail, _senderName),
                        Subject = subject,
                        Body = htmlMessage,
                        IsBodyHtml = true, // Đánh dấu nội dung là HTML
                    };
                    mailMessage.To.Add(toEmail);

                    Console.WriteLine($"Attempting to send email to {toEmail} via {_smtpHost}:{_smtpPort}"); // Log cơ bản
                    await client.SendMailAsync(mailMessage);
                    Console.WriteLine($"Email sent successfully to {toEmail}."); // Log thành công
                }
            }
            catch (SmtpException smtpEx)
            {
                // Log lỗi chi tiết SMTP
                Console.WriteLine($"SmtpException sending email to {toEmail}: {smtpEx.StatusCode} - {smtpEx.Message}");
                // Ném lại exception để lớp gọi biết có lỗi
                throw new Exception($"Không thể gửi email (SMTP Error: {smtpEx.StatusCode}). Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", smtpEx);
            }
            catch (Exception ex)
            {
                // Log lỗi chung khác
                Console.WriteLine($"Error sending email to {toEmail}: {ex.Message}");
                throw new Exception("Đã xảy ra lỗi không mong muốn khi gửi email.", ex);
            }
        }
    }
}
