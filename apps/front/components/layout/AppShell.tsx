"use client";

import { AudioPlayer } from "@/components/player/AudioPlayer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 pb-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
      <AudioPlayer />
    </div>
  );
}
