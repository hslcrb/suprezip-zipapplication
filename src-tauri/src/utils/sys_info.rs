use anyhow::Result;
use whoami;
use sysinfo::{System, CpuExt, SystemExt};

#[derive(Debug, serde::Serialize)]
pub struct ContextInfo {
    pub username: String,
    pub hostname: String,
    pub os: String,
    pub arch: String,
    pub cpu_count: usize,
    pub timestamp: String,
}

pub fn get_system_context() -> ContextInfo {
    let mut sys = System::new();
    sys.refresh_cpu();
    
    ContextInfo {
        username: whoami::username(),
        hostname: whoami::hostname(),
        os: whoami::platform().to_string(),
        arch: whoami::arch().to_string(),
        cpu_count: sys.cpus().len(),
        timestamp: chrono::Local::now().to_rfc3339(),
    }
}

pub fn is_admin() -> bool {
    #[cfg(target_os = "windows")]
    { is_elevated::is_elevated() }
    #[cfg(not(target_os = "windows"))]
    { false }
}
