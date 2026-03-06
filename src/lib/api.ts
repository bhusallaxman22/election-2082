const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchParties() {
  const res = await fetch(`${API_BASE}/api/parties`, { next: { revalidate: 60 } });
  const json = await res.json();
  return json.data;
}

export async function fetchCandidates(params?: {
  search?: string;
  province?: string;
  constituency?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.province) searchParams.set("province", params.province);
  if (params?.constituency) searchParams.set("constituency", params.constituency);

  const res = await fetch(
    `${API_BASE}/api/candidates?${searchParams.toString()}`,
    { next: { revalidate: 30 } }
  );
  const json = await res.json();
  return json.data;
}

export async function fetchProvinces(id?: number) {
  const url = id
    ? `${API_BASE}/api/provinces?id=${id}`
    : `${API_BASE}/api/provinces`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json();
  return json.data;
}

export async function fetchResults(type?: string, year?: string) {
  const searchParams = new URLSearchParams();
  if (type) searchParams.set("type", type);
  if (year) searchParams.set("year", year);

  const res = await fetch(
    `${API_BASE}/api/results?${searchParams.toString()}`,
    { next: { revalidate: 30 } }
  );
  const json = await res.json();
  return json.data;
}

export async function fetchConstituencyResults(districtId: number, constNum: number) {
  const res = await fetch(
    `${API_BASE}/api/constituency?district=${districtId}&const=${constNum}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function fetchDistricts(stateId?: number) {
  const url = stateId
    ? `${API_BASE}/api/districts?state=${stateId}`
    : `${API_BASE}/api/districts`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}
