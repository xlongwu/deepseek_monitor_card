fn main() {
    println!("cargo:rustc-check-cfg=cfg(mobile)");
    
    // Skip Windows resource compilation in sandboxed environments
    if std::env::var("TAURI_SKIP_WINRES").is_ok() || cfg!(not(windows)) {
        return;
    }
    
    // Try to build, but don't panic if it fails (e.g., in sandboxed environments)
    let result = std::panic::catch_unwind(|| {
        tauri_build::build()
    });
    
    if result.is_err() {
        println!("cargo:warning=tauri_build failed, skipping Windows resource compilation");
    }
}