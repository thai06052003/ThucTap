using System;

namespace backend.Models
{
    public partial class BlacklistedTokens
    {
        public int BlacklistId { get; set; }
        public string? Jti { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime BlacklistedAt { get; set; }
    }
}