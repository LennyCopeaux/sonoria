// Deterministic colourful gradient for items without a cover image,
// so the grid feels lively like the reference design.
const PALETTES: [string, string][] = [
  ["#ef4444", "#7c2d12"],
  ["#f97316", "#7c2d12"],
  ["#8b5cf6", "#312e81"],
  ["#06b6d4", "#155e75"],
  ["#ec4899", "#831843"],
  ["#22c55e", "#14532d"],
  ["#eab308", "#713f12"],
  ["#3b82f6", "#1e3a8a"],
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function coverGradient(seed: string): string {
  const palette = PALETTES[hash(seed) % PALETTES.length] ?? PALETTES[0]!;
  const [from, to] = palette;
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

// Solid accent colour (the palette's lead tone) — used for small markers
// like the coloured dots next to playlists in the sidebar.
export function coverColor(seed: string): string {
  const palette = PALETTES[hash(seed) % PALETTES.length] ?? PALETTES[0]!;
  return palette[0];
}
