import {
  Activity,
  Boxes,
  Braces,
  Database,
  Gauge,
  RadioTower,
  ServerCog,
  Workflow,
} from "lucide-react";

export const navigation = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/jobs", label: "Jobs", icon: Workflow },
  { href: "/sources", label: "Sources", icon: RadioTower },
  { href: "/projects", label: "Projects", icon: Braces },
  { href: "/profiles", label: "Profiles", icon: ServerCog },
  { href: "/workers", label: "Workers", icon: Boxes },
  { href: "/system", label: "System", icon: Database },
] as const;
