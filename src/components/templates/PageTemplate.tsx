"use client";

import React from "react";
import Header from "../organisms/Header";
import Footer from "../organisms/Footer";

interface PageTemplateProps {
  children: React.ReactNode;
}

export default function PageTemplate({ children }: PageTemplateProps) {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-red-300/22 blur-[105px]" />
        <div className="absolute right-[-8rem] top-16 h-[28rem] w-[28rem] rounded-full bg-sky-300/20 blur-[115px]" />
        <div className="absolute bottom-[-14rem] left-1/4 h-[26rem] w-[34rem] rounded-full bg-emerald-300/14 blur-[120px]" />
      </div>

      <Header />
      <main className="mx-auto w-full max-w-[1220px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
