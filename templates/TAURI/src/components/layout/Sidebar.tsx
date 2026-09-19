import { LayoutDashboard, Settings, Rocket } from "lucide-react";

export type View = "dashboard" | "settings";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ view, onNavigate }: SidebarProps) {
  const items: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <Rocket size={22} strokeWidth={2} className="brand-icon" />
        <span className="brand-name">fwinit</span>
      </div>

      <nav className="nav" aria-label="Principal">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="badge">Tauri v2</span>
        <p className="version">scaffold de fwinit</p>
      </div>
    </aside>
  );
}