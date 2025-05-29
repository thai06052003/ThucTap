using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Services.Interfaces;
using ShopxEX1.Dtos.Sellers;
using Microsoft.Extensions.Logging;

namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SellerPublicController : ControllerBase
    {
        private readonly ISellerPublicService _sellerPublicService;
        private readonly ILogger<SellerPublicController> _logger;

        public SellerPublicController(
            ISellerPublicService sellerPublicService,
            ILogger<SellerPublicController> logger)
        {
            _sellerPublicService = sellerPublicService;
            _logger = logger;
        }

        /// <summary>
        /// 🔥 GET SELLER PUBLIC PROFILE
        /// GET /api/SellerPublic/{sellerId}/profile
        /// </summary>
        [HttpGet("{sellerId}/profile")]
        public async Task<IActionResult> GetSellerProfile(int sellerId)
        {
            try
            {
                _logger.LogInformation("API: Getting public profile for seller {SellerId}", sellerId);

                if (sellerId <= 0)
                {
                    return BadRequest(new { message = "Invalid seller ID" });
                }

                var sellerProfile = await _sellerPublicService.GetSellerPublicProfileAsync(sellerId);

                if (sellerProfile == null)
                {
                    return NotFound(new { message = "Seller not found or inactive" });
                }

                _logger.LogInformation("API: Successfully retrieved profile for seller {SellerId}", sellerId);
                return Ok(sellerProfile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API: Error getting seller profile for {SellerId}", sellerId);
                return StatusCode(500, new { 
                    message = "Internal server error", 
                    error = ex.Message 
                });
            }
        }

        /// <summary>
        /// 🔥 GET SELLER PRODUCTS WITH FILTERS & PAGINATION
        /// GET /api/SellerPublic/{sellerId}/products?page=1&pageSize=12&search=&categoryId=&sortBy=newest&minPrice=&maxPrice=
        /// </summary>
        [HttpGet("{sellerId}/products")]
        public async Task<IActionResult> GetSellerProducts(
            int sellerId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12,
            [FromQuery] string? search = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string? sortBy = "newest",
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null)
        {
            try
            {
                _logger.LogInformation("API: Getting products for seller {SellerId}, page {Page}, filters: search='{Search}', category={CategoryId}, sort={SortBy}", 
                    sellerId, page, search, categoryId, sortBy);

                if (sellerId <= 0)
                {
                    return BadRequest(new { message = "Invalid seller ID" });
                }

                // Check if seller exists and is active
                var isSellerActive = await _sellerPublicService.IsSellerActiveAsync(sellerId);
                if (!isSellerActive)
                {
                    return NotFound(new { message = "Seller not found or inactive" });
                }

                var result = await _sellerPublicService.GetSellerProductsAsync(
                    sellerId, page, pageSize, search, categoryId, sortBy, minPrice, maxPrice);

                var response = new
                {
                    products = result.Items,
                    pagination = new
                    {
                        currentPage = result.PageNumber,
                        pageSize = result.PageSize,
                        totalCount = result.TotalCount,
                        totalPages = result.TotalPages,
                        hasNextPage = result.HasNextPage,
                        hasPreviousPage = result.HasPreviousPage
                    },
                    filters = new
                    {
                        search = search,
                        categoryId = categoryId,
                        sortBy = sortBy,
                        minPrice = minPrice,
                        maxPrice = maxPrice
                    },
                    sellerId = sellerId
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API: Error getting products for seller {SellerId}", sellerId);
                return StatusCode(500, new { 
                    message = "Internal server error", 
                    error = ex.Message 
                });
            }
        }

        /// <summary>
        /// 🔥 GET SELLER PUBLIC STATISTICS
        /// GET /api/SellerPublic/{sellerId}/stats
        /// </summary>
        [HttpGet("{sellerId}/stats")]
        public async Task<IActionResult> GetSellerStats(int sellerId)
        {
            try
            {
                _logger.LogInformation("API: Getting public stats for seller {SellerId}", sellerId);

                if (sellerId <= 0)
                {
                    return BadRequest(new { message = "Invalid seller ID" });
                }

                var stats = await _sellerPublicService.GetSellerPublicStatsAsync(sellerId);

                _logger.LogInformation("API: Successfully retrieved stats for seller {SellerId}", sellerId);
                return Ok(stats);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("API: {Message}", ex.Message);
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API: Error getting stats for seller {SellerId}", sellerId);
                return StatusCode(500, new { 
                    message = "Internal server error", 
                    error = ex.Message 
                });
            }
        }

        /// <summary>
        /// 🔥 GET SELLER CATEGORIES
        /// GET /api/SellerPublic/{sellerId}/categories
        /// </summary>
        [HttpGet("{sellerId}/categories")]
        public async Task<IActionResult> GetSellerCategories(int sellerId)
        {
            try
            {
                _logger.LogInformation("API: Getting categories for seller {SellerId}", sellerId);

                if (sellerId <= 0)
                {
                    return BadRequest(new { message = "Invalid seller ID" });
                }

                var categories = await _sellerPublicService.GetSellerCategoriesAsync(sellerId);

                var response = new
                {
                    sellerId = sellerId,
                    categories = categories,
                    totalCategories = categories.Count,
                    totalProducts = categories.Sum(c => c.ProductCount)
                };

                _logger.LogInformation("API: Retrieved {Count} categories for seller {SellerId}", categories.Count, sellerId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API: Error getting categories for seller {SellerId}", sellerId);
                return StatusCode(500, new { 
                    message = "Internal server error", 
                    error = ex.Message 
                });
            }
        }

        /// <summary>
        /// 🔥 CHECK SELLER STATUS
        /// GET /api/SellerPublic/{sellerId}/status
        /// </summary>
        [HttpGet("{sellerId}/status")]
        public async Task<IActionResult> CheckSellerStatus(int sellerId)
        {
            try
            {
                if (sellerId <= 0)
                {
                    return BadRequest(new { message = "Invalid seller ID" });
                }

                var isActive = await _sellerPublicService.IsSellerActiveAsync(sellerId);

                return Ok(new
                {
                    sellerId = sellerId,
                    isActive = isActive,
                    status = isActive ? "active" : "inactive"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API: Error checking status for seller {SellerId}", sellerId);
                return StatusCode(500, new { 
                    message = "Internal server error", 
                    error = ex.Message 
                });
            }
        }
    }
}