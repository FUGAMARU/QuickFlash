mod pkce;

use id3::{Tag, TagLike};
use pkce::{start_server, AppState};

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
