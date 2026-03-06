"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-white/55 bg-slate-950 text-slate-200">
      <div className="mx-auto w-full max-w-[1220px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Election 2082</p>
            <h3 className="mt-2 text-xl font-black text-white">Federal Parliament Tracker</h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Cleaner, live election tracking with party momentum, constituency races, and province snapshots in one place.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Navigate</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/results" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">Results</Link>
              <Link href="/candidates" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">Candidates</Link>
              <Link href="/parties" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">Parties</Link>
              <Link href="/provinces" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">Provinces</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Archives</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <a href="https://generalelection2079.ekantipur.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">
                Federal Election 2079
              </a>
              <a href="https://generalelection2074.ekantipur.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">
                Federal Election 2074
              </a>
              <a href="https://localelection2079.ekantipur.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">
                Local Election 2079
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-5 text-xs text-slate-500">
          © 2026 निर्वाचन 2082. Election data sourced from public election feeds.
        </div>
      </div>
    </footer>
  );
}
