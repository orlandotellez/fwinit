use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Cliente HTTP nativo de la app (reqwest con connection pooling).
/// Vive en el proceso de Rust: los requests salen directo a la red,
/// sin pasar por el WebView → sin CORS.
#[derive(Default)]
pub struct HttpClient {
    inner: reqwest::Client,
}

impl HttpClient {
    pub async fn run(&self, args: HttpArgs) -> Result<HttpResult, String> {
        // Timeouts: el dashboard no debe colgarse ante un servidor caído.
        let client = self
            .inner
            .clone()
            .timeout(Duration::from_secs(args.timeout_secs.unwrap_or(30).max(1)));

        let mut builder = match args.method.to_uppercase().as_str() {
            "GET" => client.get(args.url.clone()),
            "POST" => client.post(args.url.clone()),
            "PUT" => client.put(args.url.clone()),
            "PATCH" => client.patch(args.url.clone()),
            "DELETE" => client.delete(args.url.clone()),
            other => return Err(format!("method not supported: {other}")),
        };

        for (key, value) in &args.headers {
            builder = builder.header(key, value);
        }
        if let Some(body) = &args.body {
            builder = builder.body(body.clone());
        }

        let response = builder
            .send()
            .await
            .map_err(|err| format!("http request failed: {err}"))?;

        let status = response.status().as_u16();
        let body = response
            .text()
            .await
            .map_err(|err| format!("read body failed: {err}"))?;

        Ok(HttpResult { status, body })
    }
}

/// Argumentos enviados por `src/lib/fetch.ts` vía `invoke("http_request")`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpArgs {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub timeout_secs: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResult {
    pub status: u16,
    pub body: String,
}