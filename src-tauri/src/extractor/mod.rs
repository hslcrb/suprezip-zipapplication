use std::path::Path;
use anyhow::Result;
use serde::Serialize;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub file_name: String,
    pub progress: f32, // 0.0 to 1.0
    pub current_file: usize,
    pub total_files: usize,
}

pub trait Extractor: Send + Sync {
    fn extract(&self, zip_path: &Path, target_dir: &Path, emitter: Option<&tauri::AppHandle>) -> Result<()>;
    fn list_files(&self, zip_path: &Path) -> Result<Vec<String>>;
}

pub mod zip;
pub mod sevenzip;
pub mod iso;
pub mod squashfs;

pub fn get_handler(path: &Path) -> Result<Box<dyn Extractor>> {
    let ext = path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "zip" => Ok(Box::new(zip::ZipExtractor)),
        "7z" | "rar" => Ok(Box::new(sevenzip::SevenZipExtractor)),
        "iso" => Ok(Box::new(iso::IsoExtractor)),
        "appimage" => Ok(Box::new(squashfs::SquashFsExtractor)),
        _ => Err(anyhow::anyhow!("지원하지 않는 형식입니다: .{}", ext)),
    }
}
