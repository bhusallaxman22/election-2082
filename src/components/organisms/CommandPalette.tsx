"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  BankOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  CloseOutlined,
} from "@ant-design/icons";

interface SearchResult {
  type: "candidate" | "party" | "constituency" | "district" | "province";
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
  color?: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  candidate: <UserOutlined />,
  party: <TeamOutlined />,
  constituency: <BankOutlined />,
  district: <EnvironmentOutlined />,
  province: <GlobalOutlined />,
};

const TYPE_LABEL: Record<string, string> = {
  candidate: "Candidate",
  party: "Party",
  constituency: "Constituency",
  district: "District",
  province: "Province",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Open/close with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setResults(json.results || []);
        setActiveIndex(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.children[activeIndex] as HTMLElement;
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        {/* Input */}
        <div className="cmd-palette-input-wrap">
          <SearchOutlined className="cmd-palette-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search candidates, parties, constituencies..."
            className="cmd-palette-input"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="cmd-palette-input-actions">
            {query && (
              <button onClick={() => setQuery("")} className="cmd-palette-clear" aria-label="Clear">
                <CloseOutlined />
              </button>
            )}
            <kbd className="cmd-palette-kbd">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="cmd-palette-results">
          {loading && query.length >= 2 && (
            <div className="cmd-palette-empty">Searching...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="cmd-palette-empty">No results for &ldquo;{query}&rdquo;</div>
          )}
          {!loading && query.length < 2 && (
            <div className="cmd-palette-empty">Type at least 2 characters to search</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.title}-${i}`}
              className={`cmd-palette-item ${i === activeIndex ? "active" : ""}`}
              onClick={() => navigate(r.href)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="cmd-palette-item-icon" style={r.color ? { color: r.color } : undefined}>
                {TYPE_ICON[r.type]}
              </span>
              <div className="cmd-palette-item-text">
                <span className="cmd-palette-item-title">{r.title}</span>
                <span className="cmd-palette-item-sub">{r.subtitle}</span>
              </div>
              <div className="cmd-palette-item-right">
                {r.meta && <span className="cmd-palette-item-meta">{r.meta}</span>}
                <span className="cmd-palette-item-type">{TYPE_LABEL[r.type]}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="cmd-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
