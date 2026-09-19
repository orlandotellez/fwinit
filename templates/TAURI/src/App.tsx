import { useState } from "react";
import { Sidebar, type View } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Dashboard } from "@/pages/Dashboard";
import { Settings } from "@/pages/Settings";

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Estado de tus proyectos fwinit" },
  settings: { title: "Configuración", subtitle: "Conexión con el API del backend" },
};

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const meta = VIEW_META[view];

  return (
    <div className="layout">
      <Sidebar view={view} onNavigate={setView} />
      <div className="main">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="content">
          {view === "dashboard" ? <Dashboard /> : <Settings />}
        </main>
      </div>
    </div>
  );
}