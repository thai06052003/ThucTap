namespace backend.Models
{
    public partial class Categories
    {
        public Categories()
        {
            Products = new HashSet<Products>();
        }

        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = default!; // Bắt buộc trong DB
        public string? Description { get; set; } // Có thể null

        public virtual ICollection<Products> Products { get; set; }
    }
}