mod artwork;
mod format;
mod mp3;
mod tags;

use serde::Serialize;
use std::fs::metadata;

pub(crate) use tags::AudioFileTagWriteInfo;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioFileMetaInfo {
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

pub(crate) fn read_mp3_title(file_path: &str) -> Result<String, String> {
    tags::read_mp3_title(file_path)
}

pub(crate) fn read_audio_file_meta_info(file_path: &str) -> Result<AudioFileMetaInfo, String> {
    let file_size = metadata(file_path)
        .map_err(|e| format!("音源ファイルのサイズ取得に失敗しました: {}", e))?
        .len();
    let duration = mp3_duration::from_path(file_path)
        .map_err(|e| format!("音源ファイルの再生時間取得に失敗しました: {}", e))?;
    let frame_header_info = mp3::read_frame_header_info(file_path)?;
    let artwork_data_url = artwork::read_audio_file_artwork_data_url(file_path).unwrap_or_default();
    let tag_info = tags::read_audio_file_tag_info(file_path);

    Ok(AudioFileMetaInfo {
        artwork_data_url,
        quality_text: format!(
            "{}kbps / {}",
            frame_header_info.bitrate_kbps,
            format::sample_rate_khz(frame_header_info.sample_rate_hz)
        ),
        duration_text: format::duration(duration),
        size_text: format::file_size(file_size),
        title_text: tag_info.title_text,
        artist_text: tag_info.artist_text,
        album_text: tag_info.album_text,
        genre_text: tag_info.genre_text,
        release_text: tag_info.release_text,
        track_number_text: tag_info.track_number_text,
    })
}

pub(crate) async fn write_audio_file_tag_info(
    file_path: &str,
    tag_info: AudioFileTagWriteInfo,
) -> Result<(), String> {
    tags::write_audio_file_tag_info(file_path, tag_info).await
}
