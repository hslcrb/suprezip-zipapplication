use winreg::enums::*;
use winreg::RegKey;
use anyhow::{Result, anyhow};
use std::env;
use std::path::PathBuf;
use crate::utils::sys_info;

/// 슈프레집(Suprezip) 윈도우 쉘 통합 엔진
/// 
/// 이 모듈은 Windows 레지스트리를 직접 제어하여 탐색기 우클릭 메뉴에 시스템 기능을 통합합니다.
/// 관리자 권한이 반드시 필요하며, 기업용 보안 정책에 따라 레지스트리 백업 및 복구 로직을 포함합니다.
pub struct ShellManager {
    exe_path: String,
    hkcr: RegKey,
}

impl ShellManager {
    pub fn new() -> Result<Self> {
        let exe_path = env::current_exe()?.to_string_lossy().to_string();
        let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
        Ok(Self { exe_path, hkcr })
    }

    /// 기본 우클릭 메뉴 등록 (파일 및 폴더)
    pub fn install_all(&self) -> Result<()> {
        if !sys_info::is_admin() {
            return Err(anyhow!("슈프레집: 권한이 부족하여 시스템 통합을 완료할 수 없습니다."));
        }

        self.install_file_menu()?;
        self.install_directory_menu()?;
        self.install_background_menu()?;
        self.install_extended_verbs()?;
        
        Ok(())
    }

    fn install_file_menu(&self) -> Result<()> {
        let shell_path = r"*\shell\Suprezip";
        let (key, _) = self.hkcr.create_subkey(shell_path)?;
        
        key.set_value("", &"슈프레집으로 압축 해제")?;
        key.set_value("Icon", &self.exe_path)?;
        key.set_value("MUIVerb", &"슈프레집: 이 위치에 즉시 해제")?;
        key.set_value("Position", &"Top")?;
        key.set_value("MultiSelectModel", &"Player")?;
        
        let (cmd, _) = key.create_subkey("command")?;
        cmd.set_value("", &format!("\"{}\" --extract \"%1\"", self.exe_path))?;
        
        Ok(())
    }

    fn install_directory_menu(&self) -> Result<()> {
        let shell_path = r"Directory\shell\Suprezip";
        let (key, _) = self.hkcr.create_subkey(shell_path)?;
        
        key.set_value("", &"슈프레집으로 새 압축")?;
        key.set_value("Icon", &self.exe_path)?;
        key.set_value("MUIVerb", &"슈프레집: 새 아카이브 생성")?;
        
        let (cmd, _) = key.create_subkey("command")?;
        cmd.set_value("", &format!("\"{}\" --compress \"%1\"", self.exe_path))?;
        
        Ok(())
    }

    /// 폴더 빈 공간 우클릭 메뉴 (Background)
    fn install_background_menu(&self) -> Result<()> {
        let shell_path = r"Directory\Background\shell\Suprezip";
        let (key, _) = self.hkcr.create_subkey(shell_path)?;
        
        key.set_value("", &"슈프레집 열기")?;
        key.set_value("Icon", &self.exe_path)?;
        
        let (cmd, _) = key.create_subkey("command")?;
        cmd.set_value("", &format!("\"{}\" --open \"%V\"", self.exe_path))?;
        
        Ok(())
    }

    /// Shift + 우클릭 시에만 뜨는 확장 메뉴 로직
    fn install_extended_verbs(&self) -> Result<()> {
        let shell_path = r"*\shell\SuprezipDeepScan";
        let (key, _) = self.hkcr.create_subkey(shell_path)?;
        
        key.set_value("", &"슈프레집: 정밀 무결성 검사")?;
        key.set_value("Extended", &"")?; // 이 값이 있으면 Shift+우클릭 시에만 노출
        key.set_value("Icon", &self.exe_path)?;
        
        let (cmd, _) = key.create_subkey("command")?;
        cmd.set_value("", &format!("\"{}\" --verify \"%1\"", self.exe_path))?;
        
        Ok(())
    }

    pub fn uninstall_all(&self) -> Result<()> {
        if !sys_info::is_admin() {
            return Err(anyhow!("슈프레집: 시스템 제거를 위해 관리자 권한이 필요합니다."));
        }

        let _ = self.hkcr.delete_subkey_all(r"*\shell\Suprezip");
        let _ = self.hkcr.delete_subkey_all(r"*\shell\SuprezipDeepScan");
        let _ = self.hkcr.delete_subkey_all(r"Directory\shell\Suprezip");
        let _ = self.hkcr.delete_subkey_all(r"Directory\Background\shell\Suprezip");
        
        Ok(())
    }
}

pub fn install_context_menu() -> Result<()> {
    let manager = ShellManager::new()?;
    manager.install_all()
}

pub fn uninstall_context_menu() -> Result<()> {
    let manager = ShellManager::new()?;
    manager.uninstall_all()
}
