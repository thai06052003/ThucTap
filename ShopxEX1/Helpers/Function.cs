using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ShopxEX1.Helpers
{
    public static class Function
    {
        private static readonly Regex EmojiRegex = new Regex(
            @"(\p{Cs}|" +                          // Surrogate pair (emoji chuẩn)
            @"[\u203C-\u3299]|" +                  // Các biểu tượng thông thường
            @"[\uD83C-\uDBFF\uDC00-\uDFFF]+|" +    // Emoji nằm trong các block D83C - DFFF
            @"[\u2600-\u27BF])",                   // Biểu tượng mặt trời, thời tiết, ký hiệu...
            RegexOptions.Compiled
        );
        public static string PasswordHash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        public static bool IsEmoji(string input)
        {
            if (string.IsNullOrEmpty(input))
                return false;

            return EmojiRegex.IsMatch(input);
        }
    }
}
