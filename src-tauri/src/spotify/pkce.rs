use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use sha2::{Digest, Sha256};

pub(super) fn generate_code_verifier() -> String {
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();

    general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)
}

pub(super) fn generate_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();

    general_purpose::URL_SAFE_NO_PAD.encode(hash)
}

#[cfg(test)]
mod tests {
    use super::{generate_code_challenge, generate_code_verifier};

    #[test]
    fn generates_url_safe_pkce_values() {
        let verifier = generate_code_verifier();
        let challenge = generate_code_challenge(&verifier);

        assert!(!verifier.contains('='));
        assert!(!challenge.contains('='));
        assert!(!verifier.is_empty());
        assert!(!challenge.is_empty());
    }
}
