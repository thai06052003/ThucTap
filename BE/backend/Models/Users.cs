using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Users
    {
        public Users()
        {
            Carts = new HashSet<Carts>();
            Orders = new HashSet<Orders>();
            PasswordResetTokens = new HashSet<PasswordResetTokens>();
            Sellers = new HashSet<Sellers>();
            UserRefreshTokens = new HashSet<UserRefreshTokens>();
        }

        public int UserId { get; set; }
        public string Email { get; set; } = default!; // Email là bắt buộc trong DB
        public string? PasswordHash { get; set; } // PasswordHash có thể null (đã sửa trong DB)
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public string? Role { get; set; }
        public bool? Gender { get; set; }
        public DateTime? Birthday { get; set; }
        public string? Avatar { get; set; }
        public string? SocialProvider { get; set; } // Có thể null
        public string? SocialId { get; set; } // Có thể null

        public virtual ICollection<Carts> Carts { get; set; }
        public virtual ICollection<Orders> Orders { get; set; }
        public virtual ICollection<PasswordResetTokens> PasswordResetTokens { get; set; }
        public virtual ICollection<Sellers> Sellers { get; set; }
        public virtual ICollection<UserRefreshTokens> UserRefreshTokens { get; set; }
    }
}