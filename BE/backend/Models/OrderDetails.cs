namespace backend.Models
{
    public partial class OrderDetails
    {
        public int OrderDetailId { get; set; }
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }

        public virtual Orders Order { get; set; } = default!;
        public virtual Products Product { get; set; } = default!;
    }
}