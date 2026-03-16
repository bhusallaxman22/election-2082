"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { Spin } from "antd";
import { LeftOutlined, RightOutlined, TrophyOutlined, TeamOutlined, EnvironmentOutlined } from "@ant-design/icons";
import PageTemplate from "@/components/templates/PageTemplate";
import Avatar from "@/components/atoms/Avatar";
import Pagination, { usePagination } from "@/components/atoms/Pagination";
import { useElectionData } from "@/context/ElectionDataContext";
import { CLIENT_FETCH_CACHE } from "@/lib/results-mode";

const InteractiveMap = dynamic(
  () => import("@/components/organisms/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    ),
  }
);

/* ═══════════════ TYPES ═══════════════ */

interface Overview {
  totalFPTP: number; totalPR: number; declared: number;
  counting: number; pending: number; totalVotesCast: number;
}

interface ConstituencyCandidate { id: string; name: string; party: string; color: string; votes: number; status: string; photo?: string }

interface ConstituencyData {
  districtId: number; constNumber: number; constituencySlug: string;
  constituency: string; district: string; provinceId: number; province: string;
  leaderName: string; leaderParty: string; leaderPartyColor: string;
  leaderVotes: number; runnerUpName: string; runnerUpVotes: number;
  margin: number; totalVotes: number; status: string;
  candidates: ConstituencyCandidate[];
}

interface PartyConstituency {
  districtId: number; constNumber: number; constituency: string;
  district: string; province: string; provinceId: number;
  status: string; leaderName: string; votes: number;
  margin: number; totalVotes: number;
}

interface PartyStanding {
  party: string; color: string; logo?: string; fptpWins: number; fptpLeads: number;
  prSeats: number; totalSeats: number; totalVotes: number;
  prVotes: number; prVotePercent: number;
  constituencies: PartyConstituency[];
  provinceWise: Record<string, { wins: number; leads: number; votes: number }>;
}

interface ProvinceBreakdown {
  province: string; provinceId: number; totalSeats: number;
  declared: number; totalVotes: number;
  parties: { party: string; color: string; wins: number; leads: number; votes: number }[];
  constituencies: ConstituencyData[];
}

interface RaceItem {
  districtId: number; constNumber: number; constituency: string;
  district: string; province: string; leader: string; leaderParty: string;
  leaderPartyColor: string; leaderVotes: number; runnerUp: string;
  runnerUpVotes: number; margin: number; totalVotes: number;
}

interface MarginItem {
  districtId: number; constNumber: number; constituency: string;
  district: string; province: string; winner: string; winnerParty: string;
  winnerPartyColor: string; winnerVotes: number; runnerUpVotes: number;
  margin: number; totalVotes: number;
}

interface VoteDistItem { party: string; color: string; votes: number; percentage: number }

interface TurnoutItem {
  province: string; provinceId: number; totalVotes: number;
  constituencies: number; avgVotesPerConstituency: number;
}

interface AnalyticsData {
  overview: Overview; partyStandings: PartyStanding[];
  provinceBreakdown: ProvinceBreakdown[]; closestRaces: RaceItem[];
  biggestMargins: MarginItem[]; voteDistribution: VoteDistItem[];
  turnoutByProvince: TurnoutItem[];
}

type DrillView =
  | { type: "overview" }
  | { type: "party"; party: string }
  | { type: "province"; provinceId: number }
  | { type: "constituency"; districtId: number; constNumber: number };

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function colorWithAlpha(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return `rgba(148,163,184,${alpha})`;
  const int = Number.parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

const TT = {
  background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)",
  border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, fontSize: 12,
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.12)",
};

/* ═══════════════ TABLE UTILITIES ═══════════════ */

type SortDir = "asc" | "desc";
interface SortState<K extends string> { col: K; dir: SortDir }

function useTableSort<K extends string>(defaultCol: K, defaultDir: SortDir = "desc") {
  const [sort, setSort] = useState<SortState<K>>({ col: defaultCol, dir: defaultDir });
  const toggle = useCallback((col: K) => {
    setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });
  }, []);
  return { sort, toggle };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-0.5 text-[8px] text-slate-300">⇅</span>;
  return <span className="ml-0.5 text-[8px] text-red-500">{dir === "asc" ? "↑" : "↓"}</span>;
}

function Th({ col, sort, toggle, children, className = "" }: {
  col: string; sort: SortState<string>; toggle: (c: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <th className={`px-3 py-2.5 cursor-pointer select-none hover:text-slate-600 ${className}`} onClick={() => toggle(col)}>
      <span className="inline-flex items-center gap-0.5">{children}<SortIcon active={sort.col === col} dir={sort.dir} /></span>
    </th>
  );
}

function TableSearch({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-200"
    />
  );
}

function sortRows<T>(rows: T[], col: string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[col];
    const bv = (b as Record<string, unknown>)[col];
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc" ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
  });
}

/* ═══════════════ CONSTITUENCY DETAIL ═══════════════ */

function ConstituencyPanel({
  data,
  onBack,
  onDistrict,
}: {
  data: ConstituencyData;
  onBack: () => void;
  onDistrict: (districtId: number, provinceId: number) => void;
}) {
  const top = data.candidates.slice(0, 8);
  const maxV = Math.max(...top.map((c) => c.votes), 1);
  const shareArc = useMemo(() => {
    if (!data.totalVotes) return [];
    return top
      .slice(0, 5)
      .map((candidate) => ({
        ...candidate,
        share: Math.round((candidate.votes / data.totalVotes) * 1000) / 10,
      }))
      .filter((candidate) => candidate.share > 0)
      .sort((a, b) => b.share - a.share);
  }, [top, data.totalVotes]);
  const shareArcMax = Math.max(...shareArc.map((candidate) => candidate.share), 1);

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600"><LeftOutlined className="text-[10px]" /> Back</button>
      <div>
        <h3 className="text-xl font-black text-slate-900">{data.constituency}</h3>
        <p className="text-sm text-slate-500">{data.district} &middot; {data.province}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Status", v: data.status === "won" ? "Declared" : data.status === "leading" ? "Counting" : "Pending" },
          { l: "Total Votes", v: fmt(data.totalVotes) },
          { l: "Margin", v: data.margin > 0 ? fmt(data.margin) : "—" },
          { l: data.status === "won" ? "Winner" : "Winning/Leading", v: data.leaderName || "—" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl bg-slate-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.l}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h4 className="text-sm font-bold text-slate-900">Constituency Focus Map</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">Showing only the selected constituency area context</p>
        </div>
        <InteractiveMap
          provinceId={data.provinceId}
          height={360}
          showProvinceBorders={false}
          showLabels
          selectedDistrictId={data.districtId}
          fitMaxZoom={12}
          fitPadding={[6, 6]}
          onDistrictClick={(districtId, _name, _constituencies, provinceId) => onDistrict(districtId, provinceId)}
        />
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
          Active: <span className="font-bold text-slate-800">{data.constituency}</span>
        </div>
      </div>

      {top.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Candidate Results</h4>
          <div className="space-y-2.5">
            {top.map((c, i) => (
              <div key={i}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={c.name} color={c.color || "#94a3b8"} size={22} src={c.photo || `/api/candidate-image/${c.id}`} />
                    <Link href={`/candidate/${c.id}`} className="font-semibold text-slate-700 hover:text-red-600 transition-colors">{c.name}</Link>
                    <span className="text-slate-400">({c.party})</span>
                    {c.status === "won" && <TrophyOutlined className="text-amber-500" />}
                  </span>
                  <span className="font-mono text-slate-600">{c.votes.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.votes / maxV) * 100}%`, background: c.color || "#94a3b8" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {top.length > 2 && (
        <div className="glass-card p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Vote Distribution</h4>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={top} dataKey="votes" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={1} stroke="none">
                  {top.map((c, i) => <Cell key={i} fill={c.color || "#94a3b8"} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => [Number(v).toLocaleString(), "Votes"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {shareArc.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Candidate Power Arc</h4>
          <p className="mb-3 text-[11px] text-slate-400">Radial intensity of candidate vote share in this constituency.</p>
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="mx-auto w-full" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={shareArc} innerRadius="20%" outerRadius="94%" startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, shareArcMax]} tick={false} />
                  <Tooltip
                    contentStyle={TT}
                    formatter={(value, _name, props) => {
                      const row = props?.payload as { votes?: number };
                      return [`${value}% (${fmt(row?.votes ?? 0)} votes)`, "Vote Share"];
                    }}
                  />
                  <RadialBar dataKey="share" background cornerRadius={8}>
                    {shareArc.map((candidate, idx) => (
                      <Cell key={`${candidate.id}-${idx}`} fill={candidate.color || "#94a3b8"} />
                    ))}
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {shareArc.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: candidate.color || "#94a3b8" }} />
                    <span className="text-xs font-semibold text-slate-700">{candidate.name}</span>
                    <span className="text-[10px] text-slate-400">({candidate.party})</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">{candidate.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.margin > 0 && data.totalVotes > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Competitiveness</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-slate-400">Margin %</p>
              <p className="text-lg font-black text-slate-900">{((data.margin / data.totalVotes) * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">{data.status === "won" ? "Winner's" : "Leader's"} Share</p>
              <p className="text-lg font-black text-slate-900">{data.leaderVotes > 0 ? ((data.leaderVotes / data.totalVotes) * 100).toFixed(1) : "—"}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Top-2 Combined</p>
              <p className="text-lg font-black text-slate-900">{(((data.leaderVotes + data.runnerUpVotes) / data.totalVotes) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ PARTY DETAIL ═══════════════ */

function PartyDetail({ party, onBack, onConstituency }: {
  party: PartyStanding; onBack: () => void; onConstituency: (d: number, c: number) => void;
}) {
  const [tab, setTab] = useState<"constituencies" | "provinces">("constituencies");
  const { sort: cSort, toggle: cToggle } = useTableSort<string>("votes");
  const [cSearch, setCSearch] = useState("");
  const provData = useMemo(() =>
    Object.entries(party.provinceWise)
      .map(([name, d]) => ({ name, wins: d.wins, leads: d.leads, total: d.wins + d.leads, votes: d.votes }))
      .sort((a, b) => b.total - a.total),
    [party.provinceWise],
  );
  const constituencyMomentum = useMemo(() => {
    return party.constituencies
      .filter((seat) => seat.totalVotes > 0)
      .map((seat) => {
        const marginPct = seat.totalVotes > 0 ? (seat.margin / seat.totalVotes) * 100 : 0;
        const color =
          seat.status === "won"
            ? party.color
            : seat.status === "leading"
              ? colorWithAlpha(party.color, 0.65)
              : "#94a3b8";
        return {
          ...seat,
          marginPct: Math.round(marginPct * 100) / 100,
          color,
        };
      });
  }, [party.constituencies, party.color]);
  const filteredC = useMemo(() => {
    const q = cSearch.toLowerCase();
    let rows = party.constituencies as PartyConstituency[];
    if (q) rows = rows.filter((c) => c.constituency.toLowerCase().includes(q) || c.leaderName.toLowerCase().includes(q) || c.district.toLowerCase().includes(q));
    return sortRows(rows, cSort.col, cSort.dir);
  }, [party.constituencies, cSearch, cSort]);
  const cPg = usePagination(filteredC, 20);

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600"><LeftOutlined className="text-[10px]" /> Back to Overview</button>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-md" style={{ backgroundColor: party.color, boxShadow: `0 6px 20px -4px ${party.color}50` }}>
          {party.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={party.logo} alt={party.party} className="h-10 w-10 object-contain" />
          ) : (
            <TeamOutlined className="text-2xl text-white" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">{party.party}</h3>
          <p className="text-sm text-slate-500">{party.totalSeats} total seats &middot; {fmt(party.totalVotes)} FPTP votes</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { l: "FPTP Won", v: party.fptpWins },
          { l: "FPTP Leading", v: party.fptpLeads },
          { l: "PR Seats", v: party.prSeats },
          { l: "Total Seats", v: party.totalSeats },
          { l: "PR Vote %", v: party.prVotePercent > 0 ? `${party.prVotePercent}%` : "—" },
        ].map((c) => (
          <div key={c.l} className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.l}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: party.color }}>{c.v}</p>
          </div>
        ))}
      </div>

      {/* Seat breakdown bar */}
      <div className="glass-card p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Seat Breakdown</h4>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex h-8 overflow-hidden rounded-lg">
              {party.fptpWins > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${(party.fptpWins / Math.max(party.totalSeats, 1)) * 100}%`, background: party.color }}>{party.fptpWins}</div>}
              {party.fptpLeads > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${(party.fptpLeads / Math.max(party.totalSeats, 1)) * 100}%`, background: party.color, opacity: 0.6 }}>{party.fptpLeads}</div>}
              {party.prSeats > 0 && <div className="flex items-center justify-center text-[10px] font-bold" style={{ width: `${(party.prSeats / Math.max(party.totalSeats, 1)) * 100}%`, background: party.color + "30", color: party.color }}>{party.prSeats}</div>}
            </div>
          </div>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: party.color }} /> Won</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: party.color, opacity: 0.6 }} /> Leading</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: party.color + "30" }} /> PR</span>
          </div>
        </div>
      </div>

      {/* Province performance chart */}
      {provData.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Province Performance</h4>
          <div style={{ height: Math.max(provData.length * 38, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provData} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="wins" stackId="a" fill={party.color} name="Won" />
                <Bar dataKey="leads" stackId="a" fill={party.color} opacity={0.5} name="Leading" radius={[0, 4, 4, 0]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {constituencyMomentum.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Constituency Momentum Field</h4>
          <p className="mb-3 text-[11px] text-slate-400">X-axis: victory/lead margin %, Y-axis: total constituency votes, bubble size: candidate votes.</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 4, right: 14, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  type="number"
                  dataKey="marginPct"
                  name="Margin %"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <YAxis
                  type="number"
                  dataKey="totalVotes"
                  name="Total Votes"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => fmt(Number(value))}
                />
                <ZAxis type="number" dataKey="votes" range={[80, 320]} />
                <Tooltip
                  contentStyle={TT}
                  formatter={(value, name, props) => {
                    const row = props?.payload as { totalVotes?: number; marginPct?: number; status?: string };
                    if (name === "marginPct") return [`${Number(value).toFixed(2)}%`, "Margin"];
                    return [`${fmt(Number(value))}`, row?.status === "won" ? "Winner Votes" : "Leader Votes"];
                  }}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as { constituency?: string };
                    return row?.constituency ?? "";
                  }}
                />
                <Scatter
                  data={constituencyMomentum}
                  cursor="pointer"
                  onClick={(entry) => {
                    const payload = (
                      entry as unknown as { payload?: { districtId?: number; constNumber?: number } }
                    ).payload;
                    if (payload?.districtId && payload?.constNumber) {
                      onConstituency(payload.districtId, payload.constNumber);
                    }
                  }}
                >
                  {constituencyMomentum.map((seat, idx) => (
                    <Cell key={`${seat.districtId}-${seat.constNumber}-${idx}`} fill={seat.color} stroke={seat.color} fillOpacity={0.8} strokeWidth={1.2} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50/50 p-1">
        {(["constituencies", "provinces"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "constituencies" ? `Constituencies (${party.constituencies.length})` : "By Province"}
          </button>
        ))}
      </div>

      {tab === "constituencies" && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-2">
            <TableSearch value={cSearch} onChange={setCSearch} placeholder="Search constituencies…" />
          </div>
          <Pagination page={cPg.page} totalPages={cPg.totalPages} onPageChange={cPg.setPage} totalItems={cPg.totalItems} pageSize={cPg.pageSize} onPageSizeChange={cPg.setPageSize} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Th col="constituency" sort={cSort} toggle={cToggle} className="px-5">Constituency</Th>
                  <Th col="leaderName" sort={cSort} toggle={cToggle} className="px-3">Candidate</Th>
                  <Th col="votes" sort={cSort} toggle={cToggle} className="px-3 text-right">Votes</Th>
                  <Th col="margin" sort={cSort} toggle={cToggle} className="px-3 text-right">Margin</Th>
                  <Th col="status" sort={cSort} toggle={cToggle} className="px-5 text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {cPg.pageItems.map((c) => (
                  <tr key={`${c.districtId}-${c.constNumber}`} className="cursor-pointer border-b border-slate-50 hover:bg-red-50/40" onClick={() => onConstituency(c.districtId, c.constNumber)}>
                    <td className="px-5 py-2.5"><span className="font-semibold text-red-600">{c.constituency}</span> <span className="text-[10px] text-slate-400">{c.district}</span></td>
                    <td className="px-3 py-2.5 text-slate-700">{c.leaderName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{c.votes.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500">{c.margin > 0 ? c.margin.toLocaleString() : "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "won" ? "bg-emerald-50 text-emerald-700" : c.status === "leading" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {c.status === "won" ? "Won" : c.status === "leading" ? "Leading" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "provinces" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {provData.map((p) => (
            <div key={p.name} className="glass-card p-4">
              <p className="text-xs font-bold text-slate-500">{p.name}</p>
              <p className="mt-1 text-xl font-black text-slate-900">{p.total} <span className="text-sm font-semibold text-slate-400">seats</span></p>
              <p className="text-[11px] text-slate-400">{p.wins} won &middot; {p.leads} leading &middot; {fmt(p.votes)} votes</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ PROVINCE DETAIL ═══════════════ */

function ProvinceDrillMap({
  province,
  onConstituency,
  initialSelectedDistrictId,
}: {
  province: ProvinceBreakdown;
  onConstituency: (d: number, c: number) => void;
  initialSelectedDistrictId?: number | null;
}) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(initialSelectedDistrictId ?? null);

  const districtVoteMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const c of province.constituencies) {
      map[c.districtId] = (map[c.districtId] || 0) + (c.totalVotes || 0);
    }
    return map;
  }, [province.constituencies]);

  const heatMax = useMemo(() => Math.max(0, ...Object.values(districtVoteMap)), [districtVoteMap]);

  const districtGroups = useMemo(() => {
    const groups = new Map<number, { districtId: number; district: string; constNumbers: number[] }>();
    for (const c of province.constituencies) {
      const existing = groups.get(c.districtId);
      if (!existing) {
        groups.set(c.districtId, {
          districtId: c.districtId,
          district: c.district,
          constNumbers: [c.constNumber],
        });
      } else if (!existing.constNumbers.includes(c.constNumber)) {
        existing.constNumbers.push(c.constNumber);
      }
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, constNumbers: g.constNumbers.sort((a, b) => a - b) }))
      .sort((a, b) => a.district.localeCompare(b.district));
  }, [province.constituencies]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h4 className="text-sm font-bold text-slate-900">Province Map Drill-down</h4>
        <p className="mt-0.5 text-[11px] text-slate-400">Heatmap by district votes. Click district, then constituency.</p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
          <span className="inline-block h-2 w-6 rounded-sm bg-[#dbeafe]" /> Low
          <span className="inline-block h-2 w-6 rounded-sm bg-[#60a5fa]" /> Medium
          <span className="inline-block h-2 w-6 rounded-sm bg-[#1d4ed8]" /> High
          <span className="ml-1 font-semibold">Peak: {fmt(heatMax)} votes</span>
        </div>
      </div>

      <InteractiveMap
        provinceId={province.provinceId}
        height={440}
        showProvinceBorders={false}
        showLabels
        showHeatmap
        districtValueMap={districtVoteMap}
        fitMaxZoom={11}
        fitPadding={[8, 8]}
        selectedDistrictId={selectedDistrictId}
        onDistrictClick={(districtId) => setSelectedDistrictId((prev) => (prev === districtId ? null : districtId))}
      />

      <div className="border-t border-slate-100 bg-slate-50/60 p-5">
        {!selectedDistrictId && (
          <p className="text-xs text-slate-500">Select a district on the map to see constituency links.</p>
        )}

        {selectedDistrictId && (() => {
          const district = districtGroups.find((d) => d.districtId === selectedDistrictId);
          if (!district) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-[11px] font-bold text-slate-700">{district.constNumbers.length}</span>
                <h5 className="text-sm font-bold text-slate-900">{district.district}</h5>
              </div>
              <div className="flex flex-wrap gap-2">
                {district.constNumbers.map((constNumber) => (
                  <button
                    key={constNumber}
                    onClick={() => onConstituency(district.districtId, constNumber)}
                    className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {constNumber}
                    </span>
                    {district.district}-{constNumber}
                    <RightOutlined className="text-[10px] text-slate-300 group-hover:text-red-500" />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function ProvinceDetail({ province, onBack, onConstituency, onParty, selectedDistrictId }: {
  province: ProvinceBreakdown; onBack: () => void;
  onConstituency: (d: number, c: number) => void; onParty: (p: string) => void;
  selectedDistrictId?: number | null;
}) {
  const partyChart = province.parties.slice(0, 10).map((p) => ({
    name: p.party, wins: p.wins, leads: p.leads, color: p.color,
  }));
  const { sort: pSort, toggle: pToggle } = useTableSort<string>("totalVotes");
  const [pSearch, setPSearch] = useState("");
  const matrixParties = useMemo(
    () =>
      province.parties
        .map((party) => ({ party: party.party, color: party.color, seats: party.wins + party.leads }))
        .sort((a, b) => b.seats - a.seats)
        .slice(0, 6),
    [province.parties]
  );
  const districtRivalry = useMemo(() => {
    const byDistrict = new Map<number, { districtId: number; district: string; firstConst: number; cells: Record<string, number> }>();
    for (const seat of province.constituencies) {
      const current = byDistrict.get(seat.districtId);
      if (!current) {
        const initialCells: Record<string, number> = {};
        if (seat.leaderParty) initialCells[seat.leaderParty] = 1;
        byDistrict.set(seat.districtId, {
          districtId: seat.districtId,
          district: seat.district,
          firstConst: seat.constNumber,
          cells: initialCells,
        });
      } else {
        current.firstConst = Math.min(current.firstConst, seat.constNumber);
        if (seat.leaderParty) current.cells[seat.leaderParty] = (current.cells[seat.leaderParty] ?? 0) + 1;
      }
    }

    return Array.from(byDistrict.values())
      .map((district) => ({
        ...district,
        totals: matrixParties.map((party) => ({ ...party, seats: district.cells[party.party] ?? 0 })),
      }))
      .sort((a, b) => a.district.localeCompare(b.district));
  }, [province.constituencies, matrixParties]);
  const matrixMax = useMemo(
    () => Math.max(...districtRivalry.flatMap((district) => district.totals.map((cell) => cell.seats)), 1),
    [districtRivalry]
  );
  const provFilteredC = useMemo(() => {
    const q = pSearch.toLowerCase();
    let rows = province.constituencies as ConstituencyData[];
    if (q) rows = rows.filter((c) => c.constituency.toLowerCase().includes(q) || (c.leaderName || "").toLowerCase().includes(q) || (c.leaderParty || "").toLowerCase().includes(q));
    return sortRows(rows, pSort.col, pSort.dir);
  }, [province.constituencies, pSearch, pSort]);
  const provCPg = usePagination(provFilteredC, 20);

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600"><LeftOutlined className="text-[10px]" /> Back to Overview</button>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
          <EnvironmentOutlined className="text-xl text-sky-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">{province.province}</h3>
          <p className="text-sm text-slate-500">{province.totalSeats} seats &middot; {province.declared} declared &middot; {fmt(province.totalVotes)} votes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Total Seats", v: province.totalSeats },
          { l: "Declared", v: province.declared },
          { l: "Still Counting", v: province.totalSeats - province.declared },
          { l: "Total Votes", v: fmt(province.totalVotes) },
        ].map((c) => (
          <div key={c.l} className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.l}</p>
            <p className="mt-1 text-xl font-black text-slate-900">{c.v}</p>
          </div>
        ))}
      </div>

      <ProvinceDrillMap
        key={`province-map-${province.provinceId}-${selectedDistrictId ?? "none"}`}
        province={province}
        onConstituency={onConstituency}
        initialSelectedDistrictId={selectedDistrictId}
      />

      {/* Party chart */}
      {partyChart.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Party Performance</h4>
          <div style={{ height: Math.max(partyChart.length * 36, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partyChart} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="wins" stackId="a" name="Won">{partyChart.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
                <Bar dataKey="leads" stackId="a" name="Leading" opacity={0.5} radius={[0, 4, 4, 0]}>{partyChart.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {districtRivalry.length > 0 && matrixParties.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">District Rivalry Matrix</h4>
          <p className="mb-3 text-[11px] text-slate-400">Rows are districts, columns are top parties. Stronger color means higher seat grip.</p>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2">District</th>
                  {matrixParties.map((party) => (
                    <th key={party.party} className="px-2 py-2 text-center">
                      <button onClick={() => onParty(party.party)} className="rounded-md px-2 py-1 hover:bg-slate-100">
                        {party.party}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {districtRivalry.map((district) => (
                  <tr key={district.districtId} className="border-t border-slate-100">
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => onConstituency(district.districtId, district.firstConst)}
                        className="font-semibold text-slate-700 hover:text-red-600"
                      >
                        {district.district}
                      </button>
                    </td>
                    {district.totals.map((cell) => {
                      const strength = cell.seats / matrixMax;
                      const bg = cell.seats > 0 ? colorWithAlpha(cell.color, 0.15 + strength * 0.55) : "rgba(148,163,184,0.08)";
                      const border = cell.seats > 0 ? colorWithAlpha(cell.color, 0.35 + strength * 0.45) : "rgba(148,163,184,0.18)";
                      return (
                        <td key={`${district.districtId}-${cell.party}`} className="px-2 py-2 text-center">
                          <button
                            onClick={() => (cell.seats > 0 ? onParty(cell.party) : null)}
                            className="w-14 rounded-lg border px-1 py-1.5 text-xs font-bold text-slate-700"
                            style={{ backgroundColor: bg, borderColor: border }}
                            title={`${district.district} · ${cell.party}: ${cell.seats} seats`}
                          >
                            {cell.seats > 0 ? cell.seats : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clickable party list */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 pb-2"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Parties</h4></div>
        <div className="divide-y divide-slate-50">
          {province.parties.map((p) => (
            <button key={p.party} onClick={() => onParty(p.party)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-red-50/40">
              <span className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="font-semibold text-slate-800">{p.party}</span>
              </span>
              <span className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">{p.wins} won &middot; {p.leads} lead</span>
                <RightOutlined className="text-[9px] text-slate-300" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Constituency table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">All Constituencies ({province.constituencies.length})</h4>
          <TableSearch value={pSearch} onChange={setPSearch} placeholder="Search constituencies…" />
        </div>
        <Pagination page={provCPg.page} totalPages={provCPg.totalPages} onPageChange={provCPg.setPage} totalItems={provCPg.totalItems} pageSize={provCPg.pageSize} onPageSizeChange={provCPg.setPageSize} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Th col="constituency" sort={pSort} toggle={pToggle} className="px-5">Constituency</Th>
                <Th col="leaderName" sort={pSort} toggle={pToggle} className="px-3">Leading/Winner</Th>
                <Th col="leaderParty" sort={pSort} toggle={pToggle} className="px-3">Party</Th>
                <Th col="totalVotes" sort={pSort} toggle={pToggle} className="px-3 text-right">Votes</Th>
                <Th col="margin" sort={pSort} toggle={pToggle} className="px-3 text-right">Margin</Th>
                <Th col="status" sort={pSort} toggle={pToggle} className="px-5 text-right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {provCPg.pageItems.map((c) => (
                  <tr key={`${c.districtId}-${c.constNumber}`} className="cursor-pointer border-b border-slate-50 hover:bg-red-50/40" onClick={() => onConstituency(c.districtId, c.constNumber)}>
                    <td className="px-5 py-2.5"><span className="font-semibold text-red-600">{c.constituency}</span></td>
                    <td className="px-3 py-2.5 text-slate-700">{c.leaderName || "—"}</td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c.leaderPartyColor || "#94a3b8" }} /><span className="text-slate-600">{c.leaderParty || "—"}</span></span></td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{c.totalVotes > 0 ? c.totalVotes.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500">{c.margin > 0 ? c.margin.toLocaleString() : "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "won" ? "bg-emerald-50 text-emerald-700" : c.status === "leading" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {c.status === "won" ? "Won" : c.status === "leading" ? "Counting" : "Pending"}
                      </span>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ OVERVIEW COMPONENTS ═══════════════ */

function OverviewCards({ data }: { data: Overview }) {
  const cards = [
    { label: "Total Seats", value: data.totalFPTP + data.totalPR, sub: `${data.totalFPTP} FPTP + ${data.totalPR} PR` },
    { label: "Results Declared", value: data.declared, sub: `of ${data.totalFPTP} FPTP seats` },
    { label: "Still Counting", value: data.counting, sub: data.pending > 0 ? `${data.pending} pending` : "All counted" },
    { label: "Total Votes", value: fmt(data.totalVotesCast), sub: "across all constituencies" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{c.value}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function SeatShareChart({ parties, onParty }: { parties: PartyStanding[]; onParty: (p: string) => void }) {
  const data = parties.slice(0, 10).map((p) => ({ name: p.party, fptp: p.fptpWins + p.fptpLeads, pr: p.prSeats, color: p.color }));
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Party Seat Distribution</h3>
      <p className="mt-1 text-[11px] text-slate-400">Click a party to drill down</p>
      <div className="mt-4" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            onClick={(state) => { if (state?.activeLabel) onParty(String(state.activeLabel)); }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT} formatter={(value, name) => [String(value), name === "fptp" ? "FPTP" : "PR"]} cursor={{ fill: "rgba(234,67,53,0.06)" }} />
            <Bar dataKey="fptp" stackId="a" name="FPTP" cursor="pointer">{data.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
            <Bar dataKey="pr" stackId="a" name="PR" opacity={0.5} radius={[0, 4, 4, 0]} cursor="pointer">{data.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VoteShareChart({ data, onParty }: { data: VoteDistItem[]; onParty: (p: string) => void }) {
  const top8 = data.slice(0, 8);
  const othersVotes = data.slice(8).reduce((s, d) => s + d.votes, 0);
  const othersPct = data.slice(8).reduce((s, d) => s + d.percentage, 0);
  const barData = [
    ...top8,
    ...(othersVotes > 0 ? [{ party: "Others", color: "#cbd5e1", votes: othersVotes, percentage: Math.round(othersPct * 100) / 100 }] : []),
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vote Share</h3>
      <p className="mt-1 text-[11px] text-slate-400">Total candidate votes across all constituencies</p>
      <div className="mt-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            onClick={(state) => { const label = state?.activeLabel; if (label && label !== "Others") onParty(String(label)); }}>
            <XAxis dataKey="party" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={TT} formatter={(v, _name, props) => {
              const item = props?.payload;
              return [`${fmt(item?.votes ?? Number(v))} (${item?.percentage ?? 0}%)`, "Votes"];
            }} />
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} cursor="pointer">
              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const PROV_COLORS = ["#dc6b5a", "#5ba4be", "#6aab5a", "#d48a3a", "#8a7ab8", "#c9a63a", "#e07070"];

function ProvinceCards({ provinces, onProvince }: { provinces: ProvinceBreakdown[]; onProvince: (id: number) => void }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Provinces</h3>
      <p className="mt-1 text-[11px] text-slate-400">Click a province to explore constituencies</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {provinces.map((p, i) => {
          const top = p.parties[0];
          return (
            <button key={p.provinceId} onClick={() => onProvince(p.provinceId)}
              className="group rounded-2xl border border-slate-100 bg-white/60 p-4 text-left transition-all hover:border-slate-200 hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PROV_COLORS[i] || "#64748b" }}>Province {p.provinceId}</span>
                <RightOutlined className="text-[9px] text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-sm font-bold text-slate-900">{p.province}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{p.declared}/{p.totalSeats} declared</p>
              {top && (
                <div className="mt-2 flex items-center gap-1 text-[10px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: top.color }} />
                  <span className="text-slate-500">{top.party}: {top.wins}W {top.leads}L</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TurnoutChart({ data, onProvince }: { data: TurnoutItem[]; onProvince: (id: number) => void }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Votes by Province</h3>
      <p className="mt-1 text-[11px] text-slate-400">Click a bar to explore that province</p>
      <div className="mt-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}
            onClick={(state) => { const m = data.find((d) => d.province === state?.activeLabel); if (m) onProvince(m.provinceId); }}>
            <defs>
              <linearGradient id="turnoutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ea4335" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ea4335" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="province" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
            <Tooltip contentStyle={TT} formatter={(value, name) => [Number(value).toLocaleString(), name === "totalVotes" ? "Total Votes" : "Avg/Constituency"]} />
            <Area type="monotone" dataKey="totalVotes" stroke="#ea4335" strokeWidth={2} fill="url(#turnoutGrad)" name="totalVotes" cursor="pointer" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface MomentumPoint {
  party: string;
  votes: number;
  seats: number;
  voteShare: number;
  seatShare: number;
  efficiency: number;
  color: string;
}

function PartyMomentumBubble({ parties, onParty }: { parties: PartyStanding[]; onParty: (p: string) => void }) {
  const points = useMemo<MomentumPoint[]>(() => {
    const totalVotes = parties.reduce((sum, p) => sum + p.totalVotes, 0);
    const totalSeats = parties.reduce((sum, p) => sum + p.totalSeats, 0);
    return parties
      .filter((p) => p.totalVotes > 0 || p.totalSeats > 0)
      .map((p) => {
        const voteShare = totalVotes > 0 ? (p.totalVotes / totalVotes) * 100 : 0;
        const seatShare = totalSeats > 0 ? (p.totalSeats / totalSeats) * 100 : 0;
        const efficiency = voteShare > 0 ? seatShare / voteShare : 0;
        return {
          party: p.party,
          votes: p.totalVotes,
          seats: p.totalSeats,
          voteShare: Math.round(voteShare * 100) / 100,
          seatShare: Math.round(seatShare * 100) / 100,
          efficiency: Math.round(efficiency * 100) / 100,
          color: p.color,
        };
      })
      .sort((a, b) => b.seats - a.seats)
      .slice(0, 12);
  }, [parties]);

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Momentum Bubble Map</h3>
      <p className="mt-1 text-[11px] text-slate-400">Votes vs seats with bubble size by vote share. Click bubble for party drill-down.</p>
      <div className="mt-4" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 4, right: 14, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              type="number"
              dataKey="votes"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmt(Number(v))}
              name="Votes"
            />
            <YAxis
              type="number"
              dataKey="seats"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              name="Seats"
            />
            <ZAxis type="number" dataKey="voteShare" range={[110, 420]} name="Vote Share" unit="%" />
            <Tooltip
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as MomentumPoint;
                return (
                  <div style={TT} className="space-y-1 px-3 py-2">
                    <p className="text-xs font-bold text-slate-900">{point.party}</p>
                    <p className="text-[11px] text-slate-600">Votes: {point.votes.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-600">Seats: {point.seats.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-600">Vote share: {point.voteShare}%</p>
                    <p className="text-[11px] text-slate-600">Seat efficiency: {point.efficiency}x</p>
                  </div>
                );
              }}
            />
            <Scatter
              data={points}
              onClick={(entry) => {
                const payload = (
                  entry as unknown as { payload?: { party?: string } }
                ).payload;
                const party = payload?.party;
                if (party) onParty(party);
              }}
              cursor="pointer"
            >
              {points.map((point, idx) => (
                <Cell key={`${point.party}-${idx}`} fill={point.color} fillOpacity={0.78} stroke={point.color} strokeWidth={1.2} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompetitivenessRadial({ provinces }: { provinces: ProvinceBreakdown[] }) {
  const bands = useMemo(() => {
    const settled = provinces
      .flatMap((province) => province.constituencies)
      .filter((seat) => seat.totalVotes > 0 && seat.margin > 0);

    const defs = [
      { key: "Knife-edge ≤2%", min: 0, max: 2, fill: "#ef4444" },
      { key: "Tight 2-5%", min: 2, max: 5, fill: "#f59e0b" },
      { key: "Clear 5-10%", min: 5, max: 10, fill: "#22c55e" },
      { key: "Dominant >10%", min: 10, max: Infinity, fill: "#2563eb" },
    ];

    const values = defs.map((def) => {
      const count = settled.filter((seat) => {
        const pct = (seat.margin / Math.max(seat.totalVotes, 1)) * 100;
        return pct > def.min && pct <= def.max;
      }).length;
      const percentage = settled.length > 0 ? (count / settled.length) * 100 : 0;
      return {
        label: def.key,
        count,
        percentage: Math.round(percentage * 10) / 10,
        fill: def.fill,
      };
    });

    return { values, total: settled.length, max: Math.max(...values.map((v) => v.count), 1) };
  }, [provinces]);

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Competitiveness Spectrum</h3>
      <p className="mt-1 text-[11px] text-slate-400">How decisive declared races are, grouped by margin percentage.</p>
      <div className="mt-2 text-[11px] font-semibold text-slate-500">Declared seats with margin: {bands.total}</div>
      <div className="mt-3" style={{ height: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={bands.values} innerRadius="18%" outerRadius="95%" startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, bands.max]} tick={false} />
            <Tooltip
              contentStyle={TT}
              formatter={(value, _name, props) => {
                const item = props?.payload as { percentage?: number };
                return [`${value} seats (${item?.percentage ?? 0}%)`, "Count"];
              }}
            />
            <RadialBar dataKey="count" background cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {bands.values.map((band) => (
          <div key={band.label} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: band.fill }} />
              <span className="font-semibold text-slate-700">{band.label}</span>
            </div>
            <p className="mt-0.5 text-slate-500">{band.count} seats · {band.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProvincePartyHeatMatrix({
  provinces,
  parties,
  onParty,
  onProvince,
}: {
  provinces: ProvinceBreakdown[];
  parties: PartyStanding[];
  onParty: (p: string) => void;
  onProvince: (id: number) => void;
}) {
  const topParties = useMemo(
    () =>
      parties
        .filter((party) => party.totalSeats > 0 || party.totalVotes > 0)
        .sort((a, b) => b.totalSeats - a.totalSeats || b.totalVotes - a.totalVotes)
        .slice(0, 7)
        .map((party) => ({ party: party.party, color: party.color })),
    [parties]
  );

  const matrix = useMemo(() => {
    return provinces.map((province) => {
      const seatMap = new Map(province.parties.map((item) => [item.party, item.wins + item.leads]));
      return {
        provinceId: province.provinceId,
        province: province.province,
        cells: topParties.map((topParty) => ({
          ...topParty,
          seats: seatMap.get(topParty.party) ?? 0,
        })),
      };
    });
  }, [provinces, topParties]);

  const maxCell = useMemo(
    () => Math.max(...matrix.flatMap((row) => row.cells.map((cell) => cell.seats)), 1),
    [matrix]
  );

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Province x Party Control Matrix</h3>
      <p className="mt-1 text-[11px] text-slate-400">Higher intensity means stronger seat control in that province.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[720px] text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-2 py-2">Province</th>
              {topParties.map((party) => (
                <th key={party.party} className="px-2 py-2 text-center">
                  <button onClick={() => onParty(party.party)} className="rounded-md px-1.5 py-1 hover:bg-slate-100">
                    {party.party}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.provinceId} className="border-t border-slate-100">
                <td className="px-2 py-2.5">
                  <button onClick={() => onProvince(row.provinceId)} className="font-semibold text-slate-700 hover:text-red-600">
                    {row.province}
                  </button>
                </td>
                {row.cells.map((cell) => {
                  const intensity = cell.seats / maxCell;
                  const bg = cell.seats > 0 ? colorWithAlpha(cell.color, 0.14 + intensity * 0.52) : "rgba(148,163,184,0.08)";
                  const border = cell.seats > 0 ? colorWithAlpha(cell.color, 0.32 + intensity * 0.5) : "rgba(148,163,184,0.18)";
                  return (
                    <td key={`${row.provinceId}-${cell.party}`} className="px-2 py-2 text-center">
                      <button
                        onClick={() => (cell.seats > 0 ? onParty(cell.party) : onProvince(row.provinceId))}
                        className="w-14 rounded-lg border px-1 py-1.5 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5"
                        style={{ backgroundColor: bg, borderColor: border }}
                        title={`${row.province} · ${cell.party}: ${cell.seats} seats`}
                      >
                        {cell.seats > 0 ? cell.seats : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CLink({ name, dId, cN, go }: { name: string; dId: number; cN: number; go: (d: number, c: number) => void }) {
  return <button onClick={() => go(dId, cN)} className="font-semibold text-red-600 hover:text-red-800 hover:underline">{name}</button>;
}

function RacesTable({ races, onC }: { races: RaceItem[]; onC: (d: number, c: number) => void }) {
  const { sort, toggle } = useTableSort<string>("margin", "asc");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = races;
    if (q) rows = rows.filter((r) => r.constituency.toLowerCase().includes(q) || r.leader.toLowerCase().includes(q) || r.runnerUp.toLowerCase().includes(q) || r.leaderParty.toLowerCase().includes(q));
    return sortRows(rows, sort.col, sort.dir);
  }, [races, search, sort]);
  const pg = usePagination(filtered, 20);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 pb-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Closest Races</h3>
          <p className="mt-1 text-[11px] text-slate-400">Click any constituency for candidate breakdown</p>
        </div>
        <TableSearch value={search} onChange={setSearch} />
      </div>
      <Pagination page={pg.page} totalPages={pg.totalPages} onPageChange={pg.setPage} totalItems={pg.totalItems} pageSize={pg.pageSize} onPageSizeChange={pg.setPageSize} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Th col="constituency" sort={sort} toggle={toggle} className="px-5">Constituency</Th>
              <Th col="leader" sort={sort} toggle={toggle} className="px-3">Leader</Th>
              <Th col="leaderVotes" sort={sort} toggle={toggle} className="px-3 text-right">Votes</Th>
              <Th col="runnerUp" sort={sort} toggle={toggle} className="px-3">Runner-Up</Th>
              <Th col="runnerUpVotes" sort={sort} toggle={toggle} className="px-3 text-right">Votes</Th>
              <Th col="margin" sort={sort} toggle={toggle} className="px-5 text-right">Margin</Th>
            </tr>
          </thead>
          <tbody>
            {pg.pageItems.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5"><CLink name={r.constituency} dId={r.districtId} cN={r.constNumber} go={onC} /> <span className="text-[10px] text-slate-400">{r.district}</span></td>
                <td className="px-3 py-2.5"><span className="font-medium text-slate-700">{r.leader}</span> <span className="text-[10px] text-slate-400">({r.leaderParty})</span></td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-600">{r.leaderVotes.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-medium text-slate-600">{r.runnerUp}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-600">{r.runnerUpVotes.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right"><span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{r.margin.toLocaleString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarginsTable({ margins, onC }: { margins: MarginItem[]; onC: (d: number, c: number) => void }) {
  const { sort, toggle } = useTableSort<string>("margin");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = margins;
    if (q) rows = rows.filter((r) => r.constituency.toLowerCase().includes(q) || r.winner.toLowerCase().includes(q) || r.winnerParty.toLowerCase().includes(q));
    return sortRows(rows, sort.col, sort.dir);
  }, [margins, search, sort]);
  const pg = usePagination(filtered, 20);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 pb-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Biggest Victories</h3>
          <p className="mt-1 text-[11px] text-slate-400">Click any constituency for full analysis</p>
        </div>
        <TableSearch value={search} onChange={setSearch} />
      </div>
      <Pagination page={pg.page} totalPages={pg.totalPages} onPageChange={pg.setPage} totalItems={pg.totalItems} pageSize={pg.pageSize} onPageSizeChange={pg.setPageSize} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Th col="constituency" sort={sort} toggle={toggle} className="px-5">Constituency</Th>
              <Th col="winner" sort={sort} toggle={toggle} className="px-3">Winner</Th>
              <Th col="winnerParty" sort={sort} toggle={toggle} className="px-3">Party</Th>
              <Th col="winnerVotes" sort={sort} toggle={toggle} className="px-3 text-right">Votes</Th>
              <Th col="margin" sort={sort} toggle={toggle} className="px-5 text-right">Margin</Th>
            </tr>
          </thead>
          <tbody>
            {pg.pageItems.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5"><CLink name={r.constituency} dId={r.districtId} cN={r.constNumber} go={onC} /> <span className="text-[10px] text-slate-400">{r.district}</span></td>
                <td className="px-3 py-2.5 font-medium text-slate-700">{r.winner}</td>
                <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: r.winnerPartyColor }} /><span className="text-slate-600">{r.winnerParty}</span></span></td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-600">{r.winnerVotes.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right"><span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">+{r.margin.toLocaleString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartyStandingsTable({ parties, onParty }: { parties: PartyStanding[]; onParty: (p: string) => void }) {
  const { sort, toggle } = useTableSort<string>("totalSeats");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = parties.filter((p) => p.totalSeats > 0 || p.totalVotes > 0);
    if (q) rows = rows.filter((p) => p.party.toLowerCase().includes(q));
    return sortRows(rows, sort.col, sort.dir);
  }, [parties, search, sort]);
  const pg = usePagination(filtered, 20);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 pb-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Party Standings</h3>
          <p className="mt-1 text-[11px] text-slate-400">Click any party for detailed constituency breakdown</p>
        </div>
        <TableSearch value={search} onChange={setSearch} placeholder="Search parties…" />
      </div>
      <Pagination page={pg.page} totalPages={pg.totalPages} onPageChange={pg.setPage} totalItems={pg.totalItems} pageSize={pg.pageSize} onPageSizeChange={pg.setPageSize} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="w-8 px-5 py-2.5">#</th>
              <Th col="party" sort={sort} toggle={toggle} className="px-3">Party</Th>
              <Th col="fptpWins" sort={sort} toggle={toggle} className="px-3 text-right">FPTP Won</Th>
              <Th col="fptpLeads" sort={sort} toggle={toggle} className="px-3 text-right">FPTP Lead</Th>
              <Th col="prSeats" sort={sort} toggle={toggle} className="px-3 text-right">PR Seats</Th>
              <Th col="totalSeats" sort={sort} toggle={toggle} className="px-3 text-right">Total</Th>
              <Th col="totalVotes" sort={sort} toggle={toggle} className="px-5 text-right">Votes</Th>
            </tr>
          </thead>
          <tbody>
            {pg.pageItems.map((p, i) => (
              <tr key={p.party} className="cursor-pointer border-b border-slate-50 hover:bg-red-50/40" onClick={() => onParty(p.party)}>
                <td className="px-5 py-3 text-slate-400">{(pg.page - 1) * pg.pageSize + i + 1}</td>
                <td className="px-3 py-3"><span className="inline-flex items-center gap-2">{p.logo ? <img src={p.logo} alt={p.party} className="h-5 w-5 rounded object-contain" /> : <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />}<span className="font-semibold text-red-600">{p.party}</span></span></td>
                <td className="px-3 py-3 text-right font-mono text-slate-700">{p.fptpWins}</td>
                <td className="px-3 py-3 text-right font-mono text-slate-500">{p.fptpLeads}</td>
                <td className="px-3 py-3 text-right font-mono text-slate-500">{p.prSeats}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{p.totalSeats}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-500">{fmt(p.totalVotes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */

function viewToUrl(v: DrillView, data: AnalyticsData | null): string {
  if (v.type === "party") return `/analytics?view=party&name=${encodeURIComponent(v.party)}`;
  if (v.type === "province") return `/analytics?view=province&id=${v.provinceId}`;
  if (v.type === "constituency") {
    if (data) {
      for (const prov of data.provinceBreakdown) {
        const c = prov.constituencies.find((con) => con.districtId === v.districtId && con.constNumber === v.constNumber);
        if (c) return `/analytics?view=constituency&id=${c.constituencySlug}`;
      }
    }
    return `/analytics?view=constituency&id=${v.districtId}-${v.constNumber}`;
  }
  return "/analytics";
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageTemplate><div className="flex items-center justify-center py-24"><Spin size="large" /></div></PageTemplate>}>
      <AnalyticsPageInner />
    </Suspense>
  );
}

function AnalyticsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { parties: ctxParties } = useElectionData();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DrillView>({ type: "overview" });
  const [, setHistory] = useState<DrillView[]>([]);
  const [selectedProvinceDistrictId, setSelectedProvinceDistrictId] = useState<number | null>(null);
  const [constituencyOverride, setConstituencyOverride] = useState<ConstituencyData | null>(null);
  const [initialQuery] = useState(() => ({
    view: searchParams.get("view"),
    name: searchParams.get("name"),
    id: searchParams.get("id"),
    district: searchParams.get("district"),
  }));

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    (async () => {
      try {
        const res = await fetch("/api/analytics", { signal: controller.signal, cache: CLIENT_FETCH_CACHE });
        if (!res.ok) throw new Error(`Analytics request failed (${res.status})`);
        const json = await res.json();
        if (!active) return;
        if (json.success) {
          const payload = json.data as AnalyticsData;
          setData(payload);
          setError(null);

          const viewParam = initialQuery.view;
          if (viewParam === "party") {
            const name = initialQuery.name;
            if (name && payload.partyStandings.some((party) => party.party === name)) {
              setView({ type: "party", party: name });
            }
          } else if (viewParam === "province") {
            const provinceId = Number(initialQuery.id);
            if (provinceId && payload.provinceBreakdown.some((province) => province.provinceId === provinceId)) {
              setView({ type: "province", provinceId });
              const districtId = Number(initialQuery.district);
              setSelectedProvinceDistrictId(Number.isFinite(districtId) && districtId > 0 ? districtId : null);
            }
          } else if (viewParam === "constituency") {
            const slug = initialQuery.id || "";
            for (const province of payload.provinceBreakdown) {
              const constituency = province.constituencies.find((item) => item.constituencySlug === slug);
              if (constituency) {
                setView({
                  type: "constituency",
                  districtId: constituency.districtId,
                  constNumber: constituency.constNumber,
                });
                break;
              }
            }
          }
        } else {
          setError("Analytics data could not be loaded.");
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error && err.name === "AbortError"
            ? "Analytics request timed out."
            : "Analytics data could not be loaded."
        );
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [initialQuery]);

  // Apply correct party colors and logos from context data
  const correctedData = useMemo(() => {
    if (!data || ctxParties.length === 0) return data;
    const colorMap = new Map(ctxParties.map((p) => [p.shortName, { color: p.color, logo: p.logo }]));
    // Deep-clone so we don't mutate cached state
    const d = JSON.parse(JSON.stringify(data)) as AnalyticsData;
    for (const ps of d.partyStandings) {
      const meta = colorMap.get(ps.party);
      if (meta) { ps.color = meta.color; ps.logo = meta.logo; }
    }
    for (const prov of d.provinceBreakdown) {
      for (const pp of prov.parties) {
        const meta = colorMap.get(pp.party);
        if (meta) pp.color = meta.color;
      }
      for (const c of prov.constituencies) {
        const meta = colorMap.get(c.leaderParty);
        if (meta) c.leaderPartyColor = meta.color;
      }
    }
    for (const r of d.closestRaces) {
      const meta = colorMap.get(r.leaderParty);
      if (meta) r.leaderPartyColor = meta.color;
    }
    for (const m of d.biggestMargins) {
      const meta = colorMap.get(m.winnerParty);
      if (meta) m.winnerPartyColor = meta.color;
    }
    for (const v of d.voteDistribution) {
      const meta = colorMap.get(v.party);
      if (meta) v.color = meta.color;
    }
    return d;
  }, [data, ctxParties]);

  const navigate = useCallback((next: DrillView) => {
    setHistory((h) => [...h, view]);
    setView(next);
    if (next.type !== "province") setSelectedProvinceDistrictId(null);
    router.replace(viewToUrl(next, data), { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, data, router]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop() || { type: "overview" as const };
      setView(prev);
      router.replace(viewToUrl(prev, data), { scroll: false });
      return copy;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [data, router]);

  const onC = useCallback((d: number, c: number) => navigate({ type: "constituency", districtId: d, constNumber: c }), [navigate]);
  const onParty = useCallback((p: string) => navigate({ type: "party", party: p }), [navigate]);
  const onProvince = useCallback((id: number) => {
    setSelectedProvinceDistrictId(null);
    navigate({ type: "province", provinceId: id });
  }, [navigate]);
  const onDistrictFromConstituency = useCallback((districtId: number, provinceId: number) => {
    if (!correctedData) {
      setHistory((h) => [...h, view]);
      setSelectedProvinceDistrictId(districtId);
      setView({ type: "province", provinceId });
      router.replace(`/analytics?view=province&id=${provinceId}&district=${districtId}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const inDistrict = correctedData.provinceBreakdown
      .flatMap((p) => p.constituencies)
      .filter((c) => c.districtId === districtId)
      .sort((a, b) => a.constNumber - b.constNumber);

    // If the district has exactly one constituency, go directly there.
    if (inDistrict.length === 1) {
      const only = inDistrict[0];
      navigate({ type: "constituency", districtId: only.districtId, constNumber: only.constNumber });
      return;
    }

    // Otherwise keep province drill-down with district selected.
    setHistory((h) => [...h, view]);
    setSelectedProvinceDistrictId(districtId);
    setView({ type: "province", provinceId });
    router.replace(`/analytics?view=province&id=${provinceId}&district=${districtId}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [correctedData, view, router, navigate]);

  const findConstituency = useCallback((source: AnalyticsData | null, d: number, c: number): ConstituencyData | null => {
    if (!source) return null;
    for (const prov of source.provinceBreakdown) {
      const match = prov.constituencies.find((con) => con.districtId === d && con.constNumber === c);
      if (match) return match;
    }
    return null;
  }, []);

  useEffect(() => {
    if (view.type !== "constituency") return;

    let active = true;
    const fallback = findConstituency(correctedData, view.districtId, view.constNumber);

    (async () => {
      try {
        const res = await fetch(`/api/constituency?district=${view.districtId}&const=${view.constNumber}`);
        const json = await res.json();
        if (!active || !json.success || !json.data) return;

        const candidates = Array.isArray(json.data.candidates)
          ? json.data.candidates.map((candidate: {
              id: string;
              name: string;
              partyShortName: string;
              partyColor: string;
              votes: number;
              status: string;
              photo?: string;
            }) => ({
              id: candidate.id,
              name: candidate.name,
              party: candidate.partyShortName,
              color: candidate.partyColor,
              votes: Number(candidate.votes || 0),
              status: candidate.status,
              photo: candidate.photo,
            }))
          : [];

        const leader = candidates[0];
        const runnerUp = candidates[1];
        const countingStatus = String(json.data.countingStatus || "").toLowerCase();
        const status =
          leader?.status ||
          (countingStatus.includes("declared")
            ? "won"
            : countingStatus.includes("progress")
              ? "leading"
              : "pending");

        setConstituencyOverride({
          districtId: Number(json.data.districtId),
          constNumber: Number(json.data.constNumber),
          constituencySlug: String(json.data.constituencySlug || fallback?.constituencySlug || `${view.districtId}-${view.constNumber}`),
          constituency: String(json.data.constituency || fallback?.constituency || "Constituency"),
          district: fallback?.district || "",
          provinceId: Number(json.data.provinceId || fallback?.provinceId || 0),
          province: String(json.data.province || fallback?.province || ""),
          leaderName: leader?.name || fallback?.leaderName || "",
          leaderParty: leader?.party || fallback?.leaderParty || "",
          leaderPartyColor: leader?.color || fallback?.leaderPartyColor || "#94a3b8",
          leaderVotes: leader?.votes || fallback?.leaderVotes || 0,
          runnerUpName: runnerUp?.name || fallback?.runnerUpName || "",
          runnerUpVotes: runnerUp?.votes || fallback?.runnerUpVotes || 0,
          margin:
            leader && runnerUp
              ? leader.votes - runnerUp.votes
              : fallback?.margin || 0,
          totalVotes: Number(json.data.totalVotes || fallback?.totalVotes || 0),
          status,
          candidates,
        });
      } catch { /* */ }
    })();

    return () => {
      active = false;
    };
  }, [view, correctedData, findConstituency]);

  const displayedConstituency = useMemo(() => {
    if (view.type !== "constituency") return null;
    if (
      constituencyOverride &&
      constituencyOverride.districtId === view.districtId &&
      constituencyOverride.constNumber === view.constNumber
    ) {
      return constituencyOverride;
    }
    return (
      findConstituency(correctedData, view.districtId, view.constNumber)
    );
  }, [view, constituencyOverride, correctedData, findConstituency]);

  const breadcrumb = useMemo(() => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "Analytics", onClick: view.type !== "overview" ? () => { setView({ type: "overview" }); setHistory([]); } : undefined },
    ];
    if (view.type === "party") parts.push({ label: view.party });
    if (view.type === "province") {
      const p = correctedData?.provinceBreakdown.find((pb) => pb.provinceId === view.provinceId);
      parts.push({ label: p?.province || `Province ${view.provinceId}` });
    }
    if (view.type === "constituency") {
      const c = displayedConstituency;
      if (c) parts.push({ label: c.constituency });
    }
    return parts;
  }, [view, correctedData, displayedConstituency]);

  return (
    <PageTemplate>
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {b.onClick ? <button onClick={b.onClick} className="font-semibold hover:text-red-600">{b.label}</button> : <span className="font-semibold text-slate-600">{b.label}</span>}
            </React.Fragment>
          ))}
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          {view.type === "overview" && "Analytics"}
          {view.type === "party" && (() => {
            const ps = correctedData?.partyStandings.find((p) => p.party === (view as { party: string }).party);
            return (
              <span className="inline-flex items-center gap-3">
                {ps?.logo && <img src={ps.logo} alt={ps.party} className="h-8 w-8 rounded-xl object-contain" />}
                {(view as { party: string }).party}
              </span>
            );
          })()}
          {view.type === "province" && (correctedData?.provinceBreakdown.find((p) => p.provinceId === (view as { provinceId: number }).provinceId)?.province || "Province")}
          {view.type === "constituency" && (displayedConstituency?.constituency || "Constituency")}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {view.type === "overview" && "Deep data analysis and insights from Nepal Election 2082"}
          {view.type === "party" && "Constituency-level breakdown and province performance"}
          {view.type === "province" && "District-level results and party competition"}
          {view.type === "constituency" && "Candidate results, vote distribution, and competitiveness"}
        </p>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><Spin size="large" /></div>}

      {!loading && error && !correctedData && (
        <div className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <p className="mt-1 text-xs text-red-500">Refresh the page or retry after the API stabilizes.</p>
        </div>
      )}

      {correctedData && view.type === "overview" && (
        <div className="space-y-6">
          <OverviewCards data={correctedData.overview} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SeatShareChart parties={correctedData.partyStandings} onParty={onParty} />
            <VoteShareChart data={correctedData.voteDistribution} onParty={onParty} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TurnoutChart data={correctedData.turnoutByProvince} onProvince={onProvince} />
            <ProvinceCards provinces={correctedData.provinceBreakdown} onProvince={onProvince} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <PartyMomentumBubble parties={correctedData.partyStandings} onParty={onParty} />
            <CompetitivenessRadial provinces={correctedData.provinceBreakdown} />
          </div>
          <ProvincePartyHeatMatrix
            provinces={correctedData.provinceBreakdown}
            parties={correctedData.partyStandings}
            onParty={onParty}
            onProvince={onProvince}
          />
          <PartyStandingsTable parties={correctedData.partyStandings} onParty={onParty} />
          <div className="grid gap-6 xl:grid-cols-2">
            <RacesTable races={correctedData.closestRaces} onC={onC} />
            <MarginsTable margins={correctedData.biggestMargins} onC={onC} />
          </div>
        </div>
      )}

      {correctedData && view.type === "party" && (() => {
        const p = correctedData.partyStandings.find((ps) => ps.party === (view as { party: string }).party);
        return p ? <PartyDetail party={p} onBack={goBack} onConstituency={onC} /> : <p className="py-12 text-center text-slate-400">Party not found</p>;
      })()}

      {correctedData && view.type === "province" && (() => {
        const p = correctedData.provinceBreakdown.find((pb) => pb.provinceId === (view as { provinceId: number }).provinceId);
        return p ? <ProvinceDetail province={p} onBack={goBack} onConstituency={onC} onParty={onParty} selectedDistrictId={selectedProvinceDistrictId} /> : <p className="py-12 text-center text-slate-400">Province not found</p>;
      })()}

      {correctedData && view.type === "constituency" && (() => {
        const c = displayedConstituency;
        return c ? <ConstituencyPanel data={c} onBack={goBack} onDistrict={onDistrictFromConstituency} /> : <p className="py-12 text-center text-slate-400">Constituency not found</p>;
      })()}
    </PageTemplate>
  );
}
