"use client";

import { ElectionDataProvider } from "@/context/ElectionDataContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ElectionDataProvider>{children}</ElectionDataProvider>;
}
