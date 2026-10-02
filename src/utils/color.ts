export const DEFAULT_LINK_COLOR = '#d8c3a0';

function channels(hex: string): number[] {
  return hex
    .slice(1)
    .match(/../g)!
    .map((part) => parseInt(part, 16));
}

function luminance(hex: string): number {
  const rgb = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function brighten(hex: string, fraction: number): string {
  return (
    '#' +
    channels(hex)
      .map((value) =>
        Math.round(value + (255 - value) * fraction)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

// Preserve the chosen hue while lifting dark colors enough for readable links.
export function normalizeLinkColor(value: unknown): string {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
    return DEFAULT_LINK_COLOR;
  const color = value.toLowerCase();
  for (let step = 0; step <= 100; step++) {
    const candidate = brighten(color, step / 100);
    if (contrastRatio(candidate, '#191a1c') >= 4.5) return candidate;
  }
  return DEFAULT_LINK_COLOR;
}

export function colorChannels(hex: string): string {
  return channels(hex).join(', ');
}
