
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Trophy, Users, Star, Zap, Monitor, BarChart3, Megaphone, FolderOpen } from 'lucide-react';
import { usePresentationMode } from './PresentationMode';
import { cn } from '@/lib/utils';

interface SmartboardNavigationProps {
  defaultValue: string;
  children: React.ReactNode;
}

export function SmartboardNavigation({ defaultValue, children }: SmartboardNavigationProps) {
  const { isPresentationMode, textSize } = usePresentationMode();

  const tabs = [
    { value: "management", icon: <BookOpen />, label: "Management" },
    { value: "leaderboard", icon: <Trophy />, label: "Leaderboard" },
    { value: "teams", icon: <Users />, label: "Teams" },
    { value: "mvp", icon: <Star />, label: "MVP" },
    { value: "live-competition", icon: <Zap />, label: "Live" },
    { value: "smartboard", icon: <Monitor />, label: "Smartboard" },
    { value: "materials", icon: <FolderOpen />, label: "Materials" },
    { value: "announcements", icon: <Megaphone />, label: "Announcements" },
    { value: "reports", icon: <BarChart3 />, label: "Reports" },
  ];

  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className={cn(
        "grid w-full bg-card/50 backdrop-blur-sm mb-8 p-2 gap-2",
        isPresentationMode ? "grid-cols-4" : "grid-cols-4 md:grid-cols-9",
        isPresentationMode ? "h-20" : "h-16",
        textSize === 'large' && "h-18",
        textSize === 'extra-large' && "h-24"
      )}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-3 transition-all rounded-xl",
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "hover:bg-primary/10 touch-manipulation select-none",
              textSize === 'normal' && "text-sm [&_svg]:size-4",
              textSize === 'large' && "text-base [&_svg]:size-5",
              textSize === 'extra-large' && "text-lg [&_svg]:size-6",
              isPresentationMode && "min-h-[4rem]"
            )}
          >
            {tab.icon}
            <span className={cn(
              "font-medium",
              isPresentationMode ? "hidden sm:block" : "hidden md:block"
            )}>
              {tab.label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
