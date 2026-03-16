"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import PageTemplate from "@/components/templates/PageTemplate";
import Avatar from "@/components/atoms/Avatar";
import { CLIENT_FETCH_CACHE } from "@/lib/results-mode";

interface Competitor {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: string;
  photo: string;
}

interface CandidateData {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  dob: string | null;
  qualification: string | null;
  address: string | null;
  photo: string;
  partyShortName: string;
  partyFullName: string;
  partyColor: string;
  symbolName: string;
  symbolId: number;
  votes: number;
  status: string;
  rank: string;
  remarks: string | null;
  margin: number | null;
  castedVote: number | null;
  totalVoters: number | null;
  position: number;
  totalCandidates: number;
  voteShare: number;
  constituency: {
    name: string;
    slug: string;
    districtId: number;
    constNumber: number;
    districtName: string;
    provinceId: number;
    provinceName: string;
    totalVotes: number;
    status: string;
  };
  competitors: Competitor[];
}

function StatusBadge({ status, remarks }: { status: string; remarks: string | null }) {
  const isWon = status === "won" || remarks === "Elected";
  const isLeading = status === "leading";
  if (isWon) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Elected
      </span>
    );
  }
  if (isLeading) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Leading
      </span>
    );
  }
  if (status === "trailing") {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
        Trailing
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-400">
      Pending
    </span>
  );
}

function CandidateProfile({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/candidate/${candidateId}`, { cache: CLIENT_FETCH_CACHE })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || "Candidate not found");
      })
      .catch(() => setError("Failed to load candidate data"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <PageTemplate>
        <div className="animate-fade-in space-y-6">
          <div className="card animate-pulse p-8">
            <div className="flex gap-6">
              <div className="h-24 w-24 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-100" />
                <div className="h-4 w-64 rounded bg-slate-100" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="card animate-pulse p-4"><div className="h-10 rounded bg-slate-100" /></div>)}
          </div>
        </div>
      </PageTemplate>
    );
  }

  if (error || !data) {
    return (
      <PageTemplate>
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-slate-500 mb-4">{error || "Candidate not found"}</p>
          <Link href="/results" className="text-red-600 hover:text-red-700 text-sm font-semibold">
            ← Back to results
          </Link>
        </div>
      </PageTemplate>
    );
  }

  const isWinner = data.status === "won" || data.remarks === "Elected";
  const maxVotes = Math.max(...data.competitors.map((c) => c.votes), 1);

  return (
    <PageTemplate>
      <div className="animate-fade-in space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/results" className="hover:text-red-600 transition-colors">Results</Link>
          <span>›</span>
          <Link href={`/analytics?view=province&id=${data.constituency.provinceId}`} className="hover:text-red-600 transition-colors">
            {data.constituency.provinceName}
          </Link>
          <span>›</span>
          <Link href={`/analytics?view=constituency&id=${data.constituency.slug}`} className="hover:text-red-600 transition-colors">
            {data.constituency.name}
          </Link>
          <span>›</span>
          <span className="text-slate-600 font-medium">{data.name}</span>
        </nav>

        {/* Hero card */}
        <div className="card overflow-hidden">
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${data.partyColor}88, ${data.partyColor})` }} />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar name={data.name} color={data.partyColor} size={96} src={data.photo} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{data.name}</h1>
                  <StatusBadge status={data.status} remarks={data.remarks} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Link
                    href={`/analytics?view=party&name=${encodeURIComponent(data.partyShortName)}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: `${data.partyColor}15`, color: data.partyColor, border: `1px solid ${data.partyColor}30` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.partyColor }} />
                    {data.partyFullName} ({data.partyShortName})
                  </Link>
                  {data.symbolName && (
                    <span className="text-xs text-slate-400">Symbol: {data.symbolName}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                  <Link
                    href={`/analytics?view=constituency&id=${data.constituency.slug}`}
                    className="hover:text-red-600 transition-colors"
                  >
                    📍 {data.constituency.name}
                  </Link>
                  <Link
                    href={`/analytics?view=province&id=${data.constituency.provinceId}`}
                    className="hover:text-red-600 transition-colors"
                  >
                    🏔️ {data.constituency.provinceName}
                  </Link>
                  {data.address && <span>🏠 {data.address}</span>}
                </div>
              </div>
              {/* Vote count highlight */}
              <div className="shrink-0 text-right">
                <div className="text-3xl font-black tabular-nums" style={{ color: isWinner ? "#059669" : data.partyColor }}>
                  {data.votes.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">votes received</div>
                {data.margin != null && data.margin > 0 && data.position === 1 && (
                  <div className="text-sm font-bold text-emerald-600 mt-1">+{data.margin.toLocaleString()} margin</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Position" value={`#${data.position}`} sub={`of ${data.totalCandidates}`} />
          <StatCard label="Vote Share" value={`${data.voteShare}%`} sub={`${data.votes.toLocaleString()} votes`} />
          {data.age && <StatCard label="Age" value={String(data.age)} sub={data.dob || undefined} />}
          {data.gender && <StatCard label="Gender" value={data.gender} />}
          {data.qualification && <StatCard label="Education" value={data.qualification} />}
          {data.totalVoters ? (
            <StatCard label="Turnout" value={`${((data.constituency.totalVotes / data.totalVoters) * 100).toFixed(1)}%`} sub={`${data.totalVoters.toLocaleString()} registered`} />
          ) : (
            <StatCard label="Total Votes" value={data.constituency.totalVotes.toLocaleString()} sub="in constituency" />
          )}
        </div>

        {/* Constituency race */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Constituency Race</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  <Link href={`/analytics?view=constituency&id=${data.constituency.slug}`} className="hover:text-red-600 transition-colors">
                    {data.constituency.name}
                  </Link>
                  {" · "}{data.constituency.totalVotes.toLocaleString()} total votes
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                data.constituency.status === "won"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : data.constituency.status === "leading"
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : "bg-slate-50 text-slate-500 border border-slate-100"
              }`}>
                {data.constituency.status === "won" ? "Declared" : data.constituency.status === "leading" ? "Counting" : "Pending"}
              </span>
            </div>
          </div>
          <div className="divide-y divide-slate-100/70">
            {data.competitors.map((c, i) => {
              const pct = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
              const isMe = c.id === data.id;
              return (
                <div key={c.id} className={`flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-white/70 ${isMe ? "bg-slate-50/80" : ""}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    c.status === "won"
                      ? "bg-emerald-100 text-emerald-700"
                      : i === 0
                        ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-400"
                  }`}>
                    {c.status === "won" ? "✓" : i + 1}
                  </span>
                  <Avatar name={c.name} color={c.partyColor} size={34} src={c.photo} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isMe ? (
                        <span className="truncate text-sm font-bold text-slate-900">{c.name}</span>
                      ) : (
                        <Link href={`/candidate/${c.id}`} className="truncate text-sm font-semibold text-slate-800 hover:text-red-600 transition-colors">
                          {c.name}
                        </Link>
                      )}
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${c.partyColor}15`, color: c.partyColor }}>
                        {c.partyShortName}
                      </span>
                      {isMe && (
                        <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: c.partyColor }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    <span className={`text-sm font-bold tabular-nums ${c.status === "won" ? "text-emerald-700" : i === 0 ? "text-slate-900" : "text-slate-500"}`}>
                      {c.votes.toLocaleString()}
                    </span>
                    {data.constituency.totalVotes > 0 && (
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {((c.votes / data.constituency.totalVotes) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 px-6 py-3 text-right">
            <Link href={`/analytics?view=constituency&id=${data.constituency.slug}`} className="text-xs font-bold text-red-600 hover:text-red-700">
              View full constituency details →
            </Link>
          </div>
        </div>

        {/* About section */}
        {(data.address || data.qualification || data.dob || data.gender || data.age) && (
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">About</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.partyFullName && (
                <InfoRow label="Party" value={data.partyFullName} href={`/analytics?view=party&name=${encodeURIComponent(data.partyShortName)}`} />
              )}
              {data.constituency.name && (
                <InfoRow label="Constituency" value={data.constituency.name} href={`/analytics?view=constituency&id=${data.constituency.slug}`} />
              )}
              {data.constituency.provinceName && (
                <InfoRow label="Province" value={data.constituency.provinceName} href={`/analytics?view=province&id=${data.constituency.provinceId}`} />
              )}
              {data.constituency.districtName && (
                <InfoRow label="District" value={data.constituency.districtName} />
              )}
              {data.address && <InfoRow label="Address" value={data.address} />}
              {data.gender && <InfoRow label="Gender" value={data.gender} />}
              {data.age && <InfoRow label="Age" value={`${data.age} years`} />}
              {data.dob && <InfoRow label="Date of Birth" value={data.dob} />}
              {data.qualification && <InfoRow label="Qualification" value={data.qualification} />}
              {data.symbolName && <InfoRow label="Election Symbol" value={data.symbolName} />}
            </dl>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 truncate">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-lg bg-slate-50/70 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-700">
        {href ? (
          <Link href={href} className="hover:text-red-600 transition-colors">{value}</Link>
        ) : value}
      </dd>
    </div>
  );
}

export default function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CandidateProfile candidateId={id} />;
}
