use super::artwork;
use id3::{
    frame::{Content, Frame, Picture, PictureType},
    Tag, TagLike,
};
use serde::Deserialize;

#[derive(Default)]
pub(super) struct AudioFileTagInfo {
    pub title_text: String,
    pub artist_text: String,
    pub album_text: String,
    pub genre_text: String,
    pub release_text: String,
    pub track_number_text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioFileTagWriteInfo {
    title: String,
    artist: String,
    album: String,
    genre: String,
    release: String,
    track_number: String,
    artwork_url: Option<String>,
}

pub(super) fn read_mp3_title(file_path: &str) -> Result<String, String> {
    match Tag::read_from_path(file_path) {
        Ok(tag) => {
            let title = tag.title().unwrap_or("(タイトルなし)");
            Ok(title.to_string())
        }
        Err(e) => Err(format!("MP3ファイルの読み取りに失敗しました: {}", e)),
    }
}

pub(super) fn read_audio_file_tag_info(file_path: &str) -> AudioFileTagInfo {
    let Some(tag) = Tag::read_from_path(file_path).ok() else {
        return AudioFileTagInfo::default();
    };

    AudioFileTagInfo {
        title_text: tag.title().unwrap_or_default().to_string(),
        artist_text: tag.artist().unwrap_or_default().to_string(),
        album_text: tag.album().unwrap_or_default().to_string(),
        genre_text: tag.genre().unwrap_or_default().to_string(),
        release_text: read_text_frame(&tag, "TDRC")
            .or_else(|| tag.year().map(|year| year.to_string()))
            .unwrap_or_default(),
        track_number_text: read_text_frame(&tag, "TRCK")
            .or_else(|| tag.track().map(|track_number| track_number.to_string()))
            .unwrap_or_default(),
    }
}

pub(super) async fn write_audio_file_tag_info(
    file_path: &str,
    tag_info: AudioFileTagWriteInfo,
) -> Result<(), String> {
    let mut tag = Tag::read_from_path(file_path).unwrap_or_else(|_| Tag::new());

    set_text_frame(&mut tag, "TIT2", &tag_info.title);
    set_text_frame(&mut tag, "TPE1", &tag_info.artist);
    set_text_frame(&mut tag, "TALB", &tag_info.album);
    set_text_frame(&mut tag, "TCON", &tag_info.genre);
    set_text_frame(&mut tag, "TDRC", &tag_info.release);
    set_text_frame(&mut tag, "TRCK", &tag_info.track_number);

    if let Some(artwork_url) = tag_info.artwork_url.as_deref() {
        let normalized_artwork_url = artwork_url.trim();

        if !normalized_artwork_url.is_empty() {
            let (mime_type, artwork_data) = artwork::read_by_url(normalized_artwork_url).await?;

            set_artwork_frame(&mut tag, mime_type, artwork_data);
        }
    }

    tag.write_to_path(file_path, id3::Version::Id3v24)
        .map_err(|e| format!("音源ファイルへのタグ書き込みに失敗しました: {}", e))
}

fn read_text_frame(tag: &Tag, frame_id: &str) -> Option<String> {
    tag.get(frame_id)
        .and_then(|frame| frame.content().text())
        .map(|text| text.to_string())
}

fn set_text_frame(tag: &mut Tag, frame_id: &str, value: &str) {
    let normalized_value = value.trim();

    if normalized_value.is_empty() {
        tag.remove(frame_id);
        return;
    }

    tag.set_text(frame_id, normalized_value);
}

fn set_artwork_frame(tag: &mut Tag, mime_type: String, artwork_data: Vec<u8>) {
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
