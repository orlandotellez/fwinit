import { useState, type FormEvent } from "react";
import { checkApiHealth, isValidApiUrl, readApiUrl, writeApiUrl } from "@/lib/api-config";

export function Settings() {
  const [value, setValue] = useState(readApiUrl());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isValidApiUrl(trimmed)) {
      setError("URL inválida. Debe empezar con http:// o https://");
      return;
    }
    writeApiUrl(trimmed);
    setError(null);
    setSaved(true);
  };

  const handleTest = async () => {
    const trimmed = value.trim();
    if (!isValidApiUrl(trimmed)) {
      setError("URL inválida. Corregí antes de probar.");
      return;
    }
    setTesting("testing");
    const ok = await checkApiHealth(trimmed);
    setTesting(ok ? "ok" : "error");
  };

  return (
    <div className="settings">
      <section className="card form-card">
        <h2 className="card-title">Servidor del API</h2>
        <p className="card-text">
          La URL se guarda en <code className="code">localStorage</code> y la resuelve{" "}
          <code className="code">api-config.ts</code> al arrancar (ver{" "}
          <code className="code">AppBootstrap</code>).
        </p>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="api-url" className="label">
            URL del API
          </label>
          <input
            id="api-url"
            className="input"
            type="text"
            inputMode="url"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
              setTesting("idle");
              if (error) setError(null);
            }}
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {saved && <p className="form-ok">URL guardada ✓</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
            <button type="button" className="btn" onClick={handleTest} disabled={testing === "testing"}>
              {testing === "testing"
                ? "Probando…"
                : testing === "ok"
                  ? "Conexión OK ✓"
                  : testing === "error"
                    ? "Sin respuesta ✗"
                    : "Probar conexión"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}