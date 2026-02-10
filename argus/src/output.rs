use colored::Colorize;
use serde::Serialize;

/// Print a success message
pub fn success(msg: &str) {
    println!("{} {}", "✓".green(), msg);
}

/// Print an error message
pub fn error(msg: &str) {
    println!("{} {}", "✗".red(), msg);
}

/// Print an info message
pub fn info(msg: &str) {
    println!("{} {}", "→".blue(), msg);
}

/// Print data as JSON or human-readable format
pub fn print_result<T: Serialize + std::fmt::Display>(data: &T, json: bool) {
    if json {
        match serde_json::to_string_pretty(data) {
            Ok(json_str) => println!("{}", json_str),
            Err(e) => error(&format!("Failed to serialize to JSON: {}", e)),
        }
    } else {
        println!("{}", data);
    }
}

/// Truncate a hex string for display
pub fn truncate_hex(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...{}", &s[..max_len/2], &s[s.len()-max_len/2..])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_hex_short_unchanged() {
        let short = "0x1234";
        assert_eq!(truncate_hex(short, 20), "0x1234");
    }

    #[test]
    fn test_truncate_hex_exact_length_unchanged() {
        let exact = "0x12345678901234567890";
        assert_eq!(truncate_hex(exact, 22), exact);
    }

    #[test]
    fn test_truncate_hex_long_truncated() {
        let long = "0x1234567890abcdef1234567890abcdef";
        let truncated = truncate_hex(long, 20);

        assert!(truncated.contains("..."));
        assert!(truncated.len() < long.len());
        assert!(truncated.starts_with("0x12345678"));
        assert!(truncated.ends_with("90abcdef"));
    }

    #[test]
    fn test_truncate_hex_empty() {
        assert_eq!(truncate_hex("", 20), "");
    }

    #[test]
    fn test_truncate_hex_various_lengths() {
        let input = "0x1234567890abcdef1234567890abcdef12345678";

        // Should be unchanged when max_len >= input.len()
        assert_eq!(truncate_hex(input, 50), input);

        // Should be truncated when max_len < input.len()
        let truncated = truncate_hex(input, 16);
        assert!(truncated.contains("..."));
        assert_eq!(truncated.len(), 8 + 3 + 8); // first_half + "..." + last_half
    }

    #[derive(serde::Serialize)]
    struct TestData {
        value: i32,
        name: String,
    }

    impl std::fmt::Display for TestData {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}: {}", self.name, self.value)
        }
    }

    #[test]
    fn test_serializable_to_json() {
        let data = TestData {
            value: 42,
            name: "test".to_string(),
        };

        let json = serde_json::to_string_pretty(&data).expect("should serialize");
        assert!(json.contains("\"value\": 42"));
        assert!(json.contains("\"name\": \"test\""));
    }

    #[test]
    fn test_display_format() {
        let data = TestData {
            value: 42,
            name: "test".to_string(),
        };

        assert_eq!(format!("{}", data), "test: 42");
    }
}
