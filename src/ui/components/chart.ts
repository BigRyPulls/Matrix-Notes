import { el } from '../../utils/dom';

export interface ChartPoint {
  xLabel: string;
  y: number;
  date?: string;
}

/** Lightweight SVG line chart — no chart library. */
export function renderLineChart(
  points: ChartPoint[],
  opts?: {
    height?: number;
    unit?: string;
    onPointClick?: (point: ChartPoint, index: number) => void;
  },
): HTMLElement {
  const wrap = el('div', { className: 'chart-wrap' });
  if (points.length === 0) {
    wrap.appendChild(el('div', { className: 'empty', textContent: 'Not enough data yet' }));
    return wrap;
  }

  const w = 320;
  const h = opts?.height ?? 160;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = maxY - minY || 1;

  const coords = points.map((p, i) => {
    const x = padL + (i / Math.max(1, points.length - 1)) * (w - padL - padR);
    const y = padT + (1 - (p.y - minY) / span) * (h - padT - padB);
    return { x, y, p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area =
    line +
    ` L${coords[coords.length - 1]!.x.toFixed(1)},${(h - padB).toFixed(1)}` +
    ` L${coords[0]!.x.toFixed(1)},${(h - padB).toFixed(1)} Z`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const mid = points[Math.floor(points.length / 2)]!;
  const gradId = 'cg-' + Math.random().toString(36).slice(2, 8);

  const svg = `
<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(57,255,136,0.28)"/>
      <stop offset="100%" stop-color="rgba(57,255,136,0)"/>
    </linearGradient>
  </defs>
  <path d="${area}" fill="url(#${gradId})"/>
  <path d="${line}" fill="none" stroke="#39ff88" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  ${coords
    .map(
      (c, i) =>
        `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#0a0a0a" stroke="#39ff88" stroke-width="1.5" tabindex="0" role="button" aria-label="Point ${i + 1}: ${c.p.y}${opts?.unit ? ' ' + opts.unit : ''}" style="cursor:pointer" data-point="${i}"/>`,
    )
    .join('')}
  <text x="${padL}" y="${h - 8}" fill="#6b746b" font-size="10">${escapeXml(first.xLabel)}</text>
  <text x="${w / 2}" y="${h - 8}" fill="#6b746b" font-size="10" text-anchor="middle">${escapeXml(mid.xLabel)}</text>
  <text x="${w - padR}" y="${h - 8}" fill="#6b746b" font-size="10" text-anchor="end">${escapeXml(last.xLabel)}</text>
  <text x="4" y="${padT + 4}" fill="#6b746b" font-size="10">${formatY(maxY)}${opts?.unit ? ' ' + opts.unit : ''}</text>
  <text x="4" y="${h - padB}" fill="#6b746b" font-size="10">${formatY(minY)}</text>
</svg>`;

  wrap.innerHTML = svg;

  if (opts?.onPointClick) {
    const cb = opts.onPointClick;
    const svgEl = wrap.querySelector('svg')!;
    const handlePoint = (target: SVGElement) => {
      if (target.tagName === 'circle') {
        const idx = parseInt(target.getAttribute('data-point') ?? '');
        if (!isNaN(idx) && points[idx]) {
          cb(points[idx]!, idx);
        }
      }
    };
    svgEl.addEventListener('click', (e) => handlePoint(e.target as SVGElement));
    svgEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePoint(e.target as SVGElement);
      }
    });
  }

  if (points.length > 0) {
    const caption = el('div', {
      style: 'display:flex;justify-content:space-between;padding:0.35rem 0.25rem 0;font-size:0.78rem;color:var(--text-3)',
    });
    caption.append(
      el('span', { textContent: `Min ${formatY(minY)}` }),
      el('span', { textContent: `Max ${formatY(maxY)}` }),
      el('span', { textContent: `Last ${formatY(last.y)}` }),
    );
    wrap.appendChild(caption);
  }
  return wrap;
}

function formatY(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
