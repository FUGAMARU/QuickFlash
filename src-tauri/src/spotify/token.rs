use super::{config, state::SpotifyAuthSession};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const SPOTIFY_TOKEN_URL: &str = "https://accounts.spotify.com/api/token";

#[derive(Serialize)]
struct AuthorizationCodeTokenRequest {
    client_id: String,
    grant_type: String,
    code: String,
    redirect_uri: String,
    code_verifier: String,
}

#[derive(Serialize)]
struct RefreshTokenRequest {
    client_id: String,
    grant_type: String,
    refresh_token: String,
}

#[derive(Deserialize)]
struct SpotifyTokenResponse {
    access_token: String,
    expires_in: i64,
    refresh_token: Option<String>,
}

pub(super) async fn request_token_with_authorization_code(
    code: &str,
    verifier: &str,
    client_id: &str,
) -> Result<SpotifyAuthSession, String> {
    let redirect_uri = config::redirect_uri()?;

    let token_request = AuthorizationCodeTokenRequest {
        client_id: client_id.to_string(),
        grant_type: "authorization_code".to_string(),
        code: code.to_string(),
        redirect_uri,
        code_verifier: verifier.to_string(),
    };

    request_spotify_token(&token_request, None).await
}

pub(super) async fn request_token_with_refresh_token(
    refresh_token: &str,
    client_id: &str,
) -> Result<SpotifyAuthSession, String> {
    let token_request = RefreshTokenRequest {
        client_id: client_id.to_string(),
        grant_type: "refresh_token".to_string(),
        refresh_token: refresh_token.to_string(),
    };

    request_spotify_token(&token_request, Some(refresh_token.to_string())).await
}

async fn request_spotify_token<T: Serialize>(
    token_request: &T,
    fallback_refresh_token: Option<String>,
) -> Result<SpotifyAuthSession, String> {
    let response = reqwest::Client::new()
        .post(SPOTIFY_TOKEN_URL)
        .form(token_request)
        .send()
        .await
        .map_err(|e| format!("Spotify APIへのリクエストに失敗しました: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Spotifyトークン取得に失敗しました (status: {}): {}",
            status, error_body
        ));
    }

    let token_response = response
        .json::<SpotifyTokenResponse>()
        .await
        .map_err(|e| format!("Spotifyトークンレスポンスの解析に失敗しました: {}", e))?;

    build_auth_session(token_response, fallback_refresh_token)
}

fn build_auth_session(
    token_response: SpotifyTokenResponse,
    fallback_refresh_token: Option<String>,
) -> Result<SpotifyAuthSession, String> {
    let resolved_refresh_token = token_response
        .refresh_token
        .filter(|token| !token.trim().is_empty())
        .or(fallback_refresh_token)
        .ok_or("refresh_tokenが取得できませんでした")?;

    Ok(SpotifyAuthSession {
        access_token: token_response.access_token,
        refresh_token: resolved_refresh_token,
        expires_at_epoch_seconds: now_epoch_seconds() + token_response.expires_in,
    })
}

fn now_epoch_seconds() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs() as i64,
        Err(_) => 0,
    }
}
