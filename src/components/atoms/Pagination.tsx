"use client";

import React from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, onPageSizeChange }: PaginationProps) {
  if ((totalItems ?? 0) === 0) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
      <div className="flex items-center gap-3">
        {totalItems !== undefined && (
          <span className="text-[11px] text-slate-400">{totalItems} items</span>
        )}
        {pageSize !== undefined && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt} / page</option>
            ))}
          </select>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 ml-auto">
          <button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-xs text-slate-300">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg text-xs font-semibold transition ${
                  p === page
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/** Hook that manages pagination state with dynamic page size and returns a page slice of data */
export function usePagination<T>(items: T[], defaultPageSize = 20) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change (e.g. search/filter)
  const prevLen = React.useRef(items.length);
  React.useEffect(() => {
    if (items.length !== prevLen.current) {
      setPage(1);
      prevLen.current = items.length;
    }
  }, [items.length]);

  const handlePageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  // Clamp page
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { page: safePage, totalPages, setPage, pageItems, totalItems: items.length, pageSize, setPageSize: handlePageSizeChange };
}
