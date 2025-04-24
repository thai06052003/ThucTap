using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Carts
    {
        public Carts()
        {
            CartItems = new HashSet<CartItems>();
        }

        public int CartId { get; set; }
        public int UserId { get; set; }
        public DateTime CreatedAt { get; set; }

        public virtual Users User { get; set; }
        public virtual ICollection<CartItems> CartItems { get; set; }
    }
}