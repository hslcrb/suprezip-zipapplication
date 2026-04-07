use encoding_rs::{EUC_KR, UTF_8};
use anyhow::{Result, anyhow};

pub fn decode_filename(bytes: &[u8]) -> String {
    // Try UTF-8 first
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
    }

    // Fallback to EUC-KR (CP949) for legacy Windows zip files
    let (res, _encoding, _has_errors) = EUC_KR.decode(bytes);
    res.into_owned()
}

pub fn encode_filename(s: &str) -> Vec<u8> {
    // We always want to store as UTF-8 in modern archives, 
    // but the zip spec has a bit for this.
    s.as_bytes().to_vec()
}
