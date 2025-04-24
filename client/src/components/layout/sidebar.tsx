import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  ChartLine,
  Users,
  FileText,
  Scale,
  Settings,
  Calendar,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  currentPath: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar({ open, currentPath }: SidebarProps) {
  const isMobile = useIsMobile();
  
  const navItems: NavItem[] = [
    {
      title: "Tableau de bord",
      href: "/",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      title: "Simulation revenus",
      href: "/revenue-simulation",
      icon: <ChartLine className="w-5 h-5" />,
    },
    {
      title: "Associés",
      href: "/associates",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Charges",
      href: "/expenses",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      title: "Réunions RCP",
      href: "/rcp-meetings",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      title: "Répartition",
      href: "/distribution",
      icon: <Scale className="w-5 h-5" />,
    },
    {
      title: "Paramètres",
      href: "/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className={cn(
        "bg-[#0063A3] shadow-lg flex flex-col transition-all duration-300 fixed h-full z-10",
        open ? (isMobile ? "w-16" : "w-56") : "w-0"
      )}
    >
      <nav className="flex-1 py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.href} className="mb-1">
              <Link href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-4 py-3 text-white hover:bg-[#0076c6] cursor-pointer",
                    currentPath === item.href && "bg-[#0076c6] font-medium"
                  )}
                >
                  {item.icon}
                  {(!isMobile || !open) && <span className="ml-2 hidden md:block">{item.title}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {!isMobile && open && (
        <div className="p-4 mt-auto hidden md:block">
          <div className="text-xs text-white opacity-70">
            <p>MSP Gestion v1.0</p>
            <p>© 2023 Tous droits réservés</p>
          </div>
        </div>
      )}
    </aside>
  );
}
