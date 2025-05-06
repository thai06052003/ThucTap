using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using ShopxEX1.Models;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using ShopxEX1.Data;
using System.Security.Claims;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/products")]
    [ApiController]
    [Authorize(Roles = "Seller,Admin")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly string _imageFolder = "uploads/products";
        private readonly IProductService _productService;

        public ProductController(AppDbContext context, IWebHostEnvironment environment, IProductService productService)
        {
            _context = context;
            _environment = environment;
            _productService = productService;
        }

        // GET: api/Product
        [HttpGet]
        public async Task<IActionResult> GetProducts([FromQuery] int? categoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var query = _context.Products
                    .Include(p => p.Category)
                    .Include(p => p.Seller)
                    .AsQueryable();

                var sellerIdClaim = User.FindFirst("UserId")?.Value;
                var isAdmin = User.IsInRole("Admin");
                if (!isAdmin && !string.IsNullOrEmpty(sellerIdClaim))
                {
                    int sellerId = int.Parse(sellerIdClaim);
                    query = query.Where(p => p.SellerID == sellerId);
                }

                if (categoryId.HasValue)
                {
                    query = query.Where(p => p.CategoryID == categoryId.Value);
                }

                var totalProducts = await query.CountAsync();
                var totalPages = (int)Math.Ceiling(totalProducts / (double)pageSize);

                var products = await query
                    .OrderByDescending(p => p.ProductID)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new
                    {
                        productID = p.ProductID,
                        productName = p.ProductName,
                        description = p.Description,
                        price = p.Price,
                        stockQuantity = p.StockQuantity,
                        imageURL = p.ImageURL,
                        isActive = p.IsActive,
                        categoryName = p.Category != null ? p.Category.CategoryName : null,
                        sellerStoreName = p.Seller != null ? p.Seller.ShopName : null
                    })
                    .ToListAsync();

                return Ok(new { products, totalPages });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi khi lấy danh sách sản phẩm: " + ex.Message);
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách sản phẩm: " + ex.Message });
            }
        }

        // GET: api/Product/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDto>> GetProduct(int id)
        {
            try
            {
                var sellerIdClaim = User.FindFirst("UserId")?.Value;
                var isAdmin = User.IsInRole("Admin");

                var product = await _context.Products
                    .Include(p => p.Category)
                    .FirstOrDefaultAsync(p => p.ProductID == id);

                if (product == null)
                {
                    return NotFound(new { message = "Không tìm thấy sản phẩm." });
                }

                if (!isAdmin)
                {
                    if (string.IsNullOrEmpty(sellerIdClaim))
                    {
                        return Forbid();
                    }

                    if (!int.TryParse(sellerIdClaim, out int sellerId))
                    {
                        return BadRequest(new { message = "ID người bán không hợp lệ." });
                    }

                    if (product.SellerID != sellerId)
                    {
                        return Forbid();
                    }
                }

                var productDto = new ProductDto
                {
                    ProductID = product.ProductID,
                    ProductName = product.ProductName,
                    Description = product.Description,
                    Price = product.Price,
                    StockQuantity = product.StockQuantity,
                    ImageURL = product.ImageURL,
                    CategoryName = product.Category?.CategoryName,
                    SellerCategoryID = product.SellerCategoryID,
                    IsActive = product.IsActive
                };

                return productDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi lấy sản phẩm ID {id}: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Lỗi hệ thống khi lấy thông tin sản phẩm: " + ex.Message });
            }
        }

        // POST: api/Product
        [HttpPost]
        public async Task<ActionResult<ProductDto>> CreateProduct([FromForm] ProductCreateDto productDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var sellerIdClaim = User.FindFirst("UserId")?.Value;
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && !string.IsNullOrEmpty(sellerIdClaim))
            {
                int sellerId = int.Parse(sellerIdClaim);
                var category = await _context.Categories.FindAsync(productDto.CategoryID);
                
                if (category == null)
                {
                    return BadRequest("Danh mục không tồn tại");
                }

                var product = new Product
                {
                    ProductName = productDto.ProductName,
                    CategoryID = productDto.CategoryID,
                    SellerCategoryID = productDto.SellerCategoryID,
                    Price = productDto.Price,
                    StockQuantity = productDto.StockQuantity,
                    Description = productDto.Description,
                    SellerID = sellerId,
                    IsActive = productDto.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                if (productDto.Image != null)
                {
                    var uploadPath = Path.Combine(_environment.WebRootPath, _imageFolder);
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }

                    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(productDto.Image.FileName)}";
                    var filePath = Path.Combine(uploadPath, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await productDto.Image.CopyToAsync(stream);
                    }

                    product.ImageURL = $"/{_imageFolder}/{fileName}";
                }

                _context.Products.Add(product);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetProduct), new { id = product.ProductID }, 
                    new ProductDto
                    {
                        ProductID = product.ProductID,
                        ProductName = product.ProductName,
                        Description = product.Description,
                        Price = product.Price,
                        StockQuantity = product.StockQuantity,
                        ImageURL = product.ImageURL,
                        CategoryName = category.CategoryName,
                        SellerCategoryID = product.SellerCategoryID
                    });
            }

            return Forbid();
        }

        // PUT: api/Product/{id}
        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<ApiResponse>> UpdateProduct(int id, [FromBody] ProductUpdateDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse { Success = false, Message = "Dữ liệu không hợp lệ" });
            }

            var sellerIdClaim = User.FindFirst("UserId")?.Value;
            if (string.IsNullOrEmpty(sellerIdClaim) || !int.TryParse(sellerIdClaim, out int sellerId))
            {
                return Unauthorized(new ApiResponse { Success = false, Message = "Không thể xác định người bán" });
            }

            var result = await _productService.UpdateProductAsync(id, sellerId, updateDto);
            return Ok(result);
        }

        // DELETE: api/Product/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var sellerIdClaim = User.FindFirst("UserId")?.Value;
            var isAdmin = User.IsInRole("Admin");

            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound("Không tìm thấy sản phẩm.");
            }

            if (!isAdmin)
            {
                if (string.IsNullOrEmpty(sellerIdClaim))
                    return Forbid();
                var sellerId = int.Parse(sellerIdClaim);
                if (product.SellerID != sellerId)
                    return Forbid();
            }

            // Delete product image if exists
            if (!string.IsNullOrEmpty(product.ImageURL))
            {
                var imagePath = Path.Combine(_environment.WebRootPath, product.ImageURL.TrimStart('/'));
                if (System.IO.File.Exists(imagePath))
                {
                    System.IO.File.Delete(imagePath);
                }
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.ProductID == id);
        }
    }
} 