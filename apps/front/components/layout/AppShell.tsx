"use client";

import { AudioPlayer } from "@/components/player/AudioPlayer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-28">{children}</main>
      </div>
      <AudioPlayer />
    </div>
  );
}
