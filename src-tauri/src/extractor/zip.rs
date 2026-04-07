use std::fs;
use std::io;
use std::path::Path;
use zip::ZipArchive;
use anyhow::Result;
use tauri::{AppHandle, Emitter};
use crate::encoding_util;
use super::{Extractor, ProgressEvent};

pub struct ZipExtractor;

impl Extractor for ZipExtractor {
    fn extract(&self, zip_path: &Path, target_dir: &Path, emitter: Option<&AppHandle>) -> Result<()> {
        let file = fs::File::open(zip_path)?;
        let mut archive = ZipArchive::new(file)?;
        let total_files = archive.len();

        for i in 0..total_files {
            let mut file = archive.by_index(i)?;
            
            let raw_name = file.name_raw();
            let decoded_name = encoding_util::decode_filename(raw_name);
            let outpath = target_dir.join(&decoded_name);

            if (*file.name()).ends_with('/') {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = fs::File::create(&outpath)?;
                io::copy(&mut file, &mut outfile)?;
            }

            // Emit progress event
            if let Some(handle) = emitter {
                let _ = handle.emit("extract-progress", ProgressEvent {
                    file_name: decoded_name,
                    progress: (i + 1) as f32 / total_files as f32,
                    current_file: i + 1,
                    total_files,
                });
            }
        }

        Ok(())
    }

    fn list_files(&self, zip_path: &Path) -> Result<Vec<String>> {
        let file = fs::File::open(zip_path)?;
        let mut archive = ZipArchive::new(file)?;
        let mut files = Vec::new();

        for i in 0..archive.len() {
            let file = archive.by_index(i)?;
            let raw_name = file.name_raw();
            files.push(encoding_util::decode_filename(raw_name));
        }

        Ok(files)
    }
}
