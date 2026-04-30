use crate::{commands, spotify};
use std::fs::create_dir_all;
use tauri::Manager;

pub fn run() {
    let state = spotify::AppState::new();
    let state_for_setup = state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::read_audio_file_meta_info,
            commands::write_audio_file_tag_info,
            commands::read_mp3_title,
            commands::read_file_bytes,
            commands::start_spotify_auth,
            commands::get_auth_session,
            commands::refresh_spotify_access_token,
            commands::clear_auth_session
        ])
        .setup(move |app| {
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                if create_dir_all(&app_data_dir).is_ok() {
                    state_for_setup
                        .set_auth_session_file_path(app_data_dir.join("spotify_auth_session.json"));
                }
            }

            let state_for_server = state_for_setup.clone();
            tauri::async_runtime::spawn(async move {
                spotify::start_server(state_for_server).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauriアプリケーションの実行中にエラーが発生しました");
}
