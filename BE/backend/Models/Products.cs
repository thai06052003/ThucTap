using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Products
    {
        public Products()
        {
            CartItems = new HashSet<CartItems>();
            OrderDetails = new HashSet<OrderDetails>();
        }

        public int ProductId { get; set; }
        public int CategoryId { get; set; }
        public int SellerId { get; set; }
        public string ProductName { get; set; } = default!; // Bắt buộc trong DB
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public string? ImageUrl { get; set; }

        public virtual Categories Category { get; set; } = default!;
        public virtual Sellers Seller { get; set; } = default!;
        public virtual ICollection<CartItems> CartItems { get; set; }
        public virtual ICollection<OrderDetails> OrderDetails { get; set; }
    }
}