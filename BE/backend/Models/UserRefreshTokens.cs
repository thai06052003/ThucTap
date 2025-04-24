using System;

namespace backend.Models
{
    public partial class UserRefreshTokens
    {
        public int RefreshTokenId { get; set; }
        public int UserId { get; set; }
        public string Token { get; set; } = default!; // Bắt buộc trong DB
        public DateTime ExpiryDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime? RevokedAt { get; set; }

        public virtual Users User { get; set; } = default!;
    }
}