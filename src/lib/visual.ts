import * as d3 from "d3";
import { move } from "@ariel-mutebi/circle-discovery";
import type { Circle, Place, LatLng } from "@ariel-mutebi/circle-discovery";

// ─── Projection ──────────────────────────────────────────────────────────────

export interface Projection {
  toXY: (ll: LatLng) => [number, number];
  toR: (centre: LatLng, metres: number) => number;
}

/**
 * Builds a projection for a given search area onto a canvas of W x H pixels.
 * Uses a simple equirectangular projection centred on the search circle —
 * accurate enough for the small areas we're dealing with (≤ ~20km radius).
 *
 * toXY  — converts a LatLng to [x, y] pixel coordinates.
 * toR   — converts a radius in metres to a pixel length, measured northward
 *         from a given centre. We measure northward because the distance between
 *         latitudes is constant, but the distance between longitudes depends on
 *         the latitude (further away from the equator, smaller distance).
 */
export function buildProjection(
  center: LatLng,
  radius: number,
  W: number,
  H: number,
): Projection {
  /** How many pixels represent the full search radius. */
  const scale = (Math.min(W, H) / 2) * 0.86;
  const cosLat = Math.cos(center.latitude * (Math.PI / 180));
  const mPerDeg = 111_000;

  const toXY = ({ latitude, longitude }: LatLng): [number, number] => [
    W / 2 + (longitude - center.longitude) * cosLat * mPerDeg * (scale / radius),
    H / 2 - (latitude - center.latitude) * mPerDeg * (scale / radius),
  ];

  const toR = (c: LatLng, r: number): number => {
    const edge = move(c, r, 0);
    const [x1, y1] = toXY(c);
    const [x2, y2] = toXY(edge);
    return Math.hypot(x2 - x1, y2 - y1);
  };

  return { toXY, toR };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

/**
 * Clears the SVG and lays down a background grid and three named layer groups.
 * Layers are ordered so circles draw behind barycenters, which draw behind
 * places — places should always be readable on top.
 */
export function initSvg(svgEl: SVGSVGElement, W: number, H: number) {
  const svg = d3.select(svgEl).attr("width", W).attr("height", H);
  svg.selectAll("*").remove();

  const step = Math.min(W, H) / 14;
  const grid = svg.append("g").attr("class", "grid");

  for (let x = 0; x < W; x += step)
    grid.append("line")
      .attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", H)
      .attr("stroke", "#1a2530").attr("stroke-width", "0.5");

  for (let y = 0; y < H; y += step)
    grid.append("line")
      .attr("x1", 0).attr("x2", W).attr("y1", y).attr("y2", y)
      .attr("stroke", "#1a2530").attr("stroke-width", "0.5");

  svg.append("g").attr("class", "circles");
  svg.append("g").attr("class", "barycenters");
  svg.append("g").attr("class", "places");
}

// ─── Initial search circle ────────────────────────────────────────────────────

/**
 * Draws the initial search boundary and a crosshair at its centre.
 * Drawn once at the start of a run and never updated.
 */
export function drawInitialCircle(
  svgEl: SVGSVGElement,
  center: LatLng,
  radius: number,
  proj: Projection,
) {
  const [cx, cy] = proj.toXY(center);
  const r = proj.toR(center, radius);
  const svg = d3.select(svgEl).select<SVGGElement>("g.circles");

  svg.append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", r)
    .attr("fill", "rgba(255,184,48,0.05)")
    .attr("stroke", "rgba(255,184,48,0.8)")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "6 3");

  const arm = 14;
  const cross = svg.append("g");
  [[-arm, 0, arm, 0], [0, -arm, 0, arm]].forEach(([x1, y1, x2, y2]) =>
    cross.append("line")
      .attr("x1", cx + x1).attr("y1", cy + y1)
      .attr("x2", cx + x2).attr("y2", cy + y2)
      .attr("stroke", "rgba(255,184,48,0.6)").attr("stroke-width", 1),
  );
}

// ─── Places ───────────────────────────────────────────────────────────────────

/**
 * Renders all world places as dots. Uses a D3 keyed join so that
 * updateDiscoveredPlaces can cheaply recolour individual dots by ID
 * without re-rendering the whole set.
 */
export function drawAllPlaces(
  svgEl: SVGSVGElement,
  places: Place[],
  proj: Projection,
) {
  d3.select(svgEl).select<SVGGElement>("g.places")
    .selectAll<SVGCircleElement, Place>("circle.place")
    .data(places, d => d.id)
    .join("circle")
    .attr("class", "place")
    .attr("cx", d => proj.toXY(d.location!)[0])
    .attr("cy", d => proj.toXY(d.location!)[1])
    .attr("r", 2.5)
    .attr("fill", "rgba(255,184,48,0.35)");
}

/**
 * Recolours places based on the current discovered set.
 * Called after every fetchPlaces call — the keyed join means D3 only
 * touches elements whose fill actually needs to change.
 */
export function updateDiscoveredPlaces(
  svgEl: SVGSVGElement,
  discoveredIds: Set<string>,
) {
  d3.select(svgEl).select("g.places")
    .selectAll<SVGCircleElement, Place>("circle.place")
    .attr("fill", d => discoveredIds.has(d.id)
      ? "rgba(48,208,240,0.85)"
      : "rgba(255,184,48,0.35)",
    )
    .attr("r", d => discoveredIds.has(d.id) ? 3.2 : 2.5);
}

// ─── Query circles ────────────────────────────────────────────────────────────

/**
 * Draws a probe circle and fades it to a ghost after 2 seconds.
 * Colour encodes yield: full returns (20) are bright cyan, partial
 * returns fade toward amber. This is grounded in real data — yield
 * count is the one thing we know for certain about each call.
 */
export function drawQueryCircle(
  svgEl: SVGSVGElement,
  circle: Circle,
  yielded: number,
  proj: Projection,
) {
  const [cx, cy] = proj.toXY(circle.center);
  const r = proj.toR(circle.center, circle.radius);

  /**
   * Interpolate stroke colour from amber (0 results) to cyan (20 results).
   * Opacity scales the same way so sparse probes are visually quieter.
   */
  const t = yielded / 20;
  const stroke = d3.interpolateRgb("rgba(255,184,48,1)", "rgba(48,208,240,1)")(t);
  const fill = d3.interpolateRgb("rgba(255,184,48,0.03)", "rgba(48,208,240,0.06)")(t);

  d3.select(svgEl).select<SVGGElement>("g.circles")
    .append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", r)
    .attr("fill", fill)
    .attr("stroke", stroke)
    .attr("stroke-width", 1.1)
    .attr("opacity", 0)
    .transition().duration(150).attr("opacity", 1)
    .transition().delay(2000).duration(2000).attr("opacity", 0.15);
}

// ─── Barycenter markers ───────────────────────────────────────────────────────

/**
 * Draws a crosshair-in-circle marker at a stabilised barycenter.
 * Fades to a ghost after 3 seconds so the canvas doesn't accumulate clutter.
 */
export function drawBarycenter(
  svgEl: SVGSVGElement,
  pt: LatLng,
  proj: Projection,
) {
  const [x, y] = proj.toXY(pt);
  const g = d3.select(svgEl).select<SVGGElement>("g.barycenters")
    .append("g").attr("transform", `translate(${x},${y})`).attr("opacity", 0);

  g.append("circle")
    .attr("r", 5).attr("fill", "none")
    .attr("stroke", "rgba(57,255,122,0.9)").attr("stroke-width", 1.5);

  [[-9, 0, 9, 0], [0, -9, 0, 9]].forEach(([x1, y1, x2, y2]) =>
    g.append("line")
      .attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
      .attr("stroke", "rgba(57,255,122,0.6)").attr("stroke-width", 1),
  );

  g.transition().duration(200).attr("opacity", 1)
    .transition().delay(3000).duration(1500).attr("opacity", 0.3);
}