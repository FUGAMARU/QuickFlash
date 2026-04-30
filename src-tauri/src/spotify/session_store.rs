use super::state::{AppState, SpotifyAuthSession};
use std::fs;

pub(super) fn write_persisted_auth_session(
    state: &AppState,
    auth_session: &SpotifyAuthSession,
) -> Result<(), String> {
    let file_path = match state.auth_session_file_path() {
        Some(path) => path,
        None => return Ok(()),
    };

    if let Some(parent_directory) = file_path.parent() {
        fs::create_dir_all(parent_directory).map_err(|e| {
            format!(
                "認証セッション保存先ディレクトリの作成に失敗しました: {}",
                e
            )
        })?;
    }

    let serialized_session = serde_json::to_string(auth_session)
        .map_err(|e| format!("認証セッションのシリアライズに失敗しました: {}", e))?;

    fs::write(&file_path, serialized_session)
        .map_err(|e| format!("認証セッションの保存に失敗しました: {}", e))?;

    Ok(())
}

pub(super) fn read_persisted_auth_session(
    state: &AppState,
) -> Result<Option<SpotifyAuthSession>, String> {
    let file_path = match state.auth_session_file_path() {
        Some(path) => path,
        None => return Ok(None),
    };

    if !file_path.exists() {
        return Ok(None);
    }

    let serialized_session = fs::read_to_string(&file_path)
        .map_err(|e| format!("認証セッションの読み込みに失敗しました: {}", e))?;

    if serialized_session.trim().is_empty() {
        return Ok(None);
    }

    let auth_session = serde_json::from_str::<SpotifyAuthSession>(&serialized_session)
        .map_err(|e| format!("認証セッションの解析に失敗しました: {}", e))?;

    Ok(Some(auth_session))
}

pub(super) fn remove_persisted_auth_session(state: &AppState) -> Result<(), String> {
    let file_path = match state.auth_session_file_path() {
        Some(path) => path,
        None => return Ok(()),
    };

    if !file_path.exists() {
        return Ok(());
    }

    fs::remove_file(&file_path).map_err(|e| format!("認証セッションの削除に失敗しました: {}", e))
}
