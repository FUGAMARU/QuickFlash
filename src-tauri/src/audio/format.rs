use std::time::Duration;

pub(super) fn duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs_f64().round() as u64;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    if hours > 0 {
        return format!("{}:{:02}:{:02}", hours, minutes, seconds);
    }

    format!("{}:{:02}", minutes, seconds)
}

pub(super) fn file_size(file_size: u64) -> String {
    const KB: f64 = 1_000.0;
    const MB: f64 = 1_000_000.0;
    const GB: f64 = 1_000_000_000.0;

    let file_size_f64 = file_size as f64;

    if file_size_f64 >= GB {
        return format!("{:.1}GB", file_size_f64 / GB);
    }

    if file_size_f64 >= MB {
        return format!("{:.1}MB", file_size_f64 / MB);
    }

    if file_size_f64 >= KB {
        return format!("{:.1}KB", file_size_f64 / KB);
    }

    format!("{}B", file_size)
}

pub(super) fn sample_rate_khz(sample_rate_hz: u32) -> String {
    if sample_rate_hz.is_multiple_of(1000) {
        return format!("{}kHz", sample_rate_hz / 1000);
    }

    format!("{:.1}kHz", sample_rate_hz as f64 / 1000.0)
}

#[cfg(test)]
mod tests {
    use super::{duration, file_size, sample_rate_khz};
    use std::time::Duration;

    #[test]
    fn formats_duration_with_optional_hours() {
        assert_eq!(duration(Duration::from_secs(65)), "1:05");
        assert_eq!(duration(Duration::from_secs(3661)), "1:01:01");
    }

    #[test]
    fn formats_decimal_file_size() {
        assert_eq!(file_size(999), "999B");
        assert_eq!(file_size(1_500), "1.5KB");
        assert_eq!(file_size(1_500_000), "1.5MB");
    }

    #[test]
    fn formats_sample_rate_as_khz() {
        assert_eq!(sample_rate_khz(48_000), "48kHz");
        assert_eq!(sample_rate_khz(44_100), "44.1kHz");
    }
}
