use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, BufReader};
use sha2::{Sha256, Digest};
use md5::Md5;
use anyhow::{Result, anyhow};
use tauri::{AppHandle, Emitter};
use serde::Serialize;
use std::time::Instant;

/// 슈프레집(Suprezip) 정밀 무결성 검사 엔진 (Security Offensive)
/// 
/// 1GB 이상의 대용량 파일에 대해서도 CPU 점유율을 최적화하며,
/// 실시간 진행률(Progress)과 속도(MB/s)를 UI에 빔으로 쏩니다.
/// 기업용 보안 감사 시 데이터 변조 여부를 100% 신뢰성 있게 판별합니다.

#[derive(Debug, Clone, Serialize)]
pub struct HashProgress {
    pub file_name: String,
    pub progress: f32,       // 0.0 to 1.0
    pub bytes_processed: u64,
    pub total_bytes: u64,
    pub speed_mbs: f32,      // Current speed in MB/s
    pub eta_seconds: u32,    // Estimated time remaining
}

pub async fn calculate_sha256_with_progress(app: &AppHandle, path: &Path) -> Result<String> {
    if !path.exists() {
        return Err(anyhow!("슈프레집: 대상 파일이 존재하지 않습니다: {:?}", path));
    }

    let file = File::open(path).await?;
    let metadata = file.metadata().await?;
    let total_bytes = metadata.len();
    
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 1048576]; // 1MB Large Buffer for Enterprise High-Speed Hashing
    
    let mut bytes_processed = 0u64;
    let start_time = Instant::now();
    let mut last_emit = Instant::now();

    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    loop {
        let count = reader.read(&mut buffer).await?;
        if count == 0 { break; }
        
        hasher.update(&buffer[..count]);
        bytes_processed += count as u64;

        // Throttling: UI가 터지지 않게 0.2초마다 한 번씩만 상태 전송
        if last_emit.elapsed().as_millis() > 200 || bytes_processed == total_bytes {
            let elapsed = start_time.elapsed().as_secs_f32();
            let speed_mbs = if elapsed > 0.0 {
                (bytes_processed as f32 / 1024.0 / 1024.0) / elapsed
            } else { 0.0 };

            let eta = if speed_mbs > 0.0 {
                ((total_bytes - bytes_processed) as f32 / 1024.0 / 1024.0 / speed_mbs) as u32
            } else { 0 };

            let _ = app.emit("hash-progress", HashProgress {
                file_name: file_name.clone(),
                progress: bytes_processed as f32 / total_bytes as f32,
                bytes_processed,
                total_bytes,
                speed_mbs,
                eta_seconds: eta,
            });
            last_emit = Instant::now();
        }
    }

    Ok(hex::encode(hasher.finalize()))
}

pub async fn calculate_md5_with_progress(app: &AppHandle, path: &Path) -> Result<String> {
    let file = File::open(path).await?;
    let metadata = file.metadata().await?;
    let total_bytes = metadata.len();
    
    let mut reader = BufReader::new(file);
    let mut hasher = Md5::new();
    let mut buffer = [0; 524288]; // 512KB Buffer
    
    let mut bytes_processed = 0u64;
    let start_time = Instant::now();

    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    loop {
        let count = reader.read(&mut buffer).await?;
        if count == 0 { break; }
        
        hasher.update(&buffer[..count]);
        bytes_processed += count as u64;

        let elapsed = start_time.elapsed().as_secs_f32();
        let speed = (bytes_processed as f32 / 1024.0 / 1024.0) / elapsed;

        let _ = app.emit("hash-progress", HashProgress {
            file_name: file_name.clone(),
            progress: bytes_processed as f32 / total_bytes as f32,
            bytes_processed,
            total_bytes,
            speed_mbs: speed,
            eta_seconds: 0, // Simplified
        });
    }

    Ok(hex::encode(hasher.finalize()))
}
