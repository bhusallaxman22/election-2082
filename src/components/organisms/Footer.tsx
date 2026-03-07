"use client";

import React from "react";
import Link from "next/link";
import VisitorCounter from "../atoms/VisitorCounter";

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
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Developer</p>
            <h4 className="mt-2 text-2xl font-black text-white">Laxman Bhusal</h4>
            <a
              href="https://bhusallaxman.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              bhusallaxman.com.np
            </a>

            <div className="mt-4 flex flex-col gap-2.5">
              <a
                href="https://github.com/bhusallaxman22"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                GitHub: bhusallaxman22
              </a>
              <a
                href="https://www.linkedin.com/in/laxman-bhushal-54426617b/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                LinkedIn: laxman-bhushal-54426617b
              </a>
              <a
                href="https://instagram.com/lakshman.22"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                Instagram: lakshman.22
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 निर्वाचन 2082. Data fetched from Election Commission:{" "}
            <a
              href="https://result.election.gov.np/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-400 transition-colors hover:text-white"
            >
              result.election.gov.np
            </a>
          </span>
          <div className="flex items-center gap-4">
            <VisitorCounter />
            <a
              href="https://bhusallaxman.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-400 transition-colors hover:text-white"
            >
              developed by Laxman Bhusal bhusallaxman.com.np
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
