using System;

namespace backend.Models
{
    public partial class CartItems
    {
        
        public int CartItemId { get; set; }
        public int CartId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public DateTime AddedAt { get; set; }

        public required Carts Cart { get; set; }
        public required Products Product { get; set; }
    }
}