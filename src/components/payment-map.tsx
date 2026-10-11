"use client";

import { geoCentroid, geoEqualEarth, geoInterpolate, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { CountryCount } from "@/lib/api/payment-flows";

const W = 960, H = 470;
// Hong Kong is too small for the 110m map, so it is plotted from its coordinates.
const HK: [number, number] = [114.17, 22.32];

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const COUNTRIES = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
const path = geoPath(projection);

// Sequential teal ramp (light → brand teal → deep).
const RAMP = ["#d6f5f2", "#9fe6df", "#5cd3c8", "#00bfb3", "#00968d", "#006b65"];

export function PaymentMap({ data }: { data: CountryCount[] }) {
  const [hover, setHover] = useState<{ name: string; count?: number; x: number; y: number } | null>(null);
  const byIso = useMemo(() => new Map(data.map((d) => [d.iso, d])), [data]);
  const max = Math.max(1, ...data.map((d) => d.count));
  const color = (n: number) => RAMP[Math.min(RAMP.length - 1, Math.floor((n / max) * (RAMP.length - 1) + 0.5))];

  const arcs = useMemo(() => data.slice(0, 8).flatMap((d) => {
    const f = COUNTRIES.find((c) => c.id === d.iso);
    if (!f) return [];
    const to = geoCentroid(f as Feature);
    const interp = geoInterpolate(HK, to);
    const pts = Array.from({ length: 33 }, (_, i) => projection(interp(i / 32))!);
    return [{ iso: d.iso, d: `M${pts.map((p) => p.join(",")).join("L")}`, w: 1 + (d.count / max) * 3 }];
  }), [data, max]);

  const [hx, hy] = projection(HK)!;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Payments from Hong Kong by destination country">
        <path d={path({ type: "Sphere" })!} fill="#f8fafc" />
        {COUNTRIES.map((f, i) => {
          const d = byIso.get(String(f.id));
          return (
            <path key={f.id ?? `x${i}`} d={path(f)!} fill={d ? color(d.count) : "#e2e8f0"} stroke="#fff" strokeWidth={0.5}
              className={d ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}
              onMouseMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ name: d?.country ?? f.properties.name, count: d?.count, x: e.clientX - r.left, y: e.clientY - r.top });
              }} />
          );
        })}
        {arcs.map((a) => (
          <path key={a.iso} d={a.d} fill="none" stroke="#023e63" strokeOpacity={0.55} strokeWidth={a.w} strokeLinecap="round" pointerEvents="none" />
        ))}
        <circle cx={hx} cy={hy} r={5} fill="#023e63" stroke="#fff" strokeWidth={1.5} />
        <text x={hx + 8} y={hy + 4} fontSize={12} fontWeight={600} fill="#023e63">Hong Kong</text>
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-10 rounded border border-slate/25 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <p className="font-semibold text-night">{hover.name}</p>
          <p className="text-slate">{hover.count === undefined ? "No payments" : `${hover.count.toLocaleString()} payments`}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate">
        <span className="flex items-center gap-2">
          Fewer
          <span className="flex">{RAMP.map((c) => <span key={c} className="h-2.5 w-6" style={{ background: c }} />)}</span>
          More payments
        </span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-navy/60" /> Top 8 flows from Hong Kong</span>
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#e2e8f0]" /> No payments</span>
      </div>
    </div>
  );
}
