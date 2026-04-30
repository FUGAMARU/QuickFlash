use base64::{engine::general_purpose::STANDARD, Engine};
use id3::Tag;

pub(super) async fn read_by_url(artwork_url: &str) -> Result<(String, Vec<u8>), String> {
    let response = reqwest::get(artwork_url)
        .await
        .map_err(|e| format!("アートワーク画像の取得に失敗しました: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "アートワーク画像の取得に失敗しました: status={}",
            response.status()
        ));
    }

    let response_content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|content_type| content_type.to_string());
    let artwork_data = response
        .bytes()
        .await
        .map_err(|e| format!("アートワーク画像の読み込みに失敗しました: {}", e))?
        .to_vec();

    if artwork_data.is_empty() {
        return Err("アートワーク画像の内容が空でした".to_string());
    }

    let mime_type = response_content_type
        .and_then(|raw_content_type| {
            raw_content_type
                .split(';')
                .next()
                .map(str::trim)
                .filter(|content_type| !content_type.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_else(|| detect_image_mime_type(&artwork_data).to_string());

    Ok((mime_type, artwork_data))
}

pub(super) fn read_audio_file_artwork_data_url(file_path: &str) -> Option<String> {
    let tag = Tag::read_from_path(file_path).ok()?;
    let picture = tag.pictures().next()?;

    if picture.data.is_empty() {
        return None;
    }

    let mime_type = if picture.mime_type.trim().is_empty() {
        detect_image_mime_type(&picture.data).to_string()
    } else {
        picture.mime_type.clone()
    };
    let image_data_base64 = STANDARD.encode(&picture.data);

    Some(format!("data:{};base64,{}", mime_type, image_data_base64))
}

fn detect_image_mime_type(image_data: &[u8]) -> &'static str {
    if image_data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return "image/png";
    }

    if image_data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return "image/jpeg";
    }

    if image_data.starts_with(b"GIF87a") || image_data.starts_with(b"GIF89a") {
        return "image/gif";
    }

    if image_data.len() >= 12 && image_data.starts_with(b"RIFF") && &image_data[8..12] == b"WEBP" {
        return "image/webp";
    }

    if image_data.starts_with(&[0x42, 0x4D]) {
        return "image/bmp";
    }

    "image/jpeg"
}

#[cfg(test)]
mod tests {
    use super::detect_image_mime_type;

    #[test]
    fn detects_common_image_mime_types() {
        assert_eq!(
            detect_image_mime_type(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            "image/png"
        );
        assert_eq!(detect_image_mime_type(&[0xFF, 0xD8, 0xFF]), "image/jpeg");
        assert_eq!(detect_image_mime_type(b"GIF89a"), "image/gif");
        assert_eq!(detect_image_mime_type(b"RIFFxxxxWEBP"), "image/webp");
        assert_eq!(detect_image_mime_type(&[0x42, 0x4D]), "image/bmp");
    }
}
