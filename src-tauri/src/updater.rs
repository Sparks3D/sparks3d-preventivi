// src-tauri/src/updater.rs
// Sparks3D Preventivi – Check aggiornamenti
// ============================================

use serde::{Deserialize, Serialize};

const GITHUB_REPO: &str = "Sparks3D/sparks3d-preventivi";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
    pub release_date: String,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: Option<String>,
    html_url: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    assets: Option<Vec<GitHubAsset>>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: Option<String>,
    browser_download_url: Option<String>,
}

// Struttura per version.json custom (fallback)
#[derive(Debug, Deserialize)]
struct VersionJson {
    version: Option<String>,
    download_url: Option<String>,
    release_notes: Option<String>,
    release_date: Option<String>,
}

fn parse_version(v: &str) -> Vec<u32> {
    v.trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect()
}

fn is_newer(latest: &str, current: &str) -> bool {
    let l = parse_version(latest);
    let c = parse_version(current);
    for i in 0..l.len().max(c.len()) {
        let lv = l.get(i).copied().unwrap_or(0);
        let cv = c.get(i).copied().unwrap_or(0);
        if lv > cv { return true; }
        if lv < cv { return false; }
    }
    false
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    // Tentativo 1: GitHub Releases API
    let github_url = format!("https://api.github.com/repos/{}/releases/latest", GITHUB_REPO);

    let client = reqwest::Client::builder()
        .user_agent("Sparks3D-Preventivi")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // Prova GitHub API
    if let Ok(resp) = client.get(&github_url).send().await {
        if resp.status().is_success() {
            if let Ok(release) = resp.json::<GitHubRelease>().await {
                let tag = release.tag_name.unwrap_or_default();
                let latest = tag.trim_start_matches('v').to_string();

                // Cerca il .exe tra gli asset
                let download = release.assets
                    .as_ref()
                    .and_then(|assets| {
                        assets.iter()
                            .find(|a| a.name.as_ref().map(|n| n.ends_with(".exe")).unwrap_or(false))
                            .and_then(|a| a.browser_download_url.clone())
                    })
                    .unwrap_or_else(|| release.html_url.clone().unwrap_or_default());

                return Ok(UpdateInfo {
                    update_available: is_newer(&latest, CURRENT_VERSION),
                    current_version: CURRENT_VERSION.to_string(),
                    latest_version: latest,
                    download_url: download,
                    release_notes: release.body.unwrap_or_default(),
                    release_date: release.published_at
                        .map(|d| d.split('T').next().unwrap_or(&d).to_string())
                        .unwrap_or_default(),
                });
            }
        }
    }

    // Tentativo 2: Fallback su version.json (ospitato su sparks3d.it o altrove)
    let fallback_urls = [
        "https://sparks3d.it/updates/version.json",
        &format!("https://raw.githubusercontent.com/{}/main/version.json", GITHUB_REPO),
    ];

    for url in &fallback_urls {
        if let Ok(resp) = client.get(*url).send().await {
            if resp.status().is_success() {
                if let Ok(vj) = resp.json::<VersionJson>().await {
                    let latest = vj.version.unwrap_or_default();
                    return Ok(UpdateInfo {
                        update_available: is_newer(&latest, CURRENT_VERSION),
                        current_version: CURRENT_VERSION.to_string(),
                        latest_version: latest,
                        download_url: vj.download_url.unwrap_or_default(),
                        release_notes: vj.release_notes.unwrap_or_default(),
                        release_date: vj.release_date.unwrap_or_default(),
                    });
                }
            }
        }
    }

    // Nessuna fonte disponibile
    Ok(UpdateInfo {
        update_available: false,
        current_version: CURRENT_VERSION.to_string(),
        latest_version: CURRENT_VERSION.to_string(),
        download_url: String::new(),
        release_notes: String::new(),
        release_date: String::new(),
    })
}
