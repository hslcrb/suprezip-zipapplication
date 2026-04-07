mod extractor;
mod encoding_util;
mod security;
mod audit;
mod os;
mod task_queue;

use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use task_queue::TaskManager;

#[tauri::command]
async fn extract_files(app: AppHandle, zip_path: String, target_dir: String) -> Result<String, String> {
    let zip_p = PathBuf::from(&zip_path);
    let target_p = PathBuf::from(&target_dir);
    
    let task_mgr = app.state::<TaskManager>();
    let task_id = task_mgr.start_task(&app, &format!("해제: {}", zip_p.file_name().unwrap_or_default().to_string_lossy()));

    audit::logger::log_action(&app, "Extract", &zip_path, Some(&target_dir), "Started");

    let handler = extractor::get_handler(&zip_p).map_err(|e| e.to_string())?;
    
    // Perform extraction in a separate thread/task for our manual progress reporting
    let app_clone = app.clone();
    let task_id_clone = task_id.clone();
    
    tokio::task::spawn_blocking(move || {
        let result = handler.extract(&zip_p, &target_p, Some(&app_clone));
        let task_mgr = app_clone.state::<TaskManager>();
        task_mgr.finish_task(&app_clone, &task_id_clone, result.is_ok());
        
        if result.is_ok() {
            audit::logger::log_action(&app_clone, "Extract", &zip_path, Some(&target_dir), "Success");
        } else {
            audit::logger::log_action(&app_clone, "Extract", &zip_path, Some(&target_dir), &format!("Failed: {:?}", result.err()));
        }
    });

    Ok(task_id)
}

#[tauri::command]
async fn verify_integrity(app: AppHandle, file_path: String) -> Result<String, String> {
    let p = PathBuf::from(&file_path);
    let sha256 = security::checksum::calculate_sha256(&p).await.map_err(|e| e.to_string())?;
    audit::logger::log_action(&app, "IntegrityCheck", &file_path, None, "Success");
    Ok(sha256)
}

#[tauri::command]
async fn toggle_shell_integration(install: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if install {
            os::windows::registry::install_context_menu().map_err(|e| e.to_string())?;
        } else {
            os::windows::registry::uninstall_context_menu().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn list_archive_files(zip_path: String) -> Result<Vec<String>, String> {
    let zip_p = PathBuf::from(zip_path);
    let handler = extractor::get_handler(&zip_p).map_err(|e| e.to_string())?;
    handler.list_files(&zip_p).map_err(|e| e.to_string())
}

#[tauri::command]
async fn compress_files(app: AppHandle, src_dir: String, zip_path: String) -> Result<String, String> {
    let src_p = PathBuf::from(&src_dir);
    let zip_p = PathBuf::from(&zip_path);
    
    let task_mgr = app.state::<TaskManager>();
    let task_id = task_mgr.start_task(&app, &format!("압축: {}", src_p.file_name().unwrap_or_default().to_string_lossy()));

    audit::logger::log_action(&app, "Compress", &src_dir, Some(&zip_path), "Started");

    let app_clone = app.clone();
    let task_id_clone = task_id.clone();
    
    tokio::task::spawn_blocking(move || {
        let result = (|| -> anyhow::Result<()> {
            let file = std::fs::File::create(&zip_p)?;
            let mut zip = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            let walk = walkdir::WalkDir::new(&src_p);
            for entry in walk.into_iter().filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = path.strip_prefix(&src_p)?;

                if path.is_file() {
                    zip.start_file(name.to_string_lossy(), options)?;
                    let mut f = std::fs::File::open(path)?;
                    std::io::copy(&mut f, &mut zip)?;
                } else if !name.as_os_str().is_empty() {
                    zip.add_directory(name.to_string_lossy(), options)?;
                }
            }
            zip.finish()?;
            Ok(())
        })();

        let task_mgr = app_clone.state::<TaskManager>();
        task_mgr.finish_task(&app_clone, &task_id_clone, result.is_ok());

        if result.is_ok() {
            audit::logger::log_action(&app_clone, "Compress", &src_dir, Some(&zip_path), "Success");
        } else {
            audit::logger::log_action(&app_clone, "Compress", &src_dir, Some(&zip_path), &format!("Failed: {:?}", result.err()));
        }
    });

    Ok(task_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(task_queue::TaskManager::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            extract_files,
            list_archive_files,
            compress_files,
            verify_integrity,
            toggle_shell_integration
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
