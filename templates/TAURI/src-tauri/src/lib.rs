use http_client::{HttpClient, HttpResult};
use tauri::State;

pub mod http_client;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HttpClient::default())
        .invoke_handler(tauri::generate_handler![http_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Comando expuesto a `src/lib/fetch.ts` (crossFetch en runtime Tauri).
/// Ejecuta el request desde el proceso nativo: sin CORS, con el pooling
/// del reqwest::Client de Rust.
#[tauri::command]
async fn http_request(
    client: State<'_, HttpClient>,
    args: http_client::HttpArgs,
) -> Result<HttpResult, String> {
    client.run(args).await
}