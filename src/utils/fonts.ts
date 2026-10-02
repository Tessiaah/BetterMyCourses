// Both faces use identical weight descriptors so browsers treat their Unicode
// ranges as one composite face. Rubik clamps very light weights to its minimum.
// Composite font: no text-node changes, number wrapping, or DOM observation.
export function registerTypography(
  fonts: FontFaceSet,
  assetUrl: (
    path: '/fonts/lexend-variable.ttf' | '/fonts/rubik-variable.ttf',
  ) => string,
): () => void {
  const faces = [
    new FontFace('BMC UI', `url("${assetUrl('/fonts/lexend-variable.ttf')}")`, {
      weight: '100 900',
      display: 'swap',
      unicodeRange: 'U+0000-002F, U+003A-10FFFF',
    }),
    new FontFace('BMC UI', `url("${assetUrl('/fonts/rubik-variable.ttf')}")`, {
      weight: '100 900',
      display: 'swap',
      unicodeRange: 'U+0030-0039, U+0660-0669, U+06F0-06F9',
    }),
  ];
  for (const face of faces) fonts.add(face);
  return () => {
    for (const face of faces) fonts.delete(face);
  };
}
