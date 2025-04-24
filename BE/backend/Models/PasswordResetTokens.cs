using System;

namespace backend.Models
{
    public partial class PasswordResetTokens
    {
        public int TokenId { get; set; }
        public int UserId { get; set; }
        public string? Token { get; set; }
        public DateTime ExpiryDate { get; set; }
        public bool IsUsed { get; set; }

        public virtual Users User { get; set; }
    }
}