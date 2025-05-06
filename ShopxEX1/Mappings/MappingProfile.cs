using AutoMapper;
using ShopxEX1.Models;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Dtos.Sellers;
using ShopxEX1.Dtos.Categories;
using ShopxEX1.Dtos.Carts;
using ShopxEX1.Dtos.Orders;
using ShopxEX1.Dtos.Discounts;
using ShopxEX1.Dtos.SellerCategory;
namespace ShopxEX1.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // === User & Auth Mappings ===
            CreateMap<User, UserDto>();
            CreateMap<User, UserSummaryDto>(); // Cần tạo DTO này
            CreateMap<RegisterDto, User>() /* ... cấu hình ignore đầy đủ như trước ... */;
            CreateMap<UserCreateDto, User>() /* ... cấu hình ignore đầy đủ như trước ... */; // Cần tạo DTO này
            CreateMap<UserProfileUpdateDto, User>() /* ... cấu hình ignore đầy đủ như trước ... */;
            CreateMap<AdminUserUpdateDto, User>() /* ... cấu hình ignore đầy đủ và map thêm Role, IsActive ... */; // Cần tạo DTO này
                                                                                                                   // Ánh xạ từ thông tin Social Login sang User mới
            CreateMap<SocialLoginRequestDto, User>()
            .ForMember(dest => dest.UserID, opt => opt.Ignore())
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
            .ForMember(dest => dest.SocialProvider, opt => opt.MapFrom(src => src.Provider))
            .ForMember(dest => dest.SocialID, opt => opt.MapFrom(src => src.UserId))
            // Gán giá trị mặc định hoặc null cho các trường không có trong DTO
            .ForMember(dest => dest.FullName, opt => opt.Ignore()) // Hoặc MapFrom(src => null)
            .ForMember(dest => dest.Avatar, opt => opt.Ignore())   // Hoặc MapFrom(src => null)
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore()) // Xử lý trong service
            .ForMember(dest => dest.Phone, opt => opt.Ignore())
            .ForMember(dest => dest.Address, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore()) // Gán trong service
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) // Gán trong service
            .ForMember(dest => dest.IsActive, opt => opt.Ignore()) // Gán trong service
            .ForMember(dest => dest.Birthday, opt => opt.Ignore()) // Bỏ qua các trường mới khác
            .ForMember(dest => dest.Gender, opt => opt.Ignore())
            // Ignore hết các navigation properties
            .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
            .ForMember(dest => dest.Carts, opt => opt.Ignore())
            .ForMember(dest => dest.Orders, opt => opt.Ignore());

            // === Seller Mappings ===
            CreateMap<Seller, SellerProfileDto>()
                 .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : null))
                 .ForMember(dest => dest.UserFullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : null))
                 .ForMember(dest => dest.UserPhone, opt => opt.MapFrom(src => src.User != null ? src.User.Phone : null))
                 .ForMember(dest => dest.UserAddress, opt => opt.MapFrom(src => src.User != null ? src.User.Address : null));
            CreateMap<Seller, SellerRequestDto>();
            CreateMap<SellerUpdateDto, Seller>()
                .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            // === SellerCategory Mappings ===
            CreateMap<SellerCategory, SellerCategoryDto>()
                .ForMember(dest => dest.SellerShopName, // Thuộc tính đích trong DTO
                           opt => opt.MapFrom(src => src.Seller != null ? src.Seller.ShopName : string.Empty));

            CreateMap<SellerCategory, SellerCategorySummaryDto>();

            CreateMap<SellerCategoryCreateDto, SellerCategory>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) // Ví dụ bỏ qua CreatedAt nếu set ở chỗ khác
                .ForMember(dest => dest.SellerID, opt => opt.Ignore()) // Bỏ qua vì sẽ set ở Controller/Service
                .ForMember(dest => dest.Seller, opt => opt.Ignore()) // Bỏ qua navigation property
                .ForMember(dest => dest.Products, opt => opt.Ignore()); // Bỏ qua collection

            CreateMap<SellerCategoryUpdateDto, SellerCategory>()
                .ForMember(dest => dest.SellerCategoryID, opt => opt.Ignore())
                .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Seller, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());


            // === Category Mappings ===
            CreateMap<Category, CategoryDto>();
            CreateMap<CategoryCreateDto, Category>()
                 .ForMember(dest => dest.CategoryID, opt => opt.Ignore())
                 .ForMember(dest => dest.Products, opt => opt.Ignore());
            CreateMap<CategoryUpdateDto, Category>()
                 .ForMember(dest => dest.CategoryID, opt => opt.Ignore())
                 .ForMember(dest => dest.Products, opt => opt.Ignore());

            // === Product Mappings ===
            CreateMap<Product, ProductDto>()
                 .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : null))
                 .ForMember(dest => dest.SellerStoreName, opt => opt.MapFrom(src => src.Seller != null ? src.Seller.ShopName : null));

            CreateMap<Product, ProductSummaryDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : null));

            CreateMap<ProductCreateDto, Product>()
                 /* ... cấu hình ignore đầy đủ như trước, bao gồm TẤT CẢ nav props ... */
                 .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                 .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                 .ForMember(dest => dest.SellerID, opt => opt.Ignore()) // Sẽ gán trong service
                 .ForMember(dest => dest.Category, opt => opt.Ignore())
                 .ForMember(dest => dest.Seller, opt => opt.Ignore())
                 .ForMember(dest => dest.CartItems, opt => opt.Ignore())
                 .ForMember(dest => dest.OrderDetails, opt => opt.Ignore());

            CreateMap<ProductUpdateDto, Product>()
                 /* ... cấu hình ignore đầy đủ như trước, bao gồm TẤT CẢ nav props ... */
                 .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                 .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                 .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                 .ForMember(dest => dest.Category, opt => opt.Ignore())
                 .ForMember(dest => dest.Seller, opt => opt.Ignore())
                 .ForMember(dest => dest.CartItems, opt => opt.Ignore())
                 .ForMember(dest => dest.OrderDetails, opt => opt.Ignore());


            // === Cart & CartItem Mappings ===
            CreateMap<CartItem, CartItemDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : null))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Product != null ? src.Product.Price : 0))
                .ForMember(dest => dest.ImageURL, opt => opt.MapFrom(src => src.Product != null ? src.Product.ImageURL : null))
                .ForMember(dest => dest.AvailableStock, opt => opt.MapFrom(src => src.Product != null ? src.Product.StockQuantity : 0));
            CreateMap<Cart, CartDto>()
                .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => src.CartItems != null ? src.CartItems.Sum(ci => (ci.Product != null ? ci.Product.Price : 0) * ci.Quantity) : 0));
            CreateMap<CartItemCreateDto, CartItem>()
               /* ... cấu hình ignore đầy đủ như trước ... */
               .ForMember(dest => dest.CartItemID, opt => opt.Ignore())
               .ForMember(dest => dest.CartID, opt => opt.Ignore())
               .ForMember(dest => dest.AddedAt, opt => opt.Ignore())
               .ForMember(dest => dest.Product, opt => opt.Ignore())
               .ForMember(dest => dest.Cart, opt => opt.Ignore());
            CreateMap<CartItemUpdateDto, CartItem>()
                /* ... cấu hình ignore đầy đủ như trước ... */
                .ForMember(dest => dest.CartItemID, opt => opt.Ignore())
                .ForMember(dest => dest.CartID, opt => opt.Ignore())
                .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                .ForMember(dest => dest.AddedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Product, opt => opt.Ignore())
                .ForMember(dest => dest.Cart, opt => opt.Ignore());

            // === Order & OrderDetail Mappings ===
            CreateMap<OrderDetail, OrderDetailDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : null))
                .ForMember(dest => dest.ProductImageURL, opt => opt.MapFrom(src => src.Product != null ? src.Product.ImageURL : null));
            CreateMap<Order, OrderDto>()
                 .ForMember(dest => dest.CustomerInfo, opt => opt.MapFrom(src => src.User)) // Map User sang UserDto
                 .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.OrderDetails)); // Map sang List<OrderDetailDto>
            CreateMap<Order, OrderSummaryDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName /* Bỏ ?? Username */ : "N/A"))
                .ForMember(dest => dest.NumberOfItems, opt => opt.MapFrom(src => src.OrderDetails != null ? src.OrderDetails.Sum(od => od.Quantity) : 0));

            // === Discount Mappings ===
            CreateMap<Discount, DiscountDto>();
            CreateMap<DiscountCreateDto, Discount>()
                .ForMember(dest => dest.DiscountID, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore());
            CreateMap<DiscountUpdateDto, Discount>()
                .ForMember(dest => dest.DiscountID, opt => opt.Ignore())
                .ForMember(dest => dest.DiscountCode, opt => opt.Ignore());
        }
    }
}