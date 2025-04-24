using Microsoft.EntityFrameworkCore;

namespace backend.Models
{
    public partial class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public virtual DbSet<BlacklistedTokens> BlacklistedTokens { get; set; }
        public virtual DbSet<CartItems> CartItems { get; set; }
        public virtual DbSet<Carts> Carts { get; set; }
        public virtual DbSet<Categories> Categories { get; set; }
        public virtual DbSet<Discounts> Discounts { get; set; }
        public virtual DbSet<OrderDetails> OrderDetails { get; set; }
        public virtual DbSet<Orders> Orders { get; set; }
        public virtual DbSet<PasswordResetTokens> PasswordResetTokens { get; set; }
        public virtual DbSet<Products> Products { get; set; }
        public virtual DbSet<Sellers> Sellers { get; set; }
        public virtual DbSet<UserRefreshTokens> UserRefreshTokens { get; set; }
        public virtual DbSet<Users> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Cấu hình BlacklistedTokens
            modelBuilder.Entity<BlacklistedTokens>(entity =>
            {
                entity.HasKey(e => e.BlacklistId);
                entity.Property(e => e.Jti).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ExpiryDate).IsRequired();
                entity.Property(e => e.BlacklistedAt).IsRequired().HasDefaultValueSql("(getutcdate())");
                entity.HasIndex(e => e.Jti, "UQ__Blacklis__C4D08C597AE4B834").IsUnique();
                entity.HasIndex(e => e.ExpiryDate, "IX_BlacklistedTokens_ExpiryDate");
                entity.HasIndex(e => e.Jti, "IX_BlacklistedTokens_Jti").IsUnique();
            });

            // Cấu hình CartItems
            modelBuilder.Entity<CartItems>(entity =>
            {
                entity.HasKey(ci => ci.CartItemId);
                entity.Property(ci => ci.Quantity).IsRequired();
                entity.HasOne(ci => ci.Cart)
                      .WithMany()
                      .HasForeignKey(ci => ci.CartId);
                entity.HasOne(ci => ci.Product)
                      .WithMany()
                      .HasForeignKey(ci => ci.ProductId);
            });

            // Cấu hình Carts
            modelBuilder.Entity<Carts>(entity =>
            {
                entity.HasKey(c => c.CartId);
                entity.Property(c => c.CreatedAt).IsRequired().HasDefaultValueSql("(getdate())");
                entity.HasOne(c => c.User)
                      .WithMany()
                      .HasForeignKey(c => c.UserId);
            });

            // Cấu hình Categories
            modelBuilder.Entity<Categories>(entity =>
            {
                entity.HasKey(c => c.CategoryId);
                entity.Property(c => c.CategoryName).IsRequired().HasMaxLength(100);
                entity.Property(c => c.Description).HasMaxLength(255);
                entity.HasIndex(c => c.CategoryName, "UQ_Categories_CategoryName").IsUnique();
            });

            // Cấu hình Discounts
            modelBuilder.Entity<Discounts>(entity =>
            {
                entity.HasKey(d => d.DiscountId);
                entity.Property(d => d.DiscountCode).HasMaxLength(50); // Không dùng IsRequired vì DiscountCode nullable
                entity.Property(d => d.DiscountPercent).IsRequired();
                entity.Property(d => d.StartDate).IsRequired();
                entity.Property(d => d.EndDate).IsRequired();
                entity.Property(d => d.IsActive).IsRequired();
                entity.HasIndex(d => d.DiscountCode, "UQ_Discounts_DiscountCode").IsUnique();
            });

            // Cấu hình OrderDetails
            modelBuilder.Entity<OrderDetails>(entity =>
            {
                entity.HasKey(od => od.OrderDetailId);
                entity.Property(od => od.Quantity).IsRequired();
                entity.Property(od => od.UnitPrice).IsRequired();
                entity.HasOne(od => od.Order)
                      .WithMany()
                      .HasForeignKey(od => od.OrderId);
                entity.HasOne(od => od.Product)
                      .WithMany()
                      .HasForeignKey(od => od.ProductId);
            });

            // Cấu hình Orders
            modelBuilder.Entity<Orders>(entity =>
            {
                entity.HasKey(o => o.OrderId);
                entity.Property(o => o.OrderDate).IsRequired().HasDefaultValueSql("(getdate())");
                entity.Property(o => o.Status).IsRequired().HasMaxLength(50);
                entity.Property(o => o.ShippingAddress).IsRequired().HasMaxLength(255);
                entity.Property(o => o.DiscountCode).HasMaxLength(50);
                entity.HasOne(o => o.User)
                      .WithMany()
                      .HasForeignKey(o => o.UserId);
            });

            // Cấu hình PasswordResetTokens
            modelBuilder.Entity<PasswordResetTokens>(entity =>
            {
                entity.HasKey(prt => prt.TokenId);
                entity.Property(prt => prt.Token).IsRequired().HasMaxLength(255);
                entity.Property(prt => prt.ExpiryDate).IsRequired();
                entity.Property(prt => prt.IsUsed).IsRequired().HasDefaultValue(false);
                entity.HasOne(prt => prt.User)
                      .WithMany()
                      .HasForeignKey(prt => prt.UserId);
            });

            // Cấu hình Products
            modelBuilder.Entity<Products>(entity =>
            {
                entity.HasKey(p => p.ProductId);
                entity.Property(p => p.ProductName).IsRequired().HasMaxLength(100);
                entity.Property(p => p.Price).IsRequired();
                entity.Property(p => p.StockQuantity).IsRequired();
                entity.Property(p => p.Description).HasMaxLength(500);
                entity.HasOne(p => p.Category)
                      .WithMany()
                      .HasForeignKey(p => p.CategoryId);
                entity.HasOne(p => p.Seller)
                      .WithMany(s => s.Products) // Cấu hình quan hệ với Sellers
                      .HasForeignKey(p => p.SellerId);
            });

            // Cấu hình Sellers
            modelBuilder.Entity<Sellers>(entity =>
            {
                entity.HasKey(s => s.SellerId);
                entity.Property(s => s.ShopName).IsRequired().HasMaxLength(100);
                entity.Property(s => s.CreatedAt).IsRequired().HasDefaultValueSql("(getdate())");
                entity.Property(s => s.IsActive).IsRequired().HasDefaultValue(true);
                entity.HasOne(s => s.User)
                      .WithMany()
                      .HasForeignKey(s => s.UserId);
            });

            // Cấu hình UserRefreshTokens
            modelBuilder.Entity<UserRefreshTokens>(entity =>
            {
                entity.HasKey(urt => urt.RefreshTokenId);
                entity.Property(urt => urt.Token).IsRequired().HasMaxLength(255);
                entity.Property(urt => urt.ExpiryDate).IsRequired();
                entity.Property(urt => urt.CreatedAt).IsRequired().HasDefaultValueSql("(getdate())");
                entity.Property(urt => urt.IsRevoked).IsRequired().HasDefaultValue(false);
                entity.Property(urt => urt.RevokedAt);
                entity.HasOne(urt => urt.User)
                      .WithMany()
                      .HasForeignKey(urt => urt.UserId);
                entity.HasIndex(urt => urt.Token, "UQ_UserRefreshTokens_Token").IsUnique();
            });

            // Cấu hình Users
            modelBuilder.Entity<Users>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PasswordHash).HasMaxLength(256);
                entity.Property(e => e.FullName).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.Address).HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("(getdate())");
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.Role).HasMaxLength(50).HasDefaultValue("Customer");
                entity.Property(e => e.Avatar).HasMaxLength(255);
                entity.Property(e => e.SocialProvider).HasMaxLength(50);
                entity.Property(e => e.SocialId).HasMaxLength(100);
                entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();
            });
        }
    }
}