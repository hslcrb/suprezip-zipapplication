use winreg::enums::*;
use winreg::RegKey;
use anyhow::Result;
use std::env;

pub fn install_context_menu() -> Result<()> {
    let exe_path = env::current_exe()?.to_string_lossy().to_string();
    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);

    // Register for files (*)
    let (key_file, _) = hkcr.create_subkey(r"*\shell\Suprezip")?;
    key_file.set_value("", &"수프레집으로 압축 해제")?;
    key_file.set_value("Icon", &exe_path)?;
    
    let (cmd_file, _) = key_file.create_subkey("command")?;
    cmd_file.set_value("", &format!("\"{}\" --extract \"%1\"", exe_path))?;

    // Register for directories
    let (key_dir, _) = hkcr.create_subkey(r"Directory\shell\Suprezip")?;
    key_dir.set_value("", &"수프레집으로 압축")?;
    key_dir.set_value("Icon", &exe_path)?;

    let (cmd_dir, _) = key_dir.create_subkey("command")?;
    cmd_dir.set_value("", &format!("\"{}\" --compress \"%1\"", exe_path))?;

    Ok(())
}

pub fn uninstall_context_menu() -> Result<()> {
    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
    let _ = hkcr.delete_subkey_all(r"*\shell\Suprezip");
    let _ = hkcr.delete_subkey_all(r"Directory\shell\Suprezip");
    Ok(())
}
