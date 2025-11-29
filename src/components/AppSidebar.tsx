import { BookOpen, Trophy, Users, Star, FolderOpen, BarChart3, DollarSign, Brain } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Management', url: '/', icon: BookOpen },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Teams', url: '/teams', icon: Users },
  { title: 'MVP', url: '/mvp', icon: Star },
  { title: 'Materials', url: '/materials', icon: FolderOpen },
  { title: 'AI Analysis', url: '/analysis', icon: Brain },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Fees', url: '/fees', icon: DollarSign },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gamify Pallikoodam</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
