use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, BufReader};
use sha2::{Sha256, Digest};
use md5::Md5;
use anyhow::Result;

pub async fn calculate_sha256(path: &Path) -> Result<String> {
    let file = File::open(path).await?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];

    loop {
        let count = reader.read(&mut buffer).await?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }

    Ok(hex::encode(hasher.finalize()))
}

pub async fn calculate_md5(path: &Path) -> Result<String> {
    let file = File::open(path).await?;
    let mut reader = BufReader::new(file);
    let mut hasher = Md5::new();
    let mut buffer = [0; 8192];

    loop {
        let count = reader.read(&mut buffer).await?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }

    Ok(hex::encode(hasher.finalize()))
}
