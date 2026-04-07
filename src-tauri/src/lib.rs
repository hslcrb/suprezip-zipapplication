mod extractor;
mod encoding_util;
mod security;
mod audit;
mod os;
mod task_queue;
mod utils;

use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use task_queue::TaskManager;

/// 슈프레집(Suprezip) 정식 커맨드 인터페이스
/// 
/// 모든 커맨드는 비동기(Async) 기반으로 동작하며, 
/// 비즈니스 로직과 시스템 호출을 엄격히 분리하여 안정성을 확보합니다.

#[tauri::command]
async fn extract_files(app: AppHandle, zip_path: String, target_dir: String) -> Result<String, String> {
    let zip_p = PathBuf::from(&zip_path);
    let target_p = PathBuf::from(&target_dir);
    
    let task_mgr = app.state::<TaskManager>();
    let task_id = task_mgr.start_task(&app, &format!("해제: {}", zip_p.file_name().unwrap_or_default().to_string_lossy()));

    audit::logger::log_action(&app, "Extract_Start", &zip_path, Some(&target_dir), "Started");

    let handler = extractor::get_handler(&zip_p).map_err(|e| e.to_string())?;
    let app_clone = app.clone();
    let task_id_clone = task_id.clone();
    
    let handle = tokio::spawn(async move {
        // Step 1: Pre-extraction integrity check (Optional logic could go here)
        let _ = app_clone.state::<TaskManager>().update_status(&app_clone, &task_id_clone, "데이터 정밀 해제 중...");
        
        let result = tokio::task::spawn_blocking(move || {
            handler.extract(&zip_p, &target_p, Some(&app_clone))
        }).await.map_err(|e| anyhow::anyhow!(e))?;

        let task_mgr = app_clone.state::<TaskManager>();
        task_mgr.finish_task(&app_clone, &task_id_clone, result.is_ok());
        
        if result.is_ok() {
            audit::logger::log_action(&app_clone, "Extract_Success", &zip_path, Some(&target_dir), "Success");
        } else {
            audit::logger::log_action(&app_clone, "Extract_Fail", &zip_path, Some(&target_dir), &format!("Error: {:?}", result.err()));
        }
        Ok(())
    });

    task_mgr.set_handle(&task_id, handle);
    Ok(task_id)
}

#[tauri::command]
async fn verify_integrity(app: AppHandle, file_path: String) -> Result<String, String> {
    let p = PathBuf::from(&file_path);
    audit::logger::log_action(&app, "Integrity_Start", &file_path, None, "Pending");
    
    let sha256 = security::checksum::calculate_sha256_with_progress(&app, &p).await.map_err(|e| e.to_string())?;
    
    audit::logger::log_action(&app, "Integrity_Finish", &file_path, None, "Success");
    Ok(sha256)
}

#[tauri::command]
async fn toggle_shell_integration(install: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if install {
            os::windows::registry::install_context_menu().map_err(|e| {
                format!("슈프레집: 쉘 통합 실패 - {}", e)
            })?;
        } else {
            os::windows::registry::uninstall_context_menu().map_err(|e| {
                format!("슈프레집: 쉘 제거 실패 - {}", e)
            })?;
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
async fn abort_task(app: AppHandle, task_id: String) -> Result<(), String> {
    let task_mgr = app.state::<TaskManager>();
    task_mgr.abort_task(&task_id).map_err(|e| e.to_string())?;
    audit::logger::log_action(&app, "Task_Abort", &task_id, None, "Aborted_By_User");
    Ok(())
}

#[tauri::command]
async fn compress_files(app: AppHandle, src_dir: String, zip_path: String) -> Result<String, String> {
    let src_p = PathBuf::from(&src_dir);
    let zip_p = PathBuf::from(&zip_path);
    
    let task_mgr = app.state::<TaskManager>();
    let task_id = task_mgr.start_task(&app, &format!("압축: {}", src_p.file_name().unwrap_or_default().to_string_lossy()));

    audit::logger::log_action(&app, "Compress_Start", &src_dir, Some(&zip_path), "Started");

    let app_clone = app.clone();
    let task_id_clone = task_id.clone();
    
    let handle = tokio::spawn(async move {
        let result = tokio::task::spawn_blocking(move || {
            let file = std::fs::File::create(&zip_p)?;
            let mut zip = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            let walk = walkdir::WalkDir::new(&src_p);
            for (idx, entry) in walk.into_iter().filter_map(|e| e.ok()).enumerate() {
                let path = entry.path();
                let name = path.strip_prefix(&src_p)?;

                if path.is_file() {
                    zip.start_file(name.to_string_lossy(), options)?;
                    let mut f = std::fs::File::open(path)?;
                    std::io::copy(&mut f, &mut zip)?;
                } else if !name.as_os_str().is_empty() {
                    zip.add_directory(name.to_string_lossy(), options)?;
                }
                
                // Emitting basic progress during compression (dummy estimate for now)
                if idx % 10 == 0 {
                    let _ = app_clone.emit("compress-progress", format!("Processing item {}", idx));
                }
            }
            zip.finish()?;
            Ok(())
        }).await.map_err(|e| anyhow::anyhow!(e))?;

        let task_mgr = app_clone.state::<TaskManager>();
        task_mgr.finish_task(&app_clone, &task_id_clone, result.is_ok());

        if result.is_ok() {
            audit::logger::log_action(&app_clone, "Compress_Success", &src_dir, Some(&zip_path), "Success");
        } else {
            audit::logger::log_action(&app_clone, "Compress_Fail", &src_dir, Some(&zip_path), &format!("Error: {:?}", result.err()));
        }
        Ok(())
    });

    task_mgr.set_handle(&task_id, handle);
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
            toggle_shell_integration,
            abort_task
        ])
        .run(tauri::generate_context!())
        .expect("슈프레집: 런타임 초기화 도중 치명적인 오류가 발생했습니다.");
}
