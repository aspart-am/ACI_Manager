import { useState, ReactNode } from "react";
import Sidebar from "./sidebar";
import MainNav from "./main-nav";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const getTitle = () => {
    switch (location) {
      case "/":
        return "Tableau de bord";
      case "/revenue-simulation":
        return "Simulation des revenus";
      case "/associates":
        return "Gestion des associés";
      case "/expenses":
        return "Charges";
      case "/rcp-meetings":
        return "Réunions de concertation pluriprofessionnelle";
      case "/distribution":
        return "Répartition des rémunérations";
      case "/settings":
        return "Paramètres";
      default:
        return "MSP Gestion";
    }
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col h-screen">
      <MainNav toggleSidebar={toggleSidebar} title={getTitle()} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} currentPath={location} />
        
        <main 
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 transition-all duration-300",
            sidebarOpen && !isMobile ? "ml-56" : sidebarOpen && isMobile ? "ml-16" : "ml-0"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
