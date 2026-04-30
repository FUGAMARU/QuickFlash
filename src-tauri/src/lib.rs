mod app;
mod audio;
mod commands;
mod file_system;
mod spotify;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run()
}
