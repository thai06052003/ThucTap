using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Notifications
{
    public class UpdateSellerNotificationDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        public string? Icon { get; set; }
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }
        
        [Required]
        public string TargetCustomers { get; set; } = "all";
        
        public List<int>? SpecificCustomerIds { get; set; }
        public DateTime? ScheduledAt { get; set; }
    }
}