use std::path::Path;
use anyhow::Result;
use tauri::{AppHandle, Emitter};
use sevenz_rust::{decompress_file_with_extract_fn, FileEntry};
use super::{Extractor, ProgressEvent};

pub struct SevenZipExtractor;

impl Extractor for SevenZipExtractor {
    fn extract(&self, zip_path: &Path, target_dir: &Path, emitter: Option<&AppHandle>) -> Result<()> {
        let mut total_files = 0;
        let mut current_file = 0;

        // Try to pre-calculate total files for progress reporting
        let archive = sevenz_rust::SevenZReader::from_path(zip_path, &[])?;
        total_files = archive.db().files.len();

        let target = target_dir.to_path_buf();
        let emitter_clone = emitter.map(|h| h.clone());

        decompress_file_with_extract_fn(zip_path, target, |entry, reader, path| {
            current_file += 1;
            
            // Emit progress event
            if let Some(handle) = &emitter_clone {
                let _ = handle.emit("extract-progress", ProgressEvent {
                    file_name: entry.name().to_string(),
                    progress: current_file as f32 / total_files as f32,
                    current_file,
                    total_files,
                });
            }

            sevenz_rust::default_extraction_function(entry, reader, path)
        })?;

        Ok(())
    }

    fn list_files(&self, zip_path: &Path) -> Result<Vec<String>> {
        let archive = sevenz_rust::SevenZReader::from_path(zip_path, &[])?;
        let files = archive.db().files.iter()
            .map(|f| f.name().to_string())
            .collect();
        Ok(files)
    }
}
