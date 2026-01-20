use axum::{extract::Query, response::Html, routing::get, Router};
use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;

const SPOTIFY_PKCE_REDIRECT_URI: &str = "http://127.0.0.1:8888/pkce";

#[derive(Clone, Serialize, Deserialize)]
pub struct AuthData {
    pub code_verifier: String,
    pub code_challenge: String,
}

#[derive(Clone)]
pub struct AppState {
    pub auth_data: Arc<Mutex<Option<AuthData>>>,
    pub access_token: Arc<Mutex<Option<String>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            auth_data: Arc::new(Mutex::new(None)),
            access_token: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn start_spotify_auth(state: tauri::State<'_, AppState>) -> Result<AuthData, String> {
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);
    let auth_data = AuthData {
        code_verifier: code_verifier.clone(),
        code_challenge: code_challenge.clone(),
    };

    *state.auth_data.lock().unwrap() = Some(auth_data.clone());

    Ok(auth_data)
}

#[tauri::command]
pub async fn get_access_token(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let token = state.access_token.lock().unwrap().clone();
    Ok(token)
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
struct TokenRequest {
    client_id: String,
    grant_type: String,
    code: String,
    redirect_uri: String,
    code_verifier: String,
}

pub async fn start_server(state: AppState) {
    let app = Router::new()
        .route("/pkce", get(handle_callback))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8888")
        .await
        .unwrap();

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

        if let Some(verifier) = code_verifier {
            let client = reqwest::Client::new();
            let client_id = std::env::var("VITE_SPOTIFY_CLIENT_ID")
                .expect("VITE_SPOTIFY_CLIENT_ID環境変数が設定されていません");

            let token_request = TokenRequest {
                client_id,
                grant_type: "authorization_code".to_string(),
                code: code.clone(),
                redirect_uri: SPOTIFY_PKCE_REDIRECT_URI.to_string(),
                code_verifier: verifier,
            };

            match client
                .post("https://accounts.spotify.com/api/token")
                .form(&token_request)
                .send()
                .await
            {
                Ok(response) => {
                    if let Ok(json) = response.json::<serde_json::Value>().await {
                        if let Some(access_token) =
                            json.get("access_token").and_then(|v| v.as_str())
                        {
                            *state.access_token.lock().unwrap() = Some(access_token.to_string());
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
                    }
                }
                Err(_) => {
                    return Html("<script>window.close();</script>".to_string());
                }
            }
        }
    }

    Html("<script>window.close();</script>".to_string())
}
