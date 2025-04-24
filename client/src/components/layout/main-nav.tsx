import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserNav from "./user-nav";
import { Menu, Bell, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainNavProps {
  toggleSidebar: () => void;
  title: string;
}

export default function MainNav({ toggleSidebar, title }: MainNavProps) {
  const isMobile = useIsMobile();

  return (
    <header className="bg-[#0063A3] text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2 text-white hover:bg-[#0076c6] hover:text-white"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="text-2xl font-bold mr-6">MSP Gestion</div>
        {!isMobile && (
          <div className="hidden md:flex">
            <Input
              type="text"
              placeholder="Rechercher..."
              className="w-[250px] bg-white/10 border-white/20 text-white placeholder:text-white/70"
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#0076c6] hover:text-white">
          <Bell className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#0076c6] hover:text-white">
          <Settings className="h-5 w-5" />
        </Button>
        
        <UserNav />
      </div>
    </header>
  );
}
