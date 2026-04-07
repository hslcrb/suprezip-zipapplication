use std::sync::Arc;
use dashmap::DashMap;
use uuid::Uuid;
use serde::Serialize;
use anyhow::Result;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct TaskStatus {
    pub id: String,
    pub name: String,
    pub status: String,
    pub progress: f32,
}

pub struct TaskManager {
    pub active_tasks: Arc<DashMap<String, TaskStatus>>,
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            active_tasks: Arc::new(DashMap::new()),
        }
    }

    pub fn start_task(&self, app: &AppHandle, name: &str) -> String {
        let id = Uuid::new_v4().to_string();
        let status = TaskStatus {
            id: id.clone(),
            name: name.to_string(),
            status: "Running".to_string(),
            progress: 0.0,
        };
        self.active_tasks.insert(id.clone(), status.clone());
        let _ = app.emit("task-started", status);
        id
    }

    pub fn update_progress(&self, app: &AppHandle, id: &str, progress: f32) {
        if let Some(mut entry) = self.active_tasks.get_mut(id) {
            entry.progress = progress;
            let _ = app.emit("task-progress", entry.clone());
        }
    }

    pub fn finish_task(&self, app: &AppHandle, id: &str, success: bool) {
        if let Some((_, mut status)) = self.active_tasks.remove(id) {
            status.status = if success { "Completed".to_string() } else { "Failed".to_string() };
            status.progress = 1.0;
            let _ = app.emit("task-finished", status);
        }
    }
}
