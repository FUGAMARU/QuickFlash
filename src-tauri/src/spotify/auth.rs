use super::{
    pkce::{generate_code_challenge, generate_code_verifier},
    session_store::{
        read_persisted_auth_session, remove_persisted_auth_session, write_persisted_auth_session,
    },
    state::{AppState, AuthData, SpotifyAuthSession},
    token::request_token_with_refresh_token,
};

pub(crate) async fn start_spotify_auth(
    client_id: String,
    state: &AppState,
) -> Result<AuthData, String> {
    let normalized_client_id = normalize_client_id(&client_id)?;
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);
    let auth_data = AuthData {
        code_verifier: code_verifier.clone(),
        code_challenge: code_challenge.clone(),
    };

    state.set_auth_data(Some(auth_data.clone()));
    state.set_spotify_client_id(Some(normalized_client_id));

    Ok(auth_data)
}

pub(crate) async fn get_auth_session(
    state: &AppState,
) -> Result<Option<SpotifyAuthSession>, String> {
    if let Some(session) = state.auth_session() {
        return Ok(Some(session));
    }

    let persisted_session = read_persisted_auth_session(state)?;

    if let Some(restored_session) = persisted_session.clone() {
        state.set_auth_session(Some(restored_session));
    }

    Ok(persisted_session)
}

pub(crate) async fn refresh_spotify_access_token(
    refresh_token: String,
    client_id: String,
    state: &AppState,
) -> Result<SpotifyAuthSession, String> {
    if refresh_token.trim().is_empty() {
        return Err("refresh_tokenが空のため更新できません".to_string());
    }

    let normalized_client_id = normalize_client_id(&client_id)?;
    let refreshed_session =
        request_token_with_refresh_token(&refresh_token, &normalized_client_id).await?;

    state.set_spotify_client_id(Some(normalized_client_id));
    state.set_auth_session(Some(refreshed_session.clone()));
    write_persisted_auth_session(state, &refreshed_session)?;

    Ok(refreshed_session)
}

pub(crate) async fn clear_auth_session(state: &AppState) -> Result<(), String> {
    state.set_auth_data(None);
    state.set_auth_session(None);
    state.set_spotify_client_id(None);

    remove_persisted_auth_session(state)
}

fn normalize_client_id(client_id: &str) -> Result<String, String> {
    let normalized_client_id = client_id.trim();

    if normalized_client_id.is_empty() {
        return Err("client_idが空のためSpotifyトークン取得に失敗しました".to_string());
    }

    Ok(normalized_client_id.to_string())
}
