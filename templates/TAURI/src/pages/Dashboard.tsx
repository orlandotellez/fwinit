import { useEffect, useState } from "react";
import { Boxes, Layers, Monitor, HeartPulse } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { backendCount, FWINIT_TEMPLATES, frontendCount } from "@/data/templates";
import { checkApiHealth, readApiUrl } from "@/lib/api-config";

type HealthState = "loading" | "ok" | "error";

export function Dashboard() {
  const [health, setHealth] = useState<HealthState>("loading");
  const apiUrl = readApiUrl();

  useEffect(() => {
    let cancelled = false;
    checkApiHealth(apiUrl).then((ok) => {
      if (!cancelled) setHealth(ok ? "ok" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard
          label="Templates"
          value={String(FWINIT_TEMPLATES.length)}
          hint="disponibles en fwinit"
          icon={<Boxes size={22} />}
        />
        <StatCard
          label="Backends"
          value={String(backendCount)}
          hint="API REST para conectar"
          icon={<Layers size={22} />}
        />
        <StatCard
          label="Frontends"
          value={String(frontendCount)}
          hint="landing, desktop y móvil"
          icon={<Monitor size={22} />}
        />
        <StatCard
          label="API health"
          value={health === "ok" ? "OK" : health === "error" ? "Sin conexión" : "…"}
          hint={health === "error" ? `${apiUrl} no responde` : "conectado al backend"}
          icon={<HeartPulse size={22} />}
        />
      </div>

      <section className="card table-card">
        <h2 className="card-title">Templates de fwinit</h2>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Template</th>
                <th>Capa</th>
                <th>Runtime</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {FWINIT_TEMPLATES.map((t) => (
                <tr key={t.name}>
                  <td className="tpl-name">{t.name}</td>
                  <td>
                    <span className={`badge badge-${t.layer}`}>{t.layer}</span>
                  </td>
                  <td>
                    <code className="code">{t.runtime}</code>
                  </td>
                  <td className="tpl-desc">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}