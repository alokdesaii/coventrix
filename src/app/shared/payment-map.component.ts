import { Component, Input, OnChanges } from '@angular/core';
import { geoCentroid, geoEqualEarth, geoInterpolate, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import type { CountryCount } from '../api/payment-flows';

const W = 960, H = 470;
// Hong Kong is too small for the 110m map, so it is plotted from its coordinates.
const HK: [number, number] = [114.17, 22.32];

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const COUNTRIES = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
const path = geoPath(projection);
const SHAPES = COUNTRIES.map((f, i) => ({ f, id: String(f.id ?? `x${i}`), d: path(f)! }));

// Sequential teal ramp (light → brand teal → deep).
const RAMP = ['#d6f5f2', '#9fe6df', '#5cd3c8', '#00bfb3', '#00968d', '#006b65'];

@Component({
  selector: 'app-payment-map',
  standalone: true,
  template: `
    <div class="relative" (mouseleave)="hover = null">
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="h-auto w-full" role="img" aria-label="Payments from Hong Kong by destination country">
        <path [attr.d]="sphere" fill="#f8fafc" />
        @for (s of shapes; track s.id) {
          <path [attr.d]="s.d" [attr.fill]="fill(s.id)" stroke="#fff" stroke-width="0.5"
            [class]="byIso.has(s.id) ? 'cursor-pointer transition-opacity hover:opacity-80' : ''"
            (mousemove)="move($event, s)" />
        }
        @for (a of arcs; track a.iso) {
          <path [attr.d]="a.d" fill="none" stroke="#023e63" stroke-opacity="0.55" [attr.stroke-width]="a.w" stroke-linecap="round" pointer-events="none" />
        }
        <circle [attr.cx]="hk[0]" [attr.cy]="hk[1]" r="5" fill="#023e63" stroke="#fff" stroke-width="1.5" />
        <text [attr.x]="hk[0] + 8" [attr.y]="hk[1] + 4" font-size="12" font-weight="600" fill="#023e63">Hong Kong</text>
      </svg>

      @if (hover) {
        <div class="pointer-events-none absolute z-10 rounded border border-slate/25 bg-white px-3 py-2 text-xs shadow-md"
          [style.left.px]="hover.x + 12" [style.top.px]="hover.y + 12">
          <p class="font-semibold text-night">{{ hover.name }}</p>
          <p class="text-slate">{{ hover.count === undefined ? 'No payments' : hover.count.toLocaleString() + ' payments' }}</p>
        </div>
      }

      <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate">
        <span class="flex items-center gap-2">
          Fewer
          <span class="flex">@for (c of ramp; track c) { <span class="h-2.5 w-6" [style.background]="c"></span> }</span>
          More payments
        </span>
        <span class="flex items-center gap-2"><span class="h-0.5 w-6 rounded bg-navy/60"></span> Top 8 flows from Hong Kong</span>
        <span class="flex items-center gap-2"><span class="size-2.5 rounded-full bg-[#e2e8f0]"></span> No payments</span>
      </div>
    </div>
  `,
})
export class PaymentMapComponent implements OnChanges {
  @Input({ required: true }) data!: CountryCount[];

  readonly w = W;
  readonly h = H;
  readonly ramp = RAMP;
  readonly shapes = SHAPES;
  readonly sphere = path({ type: 'Sphere' })!;
  readonly hk = projection(HK)!;

  byIso = new Map<string, CountryCount>();
  arcs: { iso: string; d: string; w: number }[] = [];
  hover: { name: string; count?: number; x: number; y: number } | null = null;
  private max = 1;

  ngOnChanges() {
    this.byIso = new Map(this.data.map((d) => [d.iso, d]));
    this.max = Math.max(1, ...this.data.map((d) => d.count));
    this.arcs = this.data.slice(0, 8).flatMap((d) => {
      const f = COUNTRIES.find((c) => c.id === d.iso);
      if (!f) return [];
      const interp = geoInterpolate(HK, geoCentroid(f as Feature));
      const pts = Array.from({ length: 33 }, (_, i) => projection(interp(i / 32))!);
      return [{ iso: d.iso, d: `M${pts.map((p) => p.join(',')).join('L')}`, w: 1 + (d.count / this.max) * 3 }];
    });
  }

  fill(id: string) {
    const d = this.byIso.get(id);
    return d ? RAMP[Math.min(RAMP.length - 1, Math.floor((d.count / this.max) * (RAMP.length - 1) + 0.5))] : '#e2e8f0';
  }

  move(e: MouseEvent, s: (typeof SHAPES)[number]) {
    const r = ((e.target as SVGPathElement).ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const d = this.byIso.get(s.id);
    this.hover = { name: d?.country ?? s.f.properties.name, count: d?.count, x: e.clientX - r.left, y: e.clientY - r.top };
  }
}
