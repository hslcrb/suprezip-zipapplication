use std::fs::{OpenOptions, File, rename, remove_file};
use std::io::{Write, BufWriter};
use std::path::{PathBuf, Path};
use chrono::Local;
use serde::Serialize;
use anyhow::{Result, anyhow};
use crate::utils::sys_info;

const MAX_LOG_SIZE: u64 = 1024 * 1024; // 1MB per log segment
const MAX_LOG_FILES: usize = 5;       // Keep 5 historical log segments

#[derive(Debug, Serialize)]
pub struct AuditEntry {
    pub timestamp: String,
    pub action: String,
    pub path: String,
    pub target: Option<String>,
    pub status: String,
    pub context: sys_info::ContextInfo,
}

/// 슈프레집(Suprezip) 감사 로그 매니저 (Enterprise Logging)
/// 
/// 모든 파일 조작 행위는 실명제로 기록되며, 로그 회전(Rotation)을 통해 용량 관리를 수행합니다.
/// 유령 파일이나 무단 점유로부터 데이터를 보호하기 위한 '본질적인' 추적 로직입니다.
pub struct AuditManager {
    log_dir: PathBuf,
}

impl AuditManager {
    pub fn new(app: &tauri::AppHandle) -> Result<Self> {
        let log_dir = app.path().app_config_dir()?;
        if !log_dir.exists() {
            std::fs::create_dir_all(&log_dir)?;
        }
        Ok(Self { log_dir })
    }

    pub fn log(&self, action: &str, path: &str, target: Option<&str>, status: &str) -> Result<()> {
        let entry = AuditEntry {
            timestamp: Local::now().to_rfc3339(),
            action: action.to_string(),
            path: path.to_string(),
            target: target.map(|s| s.to_string()),
            status: status.to_string(),
            context: sys_info::get_system_context(),
        };

        self.rotate_if_needed()?;
        
        let log_file = self.log_dir.join("audit.jsonl");
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)?;

        let mut writer = BufWriter::new(file);
        let json = serde_json::to_string(&entry)?;
        writeln!(writer, "{}", json)?;
        writer.flush()?;

        Ok(())
    }

    /// 로그 파일이 임계치를 넘으면 회전 처리 (V5 Enterprise 로직)
    fn rotate_if_needed(&self) -> Result<()> {
        let log_file = self.log_dir.join("audit.jsonl");
        if !log_file.exists() { return Ok(()); }

        let metadata = std::fs::metadata(&log_file)?;
        if metadata.len() < MAX_LOG_SIZE { return Ok(()); }

        // History Rotation (audit.jsonl.1, .2, ...)
        for i in (1..MAX_LOG_FILES).rev() {
            let old_name = self.log_dir.join(format!("audit.jsonl.{}", i));
            let new_name = self.log_dir.join(format!("audit.jsonl.{}", i + 1));
            if old_name.exists() {
                if i + 1 >= MAX_LOG_FILES {
                    let _ = remove_file(&old_name);
                } else {
                    let _ = rename(&old_name, &new_name);
                }
            }
        }

        rename(&log_file, self.log_dir.join("audit.jsonl.1"))?;
        Ok(())
    }
}

pub fn log_action(app: &tauri::AppHandle, action: &str, path: &str, target: Option<&str>, status: &str) {
    if let Ok(manager) = AuditManager::new(app) {
        let _ = manager.log(action, path, target, status);
    }
}

pub fn list_logs(app: &tauri::AppHandle) -> Result<Vec<AuditEntry>> {
    let log_file = app.path().app_config_dir()?.join("audit.jsonl");
    if !log_file.exists() { return Ok(vec![]); }

    let content = std::fs::read_to_string(log_file)?;
    let entries = content.lines()
        .filter_map(|line| serde_json::from_str::<AuditEntry>(line).ok())
        .collect();
    
    Ok(entries)
}
