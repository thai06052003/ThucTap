#nullable disable

using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Sellers
    {
        public Sellers()
        {
            Products = new HashSet<Products>();
        }

        public int SellerId { get; set; }
        public int UserId { get; set; }
        public string ShopName { get; set; } = default!; // Bắt buộc trong DB
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }

        public virtual Users User { get; set; } = default!;
        public virtual ICollection<Products> Products { get; set; }
    }
}