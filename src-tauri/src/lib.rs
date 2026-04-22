mod pkce;

use base64::{engine::general_purpose::STANDARD, Engine};
use id3::{
    frame::{Content, Frame, Picture, PictureType},
    Tag, TagLike,
};
use pkce::{start_server, AppState};
use serde::{Deserialize, Serialize};
use std::{
    fs::{create_dir_all, metadata, read, File},
    io::{Read, Seek, SeekFrom},
    time::Duration,
};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioFileMetaInfo {
    artwork_data_url: String,
    quality_text: String,
    duration_text: String,
    size_text: String,
    title_text: String,
    artist_text: String,
    album_text: String,
    genre_text: String,
    release_text: String,
    track_number_text: String,
}

#[derive(Default)]
struct AudioFileTagInfo {
    title_text: String,
    artist_text: String,
    album_text: String,
    genre_text: String,
    release_text: String,
    track_number_text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AudioFileTagWriteInfo {
    title: String,
    artist: String,
    album: String,
    genre: String,
    release: String,
    track_number: String,
    artwork_url: Option<String>,
}

struct Mp3FrameHeaderInfo {
    bitrate_kbps: u32,
    sample_rate_hz: u32,
}

const MPEG1_LAYER3_BITRATE_KBPS: [u32; 16] = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const MPEG2_LAYER3_BITRATE_KBPS: [u32; 16] = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
const MPEG1_SAMPLE_RATE_HZ: [u32; 4] = [44_100, 48_000, 32_000, 0];
const MPEG2_SAMPLE_RATE_HZ: [u32; 4] = [22_050, 24_000, 16_000, 0];
const MPEG25_SAMPLE_RATE_HZ: [u32; 4] = [11_025, 12_000, 8_000, 0];

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_mp3_title(file_path: String) -> Result<String, String> {
    match Tag::read_from_path(&file_path) {
        Ok(tag) => {
            let title = tag.title().unwrap_or("(タイトルなし)");
            Ok(title.to_string())
        }
        Err(e) => Err(format!("MP3ファイルの読み取りに失敗しました: {}", e)),
    }
}

#[tauri::command]
fn read_audio_file_meta_info(file_path: String) -> Result<AudioFileMetaInfo, String> {
    let file_size = metadata(&file_path)
        .map_err(|e| format!("音源ファイルのサイズ取得に失敗しました: {}", e))?
        .len();
    let duration = mp3_duration::from_path(&file_path)
        .map_err(|e| format!("音源ファイルの再生時間取得に失敗しました: {}", e))?;
    let frame_header_info = read_mp3_frame_header_info(&file_path)?;
    let artwork_data_url = read_audio_file_artwork_data_url(&file_path).unwrap_or_default();
    let tag_info = read_audio_file_tag_info(&file_path);

    Ok(AudioFileMetaInfo {
        artwork_data_url,
        quality_text: format!(
            "{}kbps / {}",
            frame_header_info.bitrate_kbps,
            format_sample_rate_khz(frame_header_info.sample_rate_hz)
        ),
        duration_text: format_duration(duration),
        size_text: format_file_size(file_size),
        title_text: tag_info.title_text,
        artist_text: tag_info.artist_text,
        album_text: tag_info.album_text,
        genre_text: tag_info.genre_text,
        release_text: tag_info.release_text,
        track_number_text: tag_info.track_number_text,
    })
}

#[tauri::command]
async fn write_audio_file_tag_info(
    file_path: String,
    tag_info: AudioFileTagWriteInfo,
) -> Result<(), String> {
    let mut tag = Tag::read_from_path(&file_path).unwrap_or_else(|_| Tag::new());

    set_tag_text_frame(&mut tag, "TIT2", &tag_info.title);
    set_tag_text_frame(&mut tag, "TPE1", &tag_info.artist);
    set_tag_text_frame(&mut tag, "TALB", &tag_info.album);
    set_tag_text_frame(&mut tag, "TCON", &tag_info.genre);
    set_tag_text_frame(&mut tag, "TDRC", &tag_info.release);
    set_tag_text_frame(&mut tag, "TRCK", &tag_info.track_number);

    if let Some(artwork_url) = tag_info.artwork_url.as_deref() {
        let normalized_artwork_url = artwork_url.trim();

        if !normalized_artwork_url.is_empty() {
            let (mime_type, artwork_data) = read_artwork_by_url(normalized_artwork_url).await?;

            set_tag_artwork_frame(&mut tag, mime_type, artwork_data);
        }
    }

    tag.write_to_path(&file_path, id3::Version::Id3v24)
        .map_err(|e| format!("音源ファイルへのタグ書き込みに失敗しました: {}", e))
}

#[tauri::command]
fn read_file_bytes(file_path: String) -> Result<Vec<u8>, String> {
    read(&file_path).map_err(|e| format!("ファイルの読み込みに失敗しました: {}", e))
}

fn read_audio_file_tag_info(file_path: &str) -> AudioFileTagInfo {
    let Some(tag) = Tag::read_from_path(file_path).ok() else {
        return AudioFileTagInfo::default();
    };

    AudioFileTagInfo {
        title_text: tag.title().unwrap_or_default().to_string(),
        artist_text: tag.artist().unwrap_or_default().to_string(),
        album_text: tag.album().unwrap_or_default().to_string(),
        genre_text: tag.genre().unwrap_or_default().to_string(),
        release_text: read_tag_text_frame(&tag, "TDRC")
            .or_else(|| tag.year().map(|year| year.to_string()))
            .unwrap_or_default(),
        track_number_text: read_tag_text_frame(&tag, "TRCK")
            .or_else(|| tag.track().map(|track_number| track_number.to_string()))
            .unwrap_or_default(),
    }
}

fn read_tag_text_frame(tag: &Tag, frame_id: &str) -> Option<String> {
    tag.get(frame_id)
        .and_then(|frame| frame.content().text())
        .map(|text| text.to_string())
}

fn set_tag_text_frame(tag: &mut Tag, frame_id: &str, value: &str) {
    let normalized_value = value.trim();

    if normalized_value.is_empty() {
        tag.remove(frame_id);
        return;
    }

    tag.set_text(frame_id, normalized_value);
}

fn set_tag_artwork_frame(tag: &mut Tag, mime_type: String, artwork_data: Vec<u8>) {
    let _ = tag.remove("APIC");

    tag.add_frame(Frame::with_content(
        "APIC",
        Content::Picture(Picture {
            mime_type,
            picture_type: PictureType::CoverFront,
            description: String::new(),
            data: artwork_data,
        }),
    ));
}

async fn read_artwork_by_url(artwork_url: &str) -> Result<(String, Vec<u8>), String> {
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

    let mime_type = if let Some(raw_content_type) = response_content_type {
        let normalized_content_type = raw_content_type
            .split(';')
            .next()
            .map(str::trim)
            .unwrap_or_default();

        if normalized_content_type.is_empty() {
            detect_image_mime_type(&artwork_data).to_string()
        } else {
            normalized_content_type.to_string()
        }
    } else {
        detect_image_mime_type(&artwork_data).to_string()
    };

    Ok((mime_type, artwork_data))
}

fn read_audio_file_artwork_data_url(file_path: &str) -> Option<String> {
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

fn format_duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs_f64().round() as u64;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    if hours > 0 {
        return format!("{}:{:02}:{:02}", hours, minutes, seconds);
    }

    format!("{}:{:02}", minutes, seconds)
}

fn format_file_size(file_size: u64) -> String {
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

fn format_sample_rate_khz(sample_rate_hz: u32) -> String {
    if sample_rate_hz % 1000 == 0 {
        return format!("{}kHz", sample_rate_hz / 1000);
    }

    format!("{:.1}kHz", sample_rate_hz as f64 / 1000.0)
}

fn read_mp3_frame_header_info(file_path: &str) -> Result<Mp3FrameHeaderInfo, String> {
    let mut file = File::open(file_path)
        .map_err(|e| format!("音源ファイルの読み込みに失敗しました: {}", e))?;
    let start_offset = read_mp3_audio_start_offset(&mut file)?;

    file.seek(SeekFrom::Start(start_offset))
        .map_err(|e| format!("音源ファイルの読み込み位置変更に失敗しました: {}", e))?;

    let mut header_bytes = [0_u8; 4];

    file.read_exact(&mut header_bytes)
        .map_err(|e| format!("音源ファイルのヘッダー読み込みに失敗しました: {}", e))?;

    loop {
        let header = u32::from_be_bytes(header_bytes);

        if let Some(frame_header_info) = parse_mp3_frame_header(header) {
            return Ok(frame_header_info);
        }

        let mut next_byte = [0_u8; 1];

        if file.read_exact(&mut next_byte).is_err() {
            break;
        }

        header_bytes[0] = header_bytes[1];
        header_bytes[1] = header_bytes[2];
        header_bytes[2] = header_bytes[3];
        header_bytes[3] = next_byte[0];
    }

    Err("MP3ヘッダーの解析に失敗しました".to_string())
}

fn read_mp3_audio_start_offset(file: &mut File) -> Result<u64, String> {
    let mut id3_header = [0_u8; 10];

    file.read_exact(&mut id3_header)
        .map_err(|e| format!("ID3ヘッダーの読み込みに失敗しました: {}", e))?;

    if &id3_header[0..3] != b"ID3" {
        file.seek(SeekFrom::Start(0))
            .map_err(|e| format!("音源ファイルの読み込み位置変更に失敗しました: {}", e))?;

        return Ok(0);
    }

    let tag_size = ((id3_header[6] as u64) << 21)
        | ((id3_header[7] as u64) << 14)
        | ((id3_header[8] as u64) << 7)
        | id3_header[9] as u64;
    let footer_size = if id3_header[5] & 0b0001_0000 != 0 {
        10
    } else {
        0
    };

    Ok(10 + tag_size + footer_size)
}

fn parse_mp3_frame_header(header: u32) -> Option<Mp3FrameHeaderInfo> {
    if header & 0xFFE0_0000 != 0xFFE0_0000 {
        return None;
    }

    let version_bits = ((header >> 19) & 0b11) as u8;
    let layer_bits = ((header >> 17) & 0b11) as u8;
    let bitrate_index = ((header >> 12) & 0b1111) as usize;
    let sample_rate_index = ((header >> 10) & 0b11) as usize;

    if version_bits == 0b01
        || layer_bits != 0b01
        || bitrate_index == 0
        || bitrate_index == 0b1111
        || sample_rate_index == 0b11
    {
        return None;
    }

    let bitrate_kbps = match version_bits {
        0b11 => MPEG1_LAYER3_BITRATE_KBPS[bitrate_index],
        0b10 | 0b00 => MPEG2_LAYER3_BITRATE_KBPS[bitrate_index],
        _ => 0,
    };
    let sample_rate_hz = match version_bits {
        0b11 => MPEG1_SAMPLE_RATE_HZ[sample_rate_index],
        0b10 => MPEG2_SAMPLE_RATE_HZ[sample_rate_index],
        0b00 => MPEG25_SAMPLE_RATE_HZ[sample_rate_index],
        _ => 0,
    };

    if bitrate_kbps == 0 || sample_rate_hz == 0 {
        return None;
    }

    Some(Mp3FrameHeaderInfo {
        bitrate_kbps,
        sample_rate_hz,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::new();

    let state_clone = state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            greet,
            read_audio_file_meta_info,
            write_audio_file_tag_info,
            read_file_bytes,
            read_mp3_title,
            pkce::start_spotify_auth,
            pkce::get_auth_session,
            pkce::refresh_spotify_access_token,
            pkce::clear_auth_session
        ])
        .setup(move |app| {
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                if create_dir_all(&app_data_dir).is_ok() {
                    let auth_session_file_path = app_data_dir.join("spotify_auth_session.json");
                    *state_clone.auth_session_file_path.lock().unwrap() =
                        Some(auth_session_file_path);
                }
            }

            // PKCE用にバックグラウンドでHTTPサーバーを起動
            let state_for_server = state_clone.clone();
            tauri::async_runtime::spawn(async move {
                start_server(state_for_server).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauriアプリケーションの実行中にエラーが発生しました");
}
