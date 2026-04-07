use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use chrono::Local;
use serde::Serialize;
use anyhow::Result;

#[derive(Debug, Serialize)]
pub struct AuditEntry {
    pub timestamp: String,
    pub action: String,
    pub path: String,
    pub target: Option<String>,
    pub status: String,
}

pub fn log_event(app: &tauri::AppHandle, entry: AuditEntry) -> Result<()> {
    let mut log_path = app.path().app_config_dir()?;
    if !log_path.exists() {
        std::fs::create_dir_all(&log_path)?;
    }
    log_path.push("audit.jsonl");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;

    let json = serde_json::to_string(&entry)?;
    writeln!(file, "{}", json)?;

    Ok(())
}

pub fn log_action(app: &tauri::AppHandle, action: &str, path: &str, target: Option<&str>, status: &str) {
    let entry = AuditEntry {
        timestamp: Local::now().to_rfc3339(),
        action: action.to_string(),
        path: path.to_string(),
        target: target.map(|s| s.to_string()),
        status: status.to_string(),
    };
    let _ = log_event(app, entry);
}
