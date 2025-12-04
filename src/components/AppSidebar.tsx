import { BookOpen, Trophy, FolderOpen, DollarSign, CalendarDays, Clock, Users, GraduationCap, Shield } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUserRole } from '@/hooks/useUserRole';

const tuitionAdminItems = [
  { title: 'Management', url: '/', icon: BookOpen },
  { title: 'Students', url: '/students', icon: GraduationCap },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Materials', url: '/materials', icon: FolderOpen },
  { title: 'Timetable', url: '/timetable', icon: Clock },
  { title: 'Attendance', url: '/attendance', icon: CalendarDays },
  { title: 'Classes', url: '/classes', icon: Users },
  { title: 'Fees', url: '/fees', icon: DollarSign },
];

const superAdminItems = [
  { title: 'Dashboard', url: '/super-admin', icon: Shield },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { role, loading } = useUserRole();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/super-admin') return location.pathname === '/super-admin';
    return location.pathname.startsWith(path);
  };

  // Don't show sidebar for students/parents or while loading
  if (loading || role === 'student' || role === 'parent' || !role) {
    return null;
  }

  const menuItems = role === 'super_admin' ? superAdminItems : tuitionAdminItems;

  return (
    <Sidebar collapsible="icon" className="hidden md:flex bg-white border-r border-gray-200">
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent className="mt-4">
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
