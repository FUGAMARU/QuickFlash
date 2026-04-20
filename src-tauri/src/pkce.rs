use axum::{extract::Query, response::Html, routing::get, Router};
use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};
use tower_http::cors::CorsLayer;

const SPOTIFY_TOKEN_URL: &str = "https://accounts.spotify.com/api/token";
const SPOTIFY_AUTH_CONFIG_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../config/spotifyAuthConfig.json"
));

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthData {
    pub code_verifier: String,
    pub code_challenge: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyAuthSession {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at_epoch_seconds: i64,
}

#[derive(Clone)]
pub struct AppState {
    pub auth_data: Arc<Mutex<Option<AuthData>>>,
    pub auth_session: Arc<Mutex<Option<SpotifyAuthSession>>>,
    pub spotify_client_id: Arc<Mutex<Option<String>>>,
    pub auth_session_file_path: Arc<Mutex<Option<PathBuf>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            auth_data: Arc::new(Mutex::new(None)),
            auth_session: Arc::new(Mutex::new(None)),
            spotify_client_id: Arc::new(Mutex::new(None)),
            auth_session_file_path: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn start_spotify_auth(
    client_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<AuthData, String> {
    let normalized_client_id = normalize_client_id(&client_id)?;
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);
    let auth_data = AuthData {
        code_verifier: code_verifier.clone(),
        code_challenge: code_challenge.clone(),
    };

    *state.auth_data.lock().unwrap() = Some(auth_data.clone());
    *state.spotify_client_id.lock().unwrap() = Some(normalized_client_id);

    Ok(auth_data)
}

#[tauri::command]
pub async fn get_auth_session(
    state: tauri::State<'_, AppState>,
) -> Result<Option<SpotifyAuthSession>, String> {
    let session = state.auth_session.lock().unwrap().clone();

    if session.is_some() {
        return Ok(session);
    }

    let persisted_session = read_persisted_auth_session(state.inner())?;

    if let Some(restored_session) = persisted_session.clone() {
        *state.auth_session.lock().unwrap() = Some(restored_session);
    }

    Ok(persisted_session)
}

#[tauri::command]
pub async fn refresh_spotify_access_token(
    refresh_token: String,
    client_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<SpotifyAuthSession, String> {
    if refresh_token.trim().is_empty() {
        return Err("refresh_tokenが空のため更新できません".to_string());
    }

    let normalized_client_id = normalize_client_id(&client_id)?;
    let refreshed_session =
        request_token_with_refresh_token(&refresh_token, &normalized_client_id).await?;

    *state.spotify_client_id.lock().unwrap() = Some(normalized_client_id);
    *state.auth_session.lock().unwrap() = Some(refreshed_session.clone());
    write_persisted_auth_session(state.inner(), &refreshed_session)?;

    Ok(refreshed_session)
}

#[tauri::command]
pub async fn clear_auth_session(state: tauri::State<'_, AppState>) -> Result<(), String> {
    *state.auth_data.lock().unwrap() = None;
    *state.auth_session.lock().unwrap() = None;
    *state.spotify_client_id.lock().unwrap() = None;

    let file_path = match auth_session_file_path(state.inner()) {
        Some(path) => path,
        None => return Ok(()),
    };

    if !file_path.exists() {
        return Ok(());
    }

    fs::remove_file(&file_path).map_err(|e| format!("認証セッションの削除に失敗しました: {}", e))
}

fn generate_code_verifier() -> String {
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)
}

fn generate_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    general_purpose::URL_SAFE_NO_PAD.encode(&hash)
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    error: Option<String>,
}

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthConfig {
    redirect_uri: String,
}

pub async fn start_server(state: AppState) {
    let bind_address = spotify_pkce_bind_address()
        .unwrap_or_else(|error| panic!("PKCEリダイレクトURI設定エラー: {}", error));
    let app = Router::new()
        .route("/pkce", get(handle_callback))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind_address).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

async fn handle_callback(
    Query(params): Query<CallbackQuery>,
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Html<String> {
    if let Some(_) = params.error {
        return Html("<script>window.close();</script>".to_string());
    }

    if let Some(code) = params.code {
        let code_verifier = {
            let auth_data = state.auth_data.lock().unwrap();
            auth_data.as_ref().map(|d| d.code_verifier.clone())
        };
        let spotify_client_id = state.spotify_client_id.lock().unwrap().clone();

        if let (Some(verifier), Some(client_id)) = (code_verifier, spotify_client_id) {
            match request_token_with_authorization_code(&code, &verifier, &client_id).await {
                Ok(auth_session) => {
                    *state.auth_session.lock().unwrap() = Some(auth_session);

                    if let Some(current_session) = state.auth_session.lock().unwrap().clone() {
                        let _ = write_persisted_auth_session(&state, &current_session);
                    }

                    return Html(
                        r#"
                        <!DOCTYPE html>
                        <html>
                        <body>
                            <script>
                                window.close();
                            </script>
                        </body>
                        </html>
                        "#
                        .to_string(),
                    );
                }
                Err(error) => {
                    eprintln!("Spotifyトークン取得失敗: {}", error);
                }
            }
        }
    }

    Html("<script>window.close();</script>".to_string())
}

async fn request_token_with_authorization_code(
    code: &str,
    verifier: &str,
    client_id: &str,
) -> Result<SpotifyAuthSession, String> {
    let redirect_uri = spotify_pkce_redirect_uri()?;

    let token_request = AuthorizationCodeTokenRequest {
        client_id: client_id.to_string(),
        grant_type: "authorization_code".to_string(),
        code: code.to_string(),
        redirect_uri,
        code_verifier: verifier.to_string(),
    };

    request_spotify_token(&token_request, None).await
}

async fn request_token_with_refresh_token(
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

fn normalize_client_id(client_id: &str) -> Result<String, String> {
    let normalized_client_id = client_id.trim();

    if normalized_client_id.is_empty() {
        return Err("client_idが空のためSpotifyトークン取得に失敗しました".to_string());
    }

    Ok(normalized_client_id.to_string())
}

fn spotify_pkce_redirect_uri() -> Result<String, String> {
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

fn spotify_pkce_bind_address() -> Result<String, String> {
    let redirect_uri = spotify_pkce_redirect_uri()?;
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

fn auth_session_file_path(state: &AppState) -> Option<PathBuf> {
    state.auth_session_file_path.lock().unwrap().clone()
}

fn write_persisted_auth_session(
    state: &AppState,
    auth_session: &SpotifyAuthSession,
) -> Result<(), String> {
    let file_path = match auth_session_file_path(state) {
        Some(path) => path,
        None => return Ok(()),
    };

    if let Some(parent_directory) = file_path.parent() {
        fs::create_dir_all(parent_directory).map_err(|e| {
            format!(
                "認証セッション保存先ディレクトリの作成に失敗しました: {}",
                e
            )
        })?;
    }

    let serialized_session = serde_json::to_string(auth_session)
        .map_err(|e| format!("認証セッションのシリアライズに失敗しました: {}", e))?;

    fs::write(&file_path, serialized_session)
        .map_err(|e| format!("認証セッションの保存に失敗しました: {}", e))?;

    Ok(())
}

fn read_persisted_auth_session(state: &AppState) -> Result<Option<SpotifyAuthSession>, String> {
    let file_path = match auth_session_file_path(state) {
        Some(path) => path,
        None => return Ok(None),
    };

    if !file_path.exists() {
        return Ok(None);
    }

    let serialized_session = fs::read_to_string(&file_path)
        .map_err(|e| format!("認証セッションの読み込みに失敗しました: {}", e))?;

    if serialized_session.trim().is_empty() {
        return Ok(None);
    }

    let auth_session = serde_json::from_str::<SpotifyAuthSession>(&serialized_session)
        .map_err(|e| format!("認証セッションの解析に失敗しました: {}", e))?;

    Ok(Some(auth_session))
}

fn now_epoch_seconds() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs() as i64,
        Err(_) => 0,
    }
}
