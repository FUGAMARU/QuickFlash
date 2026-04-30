use std::fs::read;

pub(crate) fn read_file_bytes(file_path: &str) -> Result<Vec<u8>, String> {
    read(file_path).map_err(|e| format!("ファイルの読み込みに失敗しました: {}", e))
}
