import { crossFetch } from "@/lib/fetch";

// ===========================================================================
// Configuración del API
//
// La app resuelve la URL del API en tres niveles:
//   1. Desarrollo (vite dev)      → DEFAULT_API_URL (servidor local)
//   2. Producción con URL previa  → localStorage (API_URL_STORAGE_KEY)
//   3. Producción sin URL         → pantalla manual (AppBootstrap)
//
// Si tu app necesita un "bootstrap remoto" (descargar la URL desde un bucket
// como R2/S3, además de versión y APK), es acá donde se conecta — el contrato
// de fetchBootstrap ya está preparado para devolver { apiUrl } o null.
// ===========================================================================

export const API_URL_STORAGE_KEY = "FWINIT_API_URL";
export const DEFAULT_API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const IS_DEV =
  import.meta.env.VITE_FORCE_PRODUCTION === "true" ? false : import.meta.env.DEV === true;

export function isValidApiUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

export function readApiUrl(): string {
  if (IS_DEV) return DEFAULT_API_URL;

  try {
    const stored = localStorage.getItem(API_URL_STORAGE_KEY);
    if (isValidApiUrl(stored)) return stored;
  } catch {
    /* localStorage no disponible */
  }
  return DEFAULT_API_URL;
}

export function writeApiUrl(value: string): void {
  try {
    localStorage.setItem(API_URL_STORAGE_KEY, value);
  } catch {
    /* localStorage no disponible */
  }
}

export interface BootstrapResult {
  apiUrl: string;
}

/**
 * Resuelve la URL del API al arrancar la app.
 *
 * Devuelve:
 *  - `BootstrapResult` cuando hay URL conocida (dev → local, prod → cacheada).
 *  - `null` SOLO cuando no hay URL cacheada en producción → la app debe
 *    pedir la URL manualmente (ver AppBootstrap).
 */
export async function fetchBootstrap(): Promise<BootstrapResult | null> {
  // En dev no consultamos nada: servidor local directo.
  if (IS_DEV) {
    return { apiUrl: DEFAULT_API_URL };
  }

  // Producción: la URL cacheada manda. No usar readApiUrl() acá porque
  // tiene fallback a DEFAULT_API_URL y nunca retornaría null.
  try {
    const stored = localStorage.getItem(API_URL_STORAGE_KEY);
    if (isValidApiUrl(stored)) {
      return { apiUrl: stored };
    }
  } catch {
    /* localStorage no disponible */
  }

  // Sin URL cacheada: la primera ejecución pide la URL manualmente.
  // Acá iría el fetch al config remoto cuando lo tengas.
  return null;
}

/**
 * Health check del API que sirve de ejemplo de uso de crossFetch.
 */
export async function checkApiHealth(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await crossFetch(`${url.replace(/\/$/, "")}/health`, {
      signal,
      headers: { Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}