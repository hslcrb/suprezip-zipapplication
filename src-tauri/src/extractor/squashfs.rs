use std::fs;
use std::path::Path;
use anyhow::Result;
use tauri::{AppHandle, Emitter};
use backhand::FilesystemReader;
use super::{Extractor, ProgressEvent};

pub struct SquashFsExtractor;

impl Extractor for SquashFsExtractor {
    fn extract(&self, zip_path: &Path, target_dir: &Path, emitter: Option<&AppHandle>) -> Result<()> {
        let file = fs::File::open(zip_path)?;
        let fs = FilesystemReader::from_reader(file)?;
        
        let total_files = fs.files().count();
        let mut current_file = 0;

        for entry in fs.files() {
            current_file += 1;
            
            let name = entry.path.to_string_lossy().to_string();
            let out_path = target_dir.join(&name);

            // Emit progress event
            if let Some(handle) = emitter {
                let _ = handle.emit("extract-progress", ProgressEvent {
                    file_name: name.clone(),
                    progress: current_file as f32 / total_files as f32,
                    current_file,
                    total_files,
                });
            }

            if entry.is_dir() {
                fs::create_dir_all(&out_path)?;
            } else if entry.is_file() {
                if let Some(p) = out_path.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut reader = entry.reader();
                let mut writer = fs::File::create(&out_path)?;
                std::io::copy(&mut reader, &mut writer)?;
            }
        }

        Ok(())
    }

    fn list_files(&self, zip_path: &Path) -> Result<Vec<String>> {
        let file = fs::File::open(zip_path)?;
        let fs = FilesystemReader::from_reader(file)?;
        let files = fs.files()
            .map(|f| f.path.to_string_lossy().to_string())
            .collect();
        Ok(files)
    }
}
