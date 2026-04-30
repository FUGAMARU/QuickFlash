use crate::{audio, file_system, spotify};

#[tauri::command]
pub(crate) fn read_mp3_title(file_path: String) -> Result<String, String> {
    audio::read_mp3_title(&file_path)
}

#[tauri::command]
pub(crate) fn read_audio_file_meta_info(
    file_path: String,
) -> Result<audio::AudioFileMetaInfo, String> {
    audio::read_audio_file_meta_info(&file_path)
}

#[tauri::command]
pub(crate) async fn write_audio_file_tag_info(
    file_path: String,
    tag_info: audio::AudioFileTagWriteInfo,
) -> Result<(), String> {
    audio::write_audio_file_tag_info(&file_path, tag_info).await
}

#[tauri::command]
pub(crate) fn read_file_bytes(file_path: String) -> Result<Vec<u8>, String> {
    file_system::read_file_bytes(&file_path)
}

#[tauri::command]
pub(crate) async fn start_spotify_auth(
    client_id: String,
    state: tauri::State<'_, spotify::AppState>,
) -> Result<spotify::AuthData, String> {
    spotify::start_spotify_auth(client_id, state.inner()).await
}

#[tauri::command]
pub(crate) async fn get_auth_session(
    state: tauri::State<'_, spotify::AppState>,
) -> Result<Option<spotify::SpotifyAuthSession>, String> {
    spotify::get_auth_session(state.inner()).await
}

#[tauri::command]
pub(crate) async fn refresh_spotify_access_token(
    refresh_token: String,
    client_id: String,
    state: tauri::State<'_, spotify::AppState>,
) -> Result<spotify::SpotifyAuthSession, String> {
    spotify::refresh_spotify_access_token(refresh_token, client_id, state.inner()).await
}

#[tauri::command]
pub(crate) async fn clear_auth_session(
    state: tauri::State<'_, spotify::AppState>,
) -> Result<(), String> {
    spotify::clear_auth_session(state.inner()).await
}
