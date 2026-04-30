use super::{
    config, session_store::write_persisted_auth_session, state::AppState,
    token::request_token_with_authorization_code,
};
use axum::{extract::Query, response::Html, routing::get, Router};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    error: Option<String>,
}

pub(crate) async fn start_server(state: AppState) {
    let bind_address = config::bind_address()
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
    if params.error.is_some() {
        return close_window_response();
    }

    if let Some(code) = params.code {
        let code_verifier = state.auth_data().map(|auth_data| auth_data.code_verifier);
        let spotify_client_id = state.spotify_client_id();

        if let (Some(verifier), Some(client_id)) = (code_verifier, spotify_client_id) {
            match request_token_with_authorization_code(&code, &verifier, &client_id).await {
                Ok(auth_session) => {
                    state.set_auth_session(Some(auth_session.clone()));
                    let _ = write_persisted_auth_session(&state, &auth_session);

                    return close_window_response();
                }
                Err(error) => {
                    eprintln!("Spotifyトークン取得失敗: {}", error);
                }
            }
        }
    }

    close_window_response()
}

fn close_window_response() -> Html<String> {
    Html(
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
    )
}
