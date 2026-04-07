use std::fs;
use std::io;
use std::path::Path;
use anyhow::Result;
use tauri::{AppHandle, Emitter};
use iso9660::{ISO9660, DirectoryEntry};
use super::{Extractor, ProgressEvent};

pub struct IsoExtractor;

impl Extractor for IsoExtractor {
    fn extract(&self, zip_path: &Path, target_dir: &Path, emitter: Option<&AppHandle>) -> Result<()> {
        let file = fs::File::open(zip_path)?;
        let iso = ISO9660::new(file)?;
        
        let mut total_files = 0;
        let mut current_file = 0;

        // Traverse to count files for progress reporting
        let mut stack = vec![iso.root.clone()];
        while let Some(entry) = stack.pop() {
            total_files += 1;
            if let DirectoryEntry::Directory(dir) = entry {
                for child in dir.contents() {
                    stack.push(child);
                }
            }
        }

        // Re-traverse to extract
        let mut stack = vec![(iso.root.clone(), target_dir.to_path_buf())];
        while let Some((entry, current_out)) = stack.pop() {
            current_file += 1;
            
            let name = match &entry {
                DirectoryEntry::File(f) => f.identifier.clone(),
                DirectoryEntry::Directory(d) => d.identifier.clone(),
            };

            let out_path = current_out.join(&name);

            // Emit progress event
            if let Some(handle) = emitter {
                let _ = handle.emit("extract-progress", ProgressEvent {
                    file_name: name.clone(),
                    progress: current_file as f32 / total_files as f32,
                    current_file,
                    total_files,
                });
            }

            match entry {
                DirectoryEntry::File(f) => {
                    let mut reader = f.read();
                    let mut writer = fs::File::create(&out_path)?;
                    io::copy(&mut reader, &mut writer)?;
                }
                DirectoryEntry::Directory(d) => {
                    fs::create_dir_all(&out_path)?;
                    for child in d.contents() {
                        stack.push((child, out_path.clone()));
                    }
                }
            }
        }

        Ok(())
    }

    fn list_files(&self, zip_path: &Path) -> Result<Vec<String>> {
        let file = fs::File::open(zip_path)?;
        let iso = ISO9660::new(file)?;
        let mut files = Vec::new();
        let mut stack = vec![iso.root.clone()];

        while let Some(entry) = stack.pop() {
            match entry {
                DirectoryEntry::File(f) => files.push(f.identifier.clone()),
                DirectoryEntry::Directory(d) => {
                    files.push(format!("{}/", d.identifier));
                    for child in d.contents() {
                        stack.push(child);
                    }
                }
            }
        }
        Ok(files)
    }
}
