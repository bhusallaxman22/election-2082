"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useElectionData } from "@/context/ElectionDataContext";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/results", label: "Results" },
  { href: "/candidates", label: "Candidates" },
  { href: "/parties", label: "Parties" },
  { href: "/provinces", label: "Provinces" },
];

export default function Header() {
  const pathname = usePathname();
  const { lastUpdated } = useElectionData();

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="mx-auto w-full max-w-[1220px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl shadow-lg shadow-red-500/20 transition-transform group-hover:scale-105">
                <Image
                  src="/assets/branding/election-2082-mark.svg"
                  alt="Election 2082 Logo"
                  fill
                  sizes="44px"
                  priority
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">National Dashboard</p>
                <h1 className="text-base font-black text-slate-900">निर्वाचन 2082</h1>
              </div>
            </Link>

            <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:flex sm:items-center sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Connecting live feed"}
            </div>
          </div>

          <nav className="scrollbar-hide flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/65 bg-white/65 p-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/25"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
