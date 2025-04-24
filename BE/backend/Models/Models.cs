using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class RegisterModel
    {
        [Required]
        public string FullName { get; set; } = default!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        [Phone]
        public string Phone { get; set; } = default!;

        public string? Address { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 8)]
        public string Password { get; set; } = default!;

        [Compare("Password")]
        public string ConfirmPassword { get; set; } = default!;
    }

    public class LoginModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        public string Password { get; set; } = default!;
    }

    public class SocialLoginModel
    {
        [Required]
        public string Provider { get; set; } = default!;

        [Required]
        public string UserId { get; set; } = default!;

        public string? Email { get; set; }
    }

    public class ManualEmailModel
    {
        [Required]
        public string Provider { get; set; } = default!;

        [Required]
        public string UserId { get; set; } = default!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;
    }

    public class ForgotPasswordModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;
    }

    public class ResetPasswordModel
    {
        [Required]
        public string Token { get; set; } = default!;

        [Required]
        [StringLength(100, MinimumLength = 8)]
        public string NewPassword { get; set; } = default!;

        [Compare("NewPassword")]
        public string ConfirmNewPassword { get; set; } = default!;
    }
}