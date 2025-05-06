namespace ShopxEX1.Models
{
    public class Seller
    {
        public int SellerID { get; set; }
        public string? ShopName { get; set; }
        public int UserID { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public virtual User? User { get; set; }
        public virtual ICollection<SellerCategory> Categories { get; set; } = new List<SellerCategory>();
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
