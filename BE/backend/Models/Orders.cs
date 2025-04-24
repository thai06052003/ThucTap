using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Orders
    {
        public Orders()
        {
            OrderDetails = new HashSet<OrderDetails>();
        }

        public int OrderId { get; set; }
        public int UserId { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; }
        public string DiscountCode { get; set; }
        public string ShippingAddress { get; set; }

        public virtual Users User { get; set; }
        public virtual ICollection<OrderDetails> OrderDetails { get; set; }
    }
}