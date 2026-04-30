use serde::Deserialize;
use std::sync::OnceLock;

const SPOTIFY_AUTH_CONFIG_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../config/spotifyAuthConfig.json"
));

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthConfig {
    redirect_uri: String,
}

pub(super) fn redirect_uri() -> Result<String, String> {
    static SPOTIFY_PKCE_REDIRECT_URI: OnceLock<Result<String, String>> = OnceLock::new();

    let redirect_uri = SPOTIFY_PKCE_REDIRECT_URI.get_or_init(|| {
        let parsed_config = serde_json::from_str::<SpotifyAuthConfig>(SPOTIFY_AUTH_CONFIG_JSON)
            .map_err(|e| format!("spotifyAuthConfig.jsonの解析に失敗しました: {}", e))?;
        let normalized_redirect_uri = parsed_config.redirect_uri.trim();

        if normalized_redirect_uri.is_empty() {
            return Err("spotifyAuthConfig.jsonのredirectUriが空です".to_string());
        }

        Ok(normalized_redirect_uri.to_string())
    });

    match redirect_uri {
        Ok(value) => Ok(value.clone()),
        Err(error) => Err(error.clone()),
    }
}

pub(super) fn bind_address() -> Result<String, String> {
    let redirect_uri = redirect_uri()?;
    let uri_without_scheme = redirect_uri
        .strip_prefix("http://")
        .or_else(|| redirect_uri.strip_prefix("https://"))
        .ok_or("spotifyAuthConfig.jsonのredirectUriにhttp(s)スキームが必要です")?;
    let bind_address = uri_without_scheme
        .split('/')
        .next()
        .unwrap_or_default()
        .trim();

    if bind_address.is_empty() {
        return Err("spotifyAuthConfig.jsonのredirectUriからbind先を解決できません".to_string());
    }

    Ok(bind_address.to_string())
}
