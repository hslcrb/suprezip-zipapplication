mod extractor;
mod encoding_util;

use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
async fn extract_files(app: AppHandle, zip_path: String, target_dir: String) -> Result<(), String> {
    let zip_p = PathBuf::from(zip_path);
    let target_p = PathBuf::from(target_dir);
    
    let handler = extractor::get_handler(&zip_p)
        .map_err(|e| e.to_string())?;
        
    handler.extract(&zip_p, &target_p, Some(&app))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_archive_files(zip_path: String) -> Result<Vec<String>, String> {
    let zip_p = PathBuf::from(zip_path);
    
    let handler = extractor::get_handler(&zip_p)
        .map_err(|e| e.to_string())?;
        
    handler.list_files(&zip_p)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn compress_files(src_dir: String, zip_path: String) -> Result<(), String> {
    let src_p = PathBuf::from(src_dir);
    let zip_p = PathBuf::from(zip_path);
    
    // For now, compression is still Zip-only as per the plan
    let handler = extractor::zip::ZipExtractor;
    use extractor::Extractor;
    // Note: We need a compress method in the trait if we want universal compression, 
    // but the plan focuses on extraction for All formats.
    // For Zip compression, we'll keep using the zip crate logic.
    // Wait, let's just use our zip_handler logic refactored.
    // Actually, I'll just use the zip crate directly for now.
    
    // Ported compress logic
    let file = std::fs::File::create(&zip_p).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let walk = walkdir::WalkDir::new(&src_p);
    for entry in walk.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(&src_p).map_err(|e| e.to_string())?;

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options).map_err(|e| e.to_string())?;
            let mut f = std::fs::File::open(path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            extract_files,
            list_archive_files,
            compress_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
