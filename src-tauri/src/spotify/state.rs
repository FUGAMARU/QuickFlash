use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AuthData {
    pub code_verifier: String,
    pub code_challenge: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SpotifyAuthSession {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at_epoch_seconds: i64,
}

#[derive(Clone)]
pub(crate) struct AppState {
    auth_data: Arc<Mutex<Option<AuthData>>>,
    auth_session: Arc<Mutex<Option<SpotifyAuthSession>>>,
    spotify_client_id: Arc<Mutex<Option<String>>>,
    auth_session_file_path: Arc<Mutex<Option<PathBuf>>>,
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

    pub fn auth_data(&self) -> Option<AuthData> {
        self.auth_data.lock().unwrap().clone()
    }

    pub fn set_auth_data(&self, auth_data: Option<AuthData>) {
        *self.auth_data.lock().unwrap() = auth_data;
    }

    pub fn auth_session(&self) -> Option<SpotifyAuthSession> {
        self.auth_session.lock().unwrap().clone()
    }

    pub fn set_auth_session(&self, auth_session: Option<SpotifyAuthSession>) {
        *self.auth_session.lock().unwrap() = auth_session;
    }

    pub fn spotify_client_id(&self) -> Option<String> {
        self.spotify_client_id.lock().unwrap().clone()
    }

    pub fn set_spotify_client_id(&self, spotify_client_id: Option<String>) {
        *self.spotify_client_id.lock().unwrap() = spotify_client_id;
    }

    pub fn auth_session_file_path(&self) -> Option<PathBuf> {
        self.auth_session_file_path.lock().unwrap().clone()
    }

    pub fn set_auth_session_file_path(&self, auth_session_file_path: PathBuf) {
        *self.auth_session_file_path.lock().unwrap() = Some(auth_session_file_path);
    }
}
