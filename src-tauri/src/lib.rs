mod zip_handler;
mod encoding_util;

use std::path::PathBuf;

#[tauri::command]
async fn extract_files(zip_path: String, target_dir: String) -> Result<(), String> {
    let zip_p = PathBuf::from(zip_path);
    let target_p = PathBuf::from(target_dir);
    
    zip_handler::extract_archive(&zip_p, &target_p)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn compress_files(src_dir: String, zip_path: String) -> Result<(), String> {
    let src_p = PathBuf::from(src_dir);
    let zip_p = PathBuf::from(zip_path);
    
    zip_handler::compress_folder(&src_p, &zip_p)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            extract_files,
            compress_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
