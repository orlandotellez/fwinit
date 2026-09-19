import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  DEFAULT_API_URL,
  fetchBootstrap,
  isValidApiUrl,
  readApiUrl,
  writeApiUrl,
} from "@/lib/api-config";

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "manual"; inputValue: string; error: string | null }
  | { kind: "retrieving"; prevInputValue: string; prevError: string | null };

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid var(--splash-fg, #e2e8f0)",
  borderTopColor: "transparent",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};

export function SplashScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--splash-bg, #040609)",
        color: "var(--splash-fg, #e2e8f0)",
        fontFamily: "system-ui, sans-serif",
        zIndex: 9999,
      }}
    >
      <div style={spinnerStyle} />
    </div>
  );
}

function ManualConfigForm({
  initialValue,
  initialError,
  onSubmit,
  onRetry,
  retrying,
}: {
  initialValue: string;
  initialError: string | null;
  onSubmit: (url: string) => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(initialError);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isValidApiUrl(trimmed)) {
      setError(
        "URL inválida. Debe empezar con http:// o https:// y terminar con un host válido.",
      );
      return;
    }
    onSubmit(trimmed);
  };

  const errorId = "api-url-error";
  const showError = error !== null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base, #040609)",
        color: "var(--text-primary, #e2e8f0)",
        fontSize: "1rem",
        fontFamily: "system-ui, sans-serif",
        zIndex: 9999,
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--card, #0f172a)",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
          Configurar servidor del API
        </h2>
        <p style={{ margin: 0, opacity: 0.8, fontSize: "0.9rem" }}>
          No tenemos una URL guardada del API. Ingresá la URL del backend de tu
          dashboard para continuar.
        </p>
        <label htmlFor="api-url" style={{ fontSize: "0.85rem", opacity: 0.85 }}>
          URL del API
        </label>
        <input
          id="api-url"
          name="api-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoFocus
          required
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          placeholder="http://localhost:3000/api/v1"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${showError ? "#ef4444" : "var(--border, #334155)"}`,
            background: "var(--bg-input, #0b0f14)",
            color: "var(--text-primary, #e2e8f0)",
            fontSize: "0.95rem",
          }}
        />
        {showError && (
          <p
            id={errorId}
            role="alert"
            style={{ margin: 0, color: "#ef4444", fontSize: "0.85rem" }}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={retrying}
          aria-busy={retrying}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--primary, #7c3aed)",
            color: "#ffffff",
            fontSize: "0.95rem",
            cursor: retrying ? "wait" : "pointer",
            fontWeight: 600,
            opacity: retrying ? 0.6 : 1,
          }}
        >
          Guardar y continuar
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #334155)",
            background: "transparent",
            color: "var(--text-primary, #e2e8f0)",
            fontSize: "0.85rem",
            cursor: retrying ? "wait" : "pointer",
            opacity: retrying ? 0.6 : 1,
          }}
        >
          {retrying ? "Reintentando…" : "Reintentar"}
        </button>
      </form>
    </div>
  );
}

/**
 * AppBootstrap — resuelve la URL del API antes de montar la app.
 *
 * estados:
 *  - loading    → splash
 *  - ready      → monta la app (children)
 *  - manual     → pide la URL del API a mano (primera ejecución sin conexión)
 *  - retrieving → reintenta la resolución automática
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const result = await fetchBootstrap();
      if (cancelled) return;

      if (result !== null) {
        writeApiUrl(result.apiUrl);
        setState({ kind: "ready" });
        return;
      }

      // Si ya había una URL cacheada, úsala sin bloquear al usuario.
      if (readApiUrl() !== DEFAULT_API_URL) {
        setState({ kind: "ready" });
        return;
      }

      // Primera ejecución sin URL: pedirla manualmente.
      setState({ kind: "manual", inputValue: "", error: null });
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "ready") {
    return children;
  }
  if (state.kind === "loading") return <SplashScreen />;

  if (state.kind === "retrieving") {
    return (
      <ManualConfigForm
        initialValue={state.prevInputValue}
        initialError={state.prevError ?? "Reintentando resolución de configuración…"}
        retrying
        onSubmit={(url) => {
          writeApiUrl(url);
          setState({ kind: "ready" });
        }}
        onRetry={() => {}}
      />
    );
  }

  return (
    <ManualConfigForm
      initialValue={state.inputValue}
      initialError={state.error}
      retrying={false}
      onSubmit={(url) => {
        writeApiUrl(url);
        setState({ kind: "ready" });
      }}
      onRetry={() =>
        setState((prev) =>
          prev.kind === "manual"
            ? { kind: "retrieving", prevInputValue: prev.inputValue, prevError: prev.error }
            : prev,
        )
      }
    />
  );
}