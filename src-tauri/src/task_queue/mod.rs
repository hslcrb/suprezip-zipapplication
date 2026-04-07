use std::sync::Arc;
use dashmap::DashMap;
use uuid::Uuid;
use serde::Serialize;
use anyhow::Result;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;
use chrono::Local;

#[derive(Debug, Clone, Serialize)]
pub struct TaskStatus {
    pub id: String,
    pub name: String,
    pub status: String,
    pub progress: f32,
    pub started_at: String,
}

pub struct TaskEntry {
    pub status: TaskStatus,
    pub handle: Option<JoinHandle<Result<()>>>,
}

pub struct TaskHistory {
    pub id: String,
    pub name: String,
    pub status: String,
    pub completed_at: String,
}

/// 슈프레집(Suprezip) 정예 태스크 관리 엔진 (Mission Control)
/// 
/// 여러 개의 압축/해제/보안 작업을 동시에 병렬로 관리하며,
/// 각 작업의 생명주기(Life cycle)를 실시간으로 제어합니다.
/// 사용자의 Abort 시그널에 즉각 반응하여 시스템 리소스를 반환합니다.
pub struct TaskManager {
    pub active_tasks: Arc<DashMap<String, TaskEntry>>,
    pub history: Arc<DashMap<String, TaskHistory>>,
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            active_tasks: Arc::new(DashMap::new()),
            history: Arc::new(DashMap::new()),
        }
    }

    pub fn start_task(&self, app: &AppHandle, name: &str) -> String {
        let id = Uuid::new_v4().to_string();
        let status = TaskStatus {
            id: id.clone(),
            name: name.to_string(),
            status: "Initializing...".to_string(),
            progress: 0.0,
            started_at: Local::now().to_rfc3339(),
        };
        self.active_tasks.insert(id.clone(), TaskEntry {
            status: status.clone(),
            handle: None,
        });
        
        let _ = app.emit("task-started", status);
        id
    }

    pub fn update_status(&self, app: &AppHandle, id: &str, status_msg: &str) {
        if let Some(mut entry) = self.active_tasks.get_mut(id) {
            entry.status.status = status_msg.to_string();
            let _ = app.emit("task-progress", entry.status.clone());
        }
    }

    pub fn set_handle(&self, id: &str, handle: JoinHandle<Result<()>>) {
        if let Some(mut entry) = self.active_tasks.get_mut(id) {
            entry.handle = Some(handle);
        }
    }

    pub fn update_progress(&self, app: &AppHandle, id: &str, progress: f32) {
        if let Some(mut entry) = self.active_tasks.get_mut(id) {
            entry.status.progress = progress;
            let _ = app.emit("task-progress", entry.status.clone());
        }
    }

    pub fn finish_task(&self, app: &AppHandle, id: &str, success: bool) {
        if let Some((_, mut entry)) = self.active_tasks.remove(id) {
            let status = if success { "Completed" } else { "Failed" };
            entry.status.status = status.to_string();
            entry.status.progress = 1.0;
            
            // Move to history
            self.history.insert(id.to_string(), TaskHistory {
                id: id.to_string(),
                name: entry.status.name.clone(),
                status: status.to_string(),
                completed_at: Local::now().to_rfc3339(),
            });

            let _ = app.emit("task-finished", entry.status.clone());
        }
    }

    pub fn abort_task(&self, id: &str) -> Result<()> {
        if let Some((_, entry)) = self.active_tasks.remove(id) {
            if let Some(handle) = entry.handle {
                handle.abort();
            }
            Ok(())
        } else {
            Err(anyhow::anyhow!("슈프레집: 존재하지 않거나 이미 종료된 작업입니다."))
        }
    }
}
