mod pkce;

use id3::{Tag, TagLike};
use pkce::{start_server, AppState};
use serde::Serialize;
use std::{
    fs::{metadata, File},
    io::{Read, Seek, SeekFrom},
    time::Duration,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioFileMetaInfo {
    quality_text: String,
    duration_text: String,
    size_text: String,
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

    Ok(AudioFileMetaInfo {
        quality_text: format!(
            "{}kbps / {}",
            frame_header_info.bitrate_kbps,
            format_sample_rate_khz(frame_header_info.sample_rate_hz)
        ),
        duration_text: format_duration(duration),
        size_text: format_file_size(file_size),
    })
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
            read_mp3_title,
            pkce::start_spotify_auth,
            pkce::get_access_token
        ])
        .setup(move |_app| {
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
