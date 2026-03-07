"use client";

import { ElectionDataProvider } from "@/context/ElectionDataContext";
import CommandPalette from "@/components/organisms/CommandPalette";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ElectionDataProvider>
      {children}
      <CommandPalette />
    </ElectionDataProvider>
  );
}
